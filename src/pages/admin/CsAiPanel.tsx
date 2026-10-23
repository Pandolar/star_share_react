import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, CardBody, Chip, Input, Select, SelectItem, Textarea } from '@heroui/react';
import { Bot, ChevronDown, RefreshCw, Send, X } from 'lucide-react';
import adminApiService from '../../services/adminApi';
import { showToast } from '../../components/Toast';
import type { AdminCsConversation } from '../../types/admin';
import { toLocalDateTimeInput } from '../../utils/localDateTime';
const REASON_TEXT: Record<string, string> = {
  provider_unavailable: '模型服务暂时不可用，已转人工',
  ai_queue_overloaded: '处理排队超时，已转人工',
  worker_timeout: '模型响应超时，已转人工',
  draft_timeout: '建议长时间未确认，已转人工',
  ai_disabled: '自动处理已关闭，转人工',
  human_takeover: '客服已接管',
  user_requested_human: '用户要求人工客服',
  sensitive_request: '涉及敏感话题，转人工处理',
  incident_followup: '事故话术后用户追问，转人工',
  draft_rejected: '建议被驳回，转人工',
  takeover_released: '接管已取消',
  takeover_expired: '接管闲置超时，已自动交还',
  new_episode: '新会话周期',
  new_user_message: '用户补充了新消息',
  incident_reply: '事故话术自动回复',
  review_required: '等待人工确认后发送',
};
const reasonText = (reason?: string) => (reason ? REASON_TEXT[reason] || reason : '');


type Draft = {
  id: number;
  content?: string;
  ai_meta?: { reason?: string; revision?: number; kb_hits?: Array<{ document_name?: string; content?: string }>; draft?: { status?: string; reason?: string } };
};

export const CsAiPanel: React.FC<{ conversation: AdminCsConversation; onConversation: (value: AdminCsConversation) => void; canManage: boolean; canSend: boolean }> = ({ conversation, onConversation, canManage, canSend }) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editor, setEditor] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const active = useRef(conversation.id);
  active.current = conversation.id;
  const [collapsed, setCollapsed] = useState(() => {
    try { return window.localStorage.getItem('cs-suggest-collapsed') === '1'; } catch { return false; }
  });
  const toggleCollapsed = () => setCollapsed((previous) => {
    const next = !previous;
    try { window.localStorage.setItem('cs-suggest-collapsed', next ? '1' : '0'); } catch { /* 忽略本地存储异常 */ }
    return next;
  });
  const requestVersion = useRef(0);
  const localEditors = useRef(editor);
  localEditors.current = editor;
  const load = useCallback(async () => {
    const id = conversation.id;
    const version = ++requestVersion.current;
    try {
      const result = await adminApiService.listCsDrafts({ conversation_id: id });
      if (active.current === id && version === requestVersion.current) {
        const next = result.data as Draft[];
        setDrafts((previous) => [...next, ...previous.filter((draft) =>
          !next.some((item) => item.id === draft.id) && localEditors.current[draft.id] !== undefined
        ).map((draft) => ({ ...draft, ai_meta: { ...draft.ai_meta, draft: { ...draft.ai_meta?.draft, status: 'stale' } } }))]);
      }
    } catch (error) {
      if (active.current === id) showToast(error instanceof Error ? error.message : '读取建议失败', 'error');
    }
  }, [conversation.id]);
  useEffect(() => {
    setDrafts([]);
    setEditor({});
    void load();
    const timer = window.setInterval(() => void load(), 6000);
    return () => { window.clearInterval(timer); requestVersion.current += 1; };
  }, [load]);
  const act = async (draft: Draft, action: 'send' | 'reject') => {
    if (busy !== null) return;
    setBusy(draft.id);
    requestVersion.current += 1;
    try {
      const expected_revision = draft.ai_meta?.revision ?? -1;
      const result = action === 'send'
        ? await adminApiService.sendCsDraft(draft.id, { expected_revision, content: editor[draft.id] ?? draft.content })
        : await adminApiService.rejectCsDraft(draft.id, { expected_revision });
      if (result.conversation.id === active.current) onConversation(result.conversation);
      setEditor((previous) => { const next = { ...previous }; delete next[draft.id]; localEditors.current = next; return next; });
      setDrafts((previous) => previous.filter((item) => item.id !== draft.id));
      showToast(action === 'send' ? '已发送确认后的回复' : '建议已驳回，转人工处理', 'success');
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '操作失败', 'error');
      await load();
    } finally { setBusy(null); }
  };
  return <div className="space-y-2">
    <div className="flex items-center justify-between gap-1">
      <Button size="sm" variant="light" className="min-w-0 px-1 text-sm font-semibold" aria-expanded={!collapsed} aria-label={collapsed ? '展开内部回复建议' : '收起内部回复建议'} onPress={toggleCollapsed} startContent={<Bot size={16} />} endContent={<ChevronDown size={14} className={`transition-transform ${collapsed ? '-rotate-90' : ''}`} />}>内部回复建议</Button>
      <Button size="sm" isIconOnly variant="light" aria-label="刷新建议" onPress={() => void load()}><RefreshCw size={14} /></Button>
    </div>
    {collapsed ? null : <>
    {!conversation.taken_over && conversation.handoff_reason && <p className="text-xs text-warning">交接原因：{reasonText(conversation.handoff_reason)}</p>}
    {drafts.map((draft) => {
      const stale = draft.ai_meta?.revision !== conversation.ai_revision || draft.ai_meta?.draft?.status === 'stale';
      return <Card key={draft.id} className="border border-secondary-200"><CardBody className="gap-2 p-3">
        <Chip size="sm" color={stale ? 'warning' : 'secondary'}>{stale ? '会话已变化，请核对最新内容' : '等待人工确认'}</Chip>
        <p className="text-xs text-default-500">{reasonText(draft.ai_meta?.draft?.reason || draft.ai_meta?.reason)}</p>
        {(draft.ai_meta?.kb_hits || []).map((hit, index) => <details key={index} className="text-xs text-default-500"><summary>{hit.document_name || '检索来源'}</summary><p className="whitespace-pre-wrap">{hit.content}</p></details>)}
        <Textarea label="回复建议（编辑后发送）" value={editor[draft.id] ?? draft.content ?? ''} onValueChange={(content) => setEditor((current) => ({ ...current, [draft.id]: content }))} minRows={3} isReadOnly={!canSend} />
        <div className="flex gap-2">
          <Button size="sm" color="primary" startContent={<Send size={14} />} isDisabled={!canSend || stale || busy !== null} onPress={() => void act(draft, 'send')}>确认发送</Button>
          <Button size="sm" color="danger" variant="flat" startContent={<X size={14} />} isDisabled={!canManage || stale || busy !== null} onPress={() => void act(draft, 'reject')}>驳回</Button>
          {stale && <Button size="sm" variant="light" onPress={() => { setEditor((current) => { const next = { ...current }; delete next[draft.id]; return next; }); setDrafts((current) => current.filter((item) => item.id !== draft.id)); }}>清除过期建议（先复制需要的内容）</Button>}
        </div>
      </CardBody></Card>;
    })}
    {!drafts.length && <p className="text-xs text-default-500">暂无待确认建议。建议不对用户显示。</p>}
    {conversation.sla_overdue && <Alert color="warning" title="跟进或回复已超时" />}
    </>}
  </div>;
};

export const CsHandlingControls: React.FC<{ conversation: AdminCsConversation; onConversation: (value: AdminCsConversation) => void; canManage: boolean }> = ({ conversation, onConversation, canManage }) => {
  const [busy, setBusy] = useState(false);
  const [due, setDue] = useState('');
  const [followup, setFollowup] = useState('waiting_internal');
  useEffect(() => { setDue(toLocalDateTimeInput(conversation.follow_up_at)); setFollowup(conversation.follow_up_state || 'waiting_internal'); }, [conversation.id, conversation.follow_up_at, conversation.follow_up_state]);
  const setTakenOver = async () => {
    if (busy || !canManage) return;
    setBusy(true);
    try {
      const value = await adminApiService.setCsConversationHandling(conversation.id, {
        taken_over: !conversation.taken_over,
        expected_revision: Number(conversation.ai_revision || 0),
      });
      onConversation(value);
    } catch (error) { showToast(error instanceof Error ? error.message : '更新失败', 'error'); }
    finally { setBusy(false); }
  };
  const saveFollowup = async () => {
    if (busy || !canManage) return;
    setBusy(true);
    try {
      const value = await adminApiService.updateCsConversation({
        id: conversation.id,
        follow_up_state: followup,
        follow_up_at: due ? new Date(due).toISOString() : null,
      });
      onConversation(value);
    } catch (error) { showToast(error instanceof Error ? error.message : '保存跟进失败', 'error'); }
    finally { setBusy(false); }
  };
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-2">
      <Chip size="sm" color={conversation.taken_over ? 'primary' : 'default'}>{conversation.taken_over ? `已接管（${conversation.assigned_admin || '客服'}）` : '未接管'}</Chip>
      <Button size="sm" color={conversation.taken_over ? 'default' : 'primary'} isDisabled={!canManage || busy} onPress={() => void setTakenOver()}>{conversation.taken_over ? '取消接管' : '接管'}</Button>
    </div>
    <details className="text-xs"><summary>定时跟进</summary><div className="grid gap-2 mt-2 md:grid-cols-2">
      <div className="space-y-1"><span className="block text-small text-foreground-500">跟进时间</span><Input size="sm" type="datetime-local" aria-label="跟进时间" value={due} onValueChange={setDue} /></div>
      <Select size="sm" label="跟进状态" selectedKeys={[followup]} onSelectionChange={(keys) => setFollowup(String(Array.from(keys)[0]))}>
        <SelectItem key="waiting_user">等待用户</SelectItem><SelectItem key="waiting_internal">内部处理</SelectItem><SelectItem key="escalated">升级主管</SelectItem>
      </Select>
      <Button size="sm" isDisabled={!canManage || busy} onPress={() => void saveFollowup()}>保存跟进</Button>
    </div></details>
  </div>;
};
