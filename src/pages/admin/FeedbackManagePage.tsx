import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, CardBody, CardHeader, Chip, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Spinner, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, Textarea } from '@heroui/react';
import { MessageSquare, RefreshCw, Search } from 'lucide-react';
import adminApiService from '../../services/adminApi';
import type { WorkOrder, WorkOrderMessage } from '../../types/admin';
import { showToast } from '../../components/Toast';

const STATUSES = [
  { key: 'open', label: '待处理' },
  { key: 'processing', label: '处理中' },
  { key: 'resolved', label: '已解决' },
  { key: 'closed', label: '已关闭' },
];
const statusColors: Record<string, 'warning' | 'primary' | 'success' | 'default'> = { open: 'warning', processing: 'primary', resolved: 'success', closed: 'default' };

const FeedbackManagePage: React.FC = () => {
  const [rows, setRows] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<WorkOrder | null>(null);
  const [reply, setReply] = useState('');
  const [internalRemark, setInternalRemark] = useState('');
  const [nextStatus, setNextStatus] = useState('open');
  const [saving, setSaving] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApiService.getFeedbackTickets({ querystring: query || undefined, status: status || undefined });
      if (response.code !== 20000) throw new Error(response.msg || '获取反馈工单失败');
      setRows(response.data || []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取反馈工单失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [query, status]);
  useEffect(() => { void load(); }, [load]);

  const messages = useMemo<WorkOrderMessage[]>(() => selected?.messages || [], [selected]);
  useEffect(() => {
    if (!selected) {
      setAttachmentUrls({});
      return;
    }
    let cancelled = false;
    const attachments = messages.flatMap((message) => message.attachments);
    Promise.all(attachments.map(async (attachment) => {
      const response = await adminApiService.getFeedbackAttachment(attachment.id);
      return response.code === 20000 ? [attachment.id, `data:${response.data.mime_type};base64,${response.data.data_base64}`] as const : null;
    })).then((entries) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      entries.forEach((entry) => { if (entry) next[entry[0]] = entry[1]; });
      setAttachmentUrls(next);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [selected, messages]);

  const open = (ticket: WorkOrder) => {
    setSelected(ticket);
    setReply('');
    setNextStatus(ticket.status || 'open');
    const rawRemark = ticket.extra_data?.internal_remark;
    setInternalRemark(typeof rawRemark === 'string' ? rawRemark : '');
  };
  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await adminApiService.updateFeedbackTicket({ id: selected.id, status: nextStatus, reply: reply.trim() || undefined, internal_remark: internalRemark });
      if (response.code !== 20000) throw new Error(response.msg || '保存失败');
      setSelected(null);
      showToast('工单已更新', 'success');
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-6">
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold"><MessageSquare className="h-5 w-5 text-primary" />用户反馈工单</div>
        <Button variant="flat" isLoading={loading} startContent={!loading && <RefreshCw className="h-4 w-4" />} onPress={() => void load()}>刷新</Button>
      </CardHeader>
      <CardBody className="gap-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input value={query} onValueChange={setQuery} placeholder="搜索用户、标题或描述" startContent={<Search className="h-4 w-4" />} />
          <Select selectedKeys={status ? [status] : ['all']} onSelectionChange={(keys) => { const next = String(Array.from(keys)[0] || 'all'); setStatus(next === 'all' ? '' : next); }} label="状态" className="sm:max-w-44">
            {[{ key: 'all', label: '全部' }, ...STATUSES].map((item) => <SelectItem key={item.key}>{item.label}</SelectItem>)}
          </Select>
        </div>
        <Table aria-label="用户反馈工单">
          <TableHeader><TableColumn>编号</TableColumn><TableColumn>状态</TableColumn><TableColumn>分类</TableColumn><TableColumn>标题</TableColumn><TableColumn>用户</TableColumn><TableColumn>更新时间</TableColumn><TableColumn>操作</TableColumn></TableHeader>
          <TableBody items={rows} isLoading={loading} loadingContent={<Spinner label="加载中" />} emptyContent="暂无反馈工单">
            {(ticket) => <TableRow key={ticket.id}>
              <TableCell>#{ticket.id}</TableCell>
              <TableCell><Chip size="sm" color={statusColors[ticket.status] || 'default'} variant="flat">{STATUSES.find((item) => item.key === ticket.status)?.label || ticket.status}</Chip></TableCell>
              <TableCell>{ticket.category_id || '-'}</TableCell><TableCell>{ticket.title}</TableCell><TableCell>{ticket.user_id}</TableCell><TableCell>{ticket.updated_at || '-'}</TableCell>
              <TableCell><Button size="sm" variant="flat" onPress={() => open(ticket)}>处理</Button></TableCell>
            </TableRow>}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
    <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} size="3xl" scrollBehavior="inside"><ModalContent>
      <ModalHeader>处理反馈工单 #{selected?.id}</ModalHeader>
      <ModalBody className="gap-4">{selected && <>
        <div className="rounded-lg bg-default-50 p-3"><div className="font-medium">{selected.title}</div><div className="mt-2 whitespace-pre-wrap text-sm">{selected.content}</div></div>
        <div className="space-y-2">{messages.map((message) => <div key={message.id} className={message.role === 'admin' ? 'rounded bg-primary/5 p-3 text-sm' : 'rounded bg-default-50 p-3 text-sm'}><span className="mr-2 text-xs text-default-500">{message.role === 'admin' ? '管理员' : '用户'}</span>{message.content}{message.attachments.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{message.attachments.map((attachment) => attachmentUrls[attachment.id] ? <img key={attachment.id} src={attachmentUrls[attachment.id]} alt="用户上传截图" className="max-h-40 rounded border border-default-200" /> : <Chip key={attachment.id} size="sm">截图加载中</Chip>)}</div>}</div>)}</div>
        <Select label="状态" selectedKeys={[nextStatus]} onSelectionChange={(keys) => setNextStatus(String(Array.from(keys)[0] || 'open'))}>{STATUSES.map((item) => <SelectItem key={item.key}>{item.label}</SelectItem>)}</Select>
        <Textarea label="公开回复（用户可见）" value={reply} onValueChange={setReply} minRows={4} />
        <Textarea label="内部备注（用户不可见）" value={internalRemark} onValueChange={setInternalRemark} minRows={3} />
      </>}</ModalBody>
      <ModalFooter><Button variant="light" onPress={() => setSelected(null)}>取消</Button><Button color="primary" isLoading={saving} onPress={() => void save()}>保存</Button></ModalFooter>
    </ModalContent></Modal>
  </div>;
};
export default FeedbackManagePage;
