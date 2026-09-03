import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardBody, Chip, Divider, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Textarea } from '@heroui/react';
import { MessageSquarePlus, Paperclip, Send } from 'lucide-react';
import { feedbackApi, type FeedbackAttachment, type FeedbackTicket, type UserBadgeData, type UserFeedbackConfig } from '../../../services/userApi';
import { toast } from '../../../utils/toast';

const statusLabel: Record<string, string> = { open: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭' };
const statusColor: Record<string, 'warning' | 'primary' | 'success' | 'default'> = { open: 'warning', processing: 'primary', resolved: 'success', closed: 'default' };

const TAB_OPTIONS = [
  { key: 'announcements', label: '公告通知' }, { key: 'profile', label: '个人主页' }, { key: 'subscription', label: '订阅套餐' },
  { key: 'team', label: '组织团队' }, { key: 'orders', label: '订单记录' }, { key: 'activity', label: '限时活动' },
  { key: 'invite', label: '邀请好友' }, { key: 'about', label: '关于我们' },
];
const EMOJI_OPTIONS = ['⭐', '✨', '🎉', '🔥', '💰', '📌', '🆕', '📢', '🌈', '👥'];

const dataUrlFor = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('读取图片失败'));
  reader.readAsDataURL(file);
});

const compressImage = async (file: File, maxBytes: number): Promise<{ dataUrl: string; mime: string }> => {
  const source = await dataUrlFor(file);
  const image = new Image();
  image.src = source;
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('图片无法解析')); });
  let width = image.width;
  let height = image.height;
  let quality = 0.9;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.drawImage(image, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/webp', quality);
    const bytes = Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
    if (bytes <= maxBytes) return { dataUrl, mime: 'image/webp' };
    if (quality > 0.55) quality -= 0.1;
    else { width = Math.floor(width * 0.8); height = Math.floor(height * 0.8); quality = 0.85; }
  }
  throw new Error('图片压缩后仍超过单张限制');
};

const FeedbackImage: React.FC<{ attachment: FeedbackAttachment }> = ({ attachment }) => {
  const [source, setSource] = useState('');
  useEffect(() => {
    let cancelled = false;
    feedbackApi.getAttachment(attachment.id).then((response) => {
      if (!cancelled && response.code === 20000) setSource(`data:${response.data.mime_type};base64,${response.data.data_base64}`);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [attachment.id]);
  return source ? <img src={source} alt="反馈截图" className="max-h-32 rounded border border-default-200" /> : <Chip size="sm">截图加载中</Chip>;
};

export const FeedbackPanel: React.FC = () => {
  const [config, setConfig] = useState<UserFeedbackConfig | null>(null);
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<FeedbackAttachment[]>([]);
  const [badgeData, setBadgeData] = useState<UserBadgeData | null>(null);
  const [badgeSaving, setBadgeSaving] = useState(false);

  const categories = useMemo(() => config?.categories.filter((item) => item.enabled) || [], [config]);
  const load = async () => {
    setLoading(true);
    try {
      const [configResponse, ticketResponse, badgeResponse] = await Promise.all([feedbackApi.getConfig(), feedbackApi.getTickets(), feedbackApi.getBadges()]);
      if (configResponse.code !== 20000) throw new Error(configResponse.msg || '获取反馈配置失败');
      setConfig(configResponse.data);
      if (ticketResponse.code === 20000) setTickets(ticketResponse.data || []);
      if (badgeResponse.code === 20000) setBadgeData(badgeResponse.data);
      await feedbackApi.markRead();
      window.dispatchEvent(new Event('feedbackRead'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载工单失败');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const uploadFiles = async (files: FileList | null) => {
    if (!files || !config) return;
    const available = config.attachments.max_count - attachments.length;
    if (files.length > available) { toast.warning(`最多上传 ${config.attachments.max_count} 张图片`); return; }
    try {
      const uploaded: FeedbackAttachment[] = [];
      for (const file of Array.from(files)) {
        if (!config.attachments.allowed_mime_types.includes(file.type)) throw new Error('仅支持 JPEG、PNG 或 WebP 图片');
        if (file.size > config.attachments.max_upload_mb * 1024 * 1024) throw new Error(`原图不能超过 ${config.attachments.max_upload_mb} MiB`);
        const compressed = await compressImage(file, config.attachments.max_compressed_mb * 1024 * 1024);
        const response = await feedbackApi.uploadAttachment(compressed.dataUrl, compressed.mime);
        if (response.code !== 20000) throw new Error(response.msg || '上传图片失败');
        uploaded.push(response.data);
      }
      setAttachments((current) => [...current, ...uploaded]);
    } catch (error) { toast.error(error instanceof Error ? error.message : '上传图片失败'); }
  };

  const submit = async () => {
    if (!categoryId || !title.trim() || !content.trim()) { toast.warning('请填写分类、标题和问题描述'); return; }
    setSubmitting(true);
    try {
      const response = await feedbackApi.createTicket({ category_id: categoryId, title: title.trim(), content: content.trim(), attachment_ids: attachments.map((item) => item.id), client_context: { path: window.location.pathname, user_agent: navigator.userAgent, source_domain: window.location.hostname } });
      if (response.code !== 20000) throw new Error(response.msg || '提交失败');
      setTickets((current) => [response.data, ...current]);
      setOpen(false); setCategoryId(''); setTitle(''); setContent(''); setAttachments([]);
      toast.success('工单已提交');
    } catch (error) { toast.error(error instanceof Error ? error.message : '提交失败'); }
    finally { setSubmitting(false); }
  };

  const closeTicket = async (ticket: FeedbackTicket) => {
    try {
      const response = await feedbackApi.updateTicket(ticket.id, 'close');
      if (response.code !== 20000) throw new Error(response.msg || '关闭工单失败');
      setTickets((current) => current.map((item) => item.id === ticket.id ? response.data : item));
      toast.success('工单已关闭');
    } catch (error) { toast.error(error instanceof Error ? error.message : '关闭工单失败'); }
  };

  const saveBadge = async (tabKey: string, emoji: string) => {
    if (!badgeData) return;
    const next = { ...badgeData.overrides };
    if (emoji === 'none') delete next[tabKey];
    else next[tabKey] = emoji;
    setBadgeSaving(true);
    try {
      const response = await feedbackApi.setTabBadges(next);
      if (response.code !== 20000) throw new Error(response.msg || '保存角标失败');
      setBadgeData((current) => current ? { ...current, overrides: response.data.tab_badges } : current);
      toast.success('Tab角标已保存');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存角标失败');
    } finally {
      setBadgeSaving(false);
    }
  };

  if (loading || !config?.enabled) return null;
  return <>
    <Card className="border border-primary/20">
      <CardBody className="gap-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 font-semibold"><MessageSquarePlus className="h-5 w-5 text-primary" />{config.entry_title}</div><p className="mt-1 text-sm text-default-500">{config.entry_description}</p></div><Button color="primary" onPress={() => setOpen(true)}>提交反馈</Button></div>
        <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-default-600">{config.notice}</p>
        <Divider />
        <div className="space-y-3"><div className="text-sm font-medium">我的工单</div>{tickets.length === 0 ? <p className="text-sm text-default-500">暂无反馈工单。</p> : tickets.map((ticket) => <div key={ticket.id} className="rounded-lg border border-default-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><span className="font-medium">{ticket.title}</span><span className="ml-2 text-xs text-default-400">#{ticket.id}</span></div><Chip size="sm" color={statusColor[ticket.status]} variant="flat">{statusLabel[ticket.status] || ticket.status}</Chip></div><div className="mt-2 space-y-2">{ticket.messages.map((message) => <div key={message.id} className={message.role === 'admin' ? 'rounded bg-primary/5 p-2 text-sm' : 'text-sm'}><span className="mr-2 text-xs text-default-500">{message.role === 'admin' ? '管理员' : '我'}</span>{message.content}{message.attachments.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{message.attachments.map((attachment) => <FeedbackImage key={attachment.id} attachment={attachment} />)}</div>}</div>)}</div>{['open', 'processing'].includes(ticket.status) && <Button size="sm" variant="light" color="danger" className="mt-2" onPress={() => void closeTicket(ticket)}>关闭工单</Button>}</div>)}</div>
        {badgeData && <><Divider /><div className="space-y-2"><div className="text-sm font-medium">导航角标</div><p className="text-xs text-default-500">默认不显示。设置后只修改 preferences.tab_badges，不影响账户的其他偏好；工单未读数字优先显示。</p><div className="grid gap-2 sm:grid-cols-2">{TAB_OPTIONS.map((tab) => <div key={tab.key} className="rounded-lg border border-default-200 p-2"><div className="mb-2 text-sm">{tab.label}</div><div className="flex flex-wrap gap-1"><Button size="sm" variant={badgeData.overrides[tab.key] ? 'light' : 'flat'} isDisabled={badgeSaving} onPress={() => void saveBadge(tab.key, 'none')}>无</Button>{EMOJI_OPTIONS.map((emoji) => <Button key={emoji} isIconOnly size="sm" variant={badgeData.overrides[tab.key] === emoji ? 'flat' : 'light'} isDisabled={badgeSaving} onPress={() => void saveBadge(tab.key, emoji)}>{emoji}</Button>)}</div></div>)}</div></div></>}
      </CardBody>
    </Card>
    <Modal isOpen={open} onClose={() => setOpen(false)} size="2xl" scrollBehavior="inside"><ModalContent><ModalHeader>提交工单反馈</ModalHeader><ModalBody className="gap-4"><Select label="问题分类" selectedKeys={categoryId ? [categoryId] : []} onSelectionChange={(keys) => setCategoryId(String(Array.from(keys)[0] || ''))}>{categories.map((item) => <SelectItem key={item.id} description={item.description}>{item.name}</SelectItem>)}</Select><Input label="标题" value={title} onValueChange={setTitle} maxLength={config.limits.max_title_length} /><Textarea label="问题描述" value={content} onValueChange={setContent} minRows={5} maxLength={config.limits.max_content_length} />{config.attachments.enabled && <div><input id="feedback-images" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => void uploadFiles(event.target.files)} /><Button as="label" htmlFor="feedback-images" variant="flat" startContent={<Paperclip className="h-4 w-4" />}>上传截图（最多 {config.attachments.max_count} 张，压缩后单张 {config.attachments.max_compressed_mb} MiB）</Button><div className="mt-2 flex flex-wrap gap-2">{attachments.map((item) => <Chip key={item.id} onClose={() => setAttachments((current) => current.filter((entry) => entry.id !== item.id))}>{Math.ceil(item.bytes / 1024)} KiB</Chip>)}</div></div>}</ModalBody><ModalFooter><Button variant="light" onPress={() => setOpen(false)}>取消</Button><Button color="primary" isLoading={submitting} startContent={!submitting && <Send className="h-4 w-4" />} onPress={() => void submit()}>提交工单</Button></ModalFooter></ModalContent></Modal>
  </>;
};
