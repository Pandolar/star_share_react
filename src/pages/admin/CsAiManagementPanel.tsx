import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, CardBody, Chip, Input, NumberInput, Pagination, Select, SelectItem, Switch, Tab, Tabs, Textarea } from '@heroui/react';
import adminApiService from '../../services/adminApi';
import { showToast } from '../../components/Toast';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { toLocalDateTimeInput } from '../../utils/localDateTime';

type Data = Record<string, unknown>;
const object = (value: unknown): Data => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Data : {};
const text = (value: unknown) => typeof value === 'string' ? value : '';
const number = (value: unknown) => typeof value === 'number' ? value : 0;
const strings = (value: unknown) => Array.isArray(value) ? value.map(String) : [];
const records = (value: unknown) => Array.isArray(value) ? value.map(object) : [];
const csv = (value: string) => value.split(/[,，\n]/).map((part) => part.trim()).filter(Boolean);

const KeywordInput: React.FC<{ label: string; value: string[]; onChange: (next: string[]) => void; isDisabled?: boolean; description?: string }> = ({ label, value, onChange, isDisabled, description }) => {
  const joined = value.join(',');
  const emitted = useRef(joined);
  const [text, setText] = useState(joined);
  useEffect(() => {
    if (joined !== emitted.current) { setText(joined); emitted.current = joined; }
  }, [joined]);
  const handle = (next: string) => {
    setText(next);
    const parsed = csv(next);
    emitted.current = parsed.join(',');
    onChange(parsed);
  };
  return <div className="space-y-1"><Input label={label} value={text} onValueChange={handle} isDisabled={isDisabled} />{description && <p className="text-xs text-default-500">{description}</p>}</div>;
};

type Props = { selectedConversationIds: number[]; onClose?: () => void };
export const CsAiManagementPanel: React.FC<Props> = ({ selectedConversationIds, onClose }) => {
  const { can } = useAdminAuth();
  const [settings, setSettings] = useState<Data>({});
  const [ai, setAi] = useState<Data>({});
  const [learning, setLearning] = useState<Data>({});
  const [sla, setSla] = useState<Data>({});
  const [groups, setGroups] = useState<Data[]>([]);
  const [kb, setKb] = useState<Data[]>([]);
  const [kbTotal, setKbTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [mining, setMining] = useState<Data>({});
  const [incident, setIncident] = useState<Data | null>(null);
  const [incidentForm, setIncidentForm] = useState<Data>({ scope: 'matched', keywords: [], category_ids: [] });
  const [incidentRevision, setIncidentRevision] = useState(0);
  const [incidentHistory, setIncidentHistory] = useState<Data[]>([]);
  const [stats, setStats] = useState<Data>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Data | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');
  const [auditId, setAuditId] = useState('');
  const [auditComment, setAuditComment] = useState('');
  const kbRequestVersion = useRef(0);
  const loadKb = useCallback(async () => {
    const version = ++kbRequestVersion.current;
    const result = await adminApiService.listCsKbCandidates({ current_page: page, page_size: 20, status: status === 'all' ? undefined : status });
    if (version === kbRequestVersion.current) { setKb(result.data); setKbTotal(result.total); }
  }, [page, status]);
  const loadSettings = useCallback(async () => {
    const value = await adminApiService.getCsAiConfig();
    setSettings(value); setAi(object(value.ai)); setLearning(object(value.learning)); setSla(object(value.sla)); setGroups(records(value.groups));
  }, []);
  const loadIncident = useCallback(async () => {
    const value = await adminApiService.getCsIncident();
    setIncident(value.active); setIncidentRevision(value.revision); setIncidentHistory(value.history);
    if (value.active) setIncidentForm(value.active);
  }, []);
  const run = async (operation: () => Promise<void>, success = '操作成功') => {
    if (busy) return;
    setBusy(true); setError('');
    try { await operation(); if (success) showToast(success, 'success'); }
    catch (e) { setError(e instanceof Error ? e.message : '操作失败'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void run(async () => { await loadSettings(); await loadIncident(); setStats(await adminApiService.getCsAiStats()); }, ''); }, [loadSettings, loadIncident]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void loadKb().catch((e: Error) => setError(e.message)); }, [loadKb]);
  useEffect(() => {
    if (!can('customer_service.knowledge.manage')) return;
    let cancelled = false;
    const poll = () => adminApiService.getCsMineProgress().then((value) => { if (!cancelled) setMining(value); }).catch(() => undefined);
    void poll(); const timer = window.setInterval(() => void poll(), 10000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [can]);
  const kbAction = (row: Data, action: 'approve' | 'reject' | 'retry' | 'disable') => run(async () => {
    await adminApiService.updateCsKbCandidate({ id: number(row.id), revision: number(row.revision), action }); await loadKb();
  });
  const saveKnowledge = () => run(async () => {
    if (editing) await adminApiService.updateCsKbCandidate({ id: number(editing.id), revision: number(editing.revision), action: 'edit', question, answer });
    else await adminApiService.createCsKbCandidate({ question, answer });
    setEditing(null); setQuestion(''); setAnswer(''); await loadKb();
  });
  return <div className="space-y-4">
    <div className="flex justify-between items-center"><h2 className="font-semibold">客服自动化与知识管理</h2>{onClose && <Button size="sm" onPress={onClose}>关闭</Button>}</div>
    {error && <Alert color="danger" title={error} />}
    <Tabs aria-label="客服管理功能">
      <Tab key="config" title="处理策略"><div className="mt-3 space-y-3">
        <Alert color={ai.enabled ? 'success' : 'default'} title={ai.enabled ? `AI 代答已启用（${ai.mode === 'auto' ? '有证据自动发送' : '先生成建议，人工确认'}）` : '纯人工模式（默认，所有消息由客服处理）'} description={`外部依赖：${Object.entries(object(settings.integrations)).map(([key, value]) => `${({ chat: '代答', mining: '知识提炼', knowledge: '知识库', vision: '图片识别' } as Record<string, string>)[key] || key} ${value ? '已配置' : '未配置'}`).join(' · ')}。AI 只回复文本；用户发的图片/文件会先识别再交给模型，识别不了的直接转人工。`} />
        <Card><CardBody className="gap-3">
          <p className="text-sm font-semibold">第 1 步 · 打开需要的开关</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1"><Switch isSelected={ai.enabled === true} isDisabled={!can('customer_service.ai.manage')} onValueChange={(enabled) => setAi({ ...ai, enabled })}>启用 AI 代答</Switch><p className="text-xs text-default-500 pl-1">总开关。关闭时全部人工。建议知识库有一定数量且验收过再开。</p></div>
            <div className="space-y-1"><Switch isSelected={learning.enabled === true} isDisabled={!can('customer_service.ai.manage')} onValueChange={(enabled) => setLearning({ ...learning, enabled })}>自动学习已解决会话（只生成候选）</Switch><p className="text-xs text-default-500 pl-1">与代答独立，可先开：会话结束后自动提炼人工答复为待审知识，AI 不回复任何用户。</p></div>
            <div className="space-y-1 md:col-span-2"><Switch isSelected={sla.enabled === true} isDisabled={!can('customer_service.ai.manage')} onValueChange={(enabled) => setSla({ ...sla, enabled })}>开启 SLA 超时提醒（默认关闭）</Switch><p className="text-xs text-default-500 pl-1">开启后人工超时未回复的会话自动升级到「主管待处理」组；不会回溯标记历史会话。</p></div>
            {sla.enabled ? <NumberInput label="人工首次回复时限（秒）" value={number(sla.first_response_seconds)} step={30} onValueChange={(value) => setSla({ ...sla, first_response_seconds: value })} isDisabled={!can('customer_service.ai.manage')} /> : null}
            <div className="space-y-1 md:col-span-2"><NumberInput label="接管后多久没回复就交还 AI（分钟，0=不自动交还）" value={number(ai.takeover_expire_minutes)} step={5} onValueChange={(value) => setAi({ ...ai, takeover_expire_minutes: value })} isDisabled={!can('customer_service.ai.manage')} /><p className="text-xs text-default-500 pl-1">从客服最后一次回复开始计时：超过该时长没再回复，自动取消接管，未处理的用户消息交回 AI（若 AI 已开启）。敏感话题（退款、投诉等）的会话不会被自动交还。客服一回复就重新计时。</p></div>
          </div>
        </CardBody></Card>
        <Card><CardBody className="gap-3">
          <p className="text-sm font-semibold">第 2 步 · AI 怎么回复（先小范围试用）</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1"><Select label="回复策略" selectedKeys={[text(ai.mode) || 'draft']} onSelectionChange={(keys) => setAi({ ...ai, mode: String(Array.from(keys)[0]) })} isDisabled={!can('customer_service.ai.manage')}>
              <SelectItem key="draft">先生成建议，客服确认后发送（推荐起步）</SelectItem><SelectItem key="auto">评分和证据都达标才自动发送</SelectItem>
            </Select><p className="text-xs text-default-500">「建议」模式：AI 只给客服看草稿，点确认才发给用户；「自动」模式仍保留评分+真实知识库引用双门槛。</p></div>
            <KeywordInput label="试用分类（分类ID，逗号分隔，留空=全部）" value={strings(ai.only_categories)} onChange={(next) => setAi({ ...ai, only_categories: next })} isDisabled={!can('customer_service.ai.manage')} description="先填一个咨询量大的分类试运行，满意后清空放开全部。" />
            <div className="space-y-1"><NumberInput label="自动发送门槛（0-1）" value={number(ai.auto_threshold)} step={0.05} onValueChange={(value) => setAi({ ...ai, auto_threshold: value })} isDisabled={!can('customer_service.ai.manage')} /><p className="text-xs text-default-500">AI 自评把握达到该分数、且知识库确有命中，才允许自动发送。建议 0.85-0.95。</p></div>
            <div className="space-y-1"><NumberInput label="生成建议门槛（0-1）" value={number(ai.draft_threshold)} step={0.05} onValueChange={(value) => setAi({ ...ai, draft_threshold: value })} isDisabled={!can('customer_service.ai.manage')} /><p className="text-xs text-default-500">低于该分数连建议都不生成，直接转人工。</p></div>
          </div>
        </CardBody></Card>
        <Card><CardBody className="gap-3">
          <p className="text-sm font-semibold">第 3 步 · 哪些消息必须交给人工</p>
          <p className="text-xs text-default-500">命中任一词就整条转人工并推送通知；匹配不区分大小写，消息里包含该词即算命中。留空表示不启用该层。</p>
          <div className="grid gap-3 md:grid-cols-2">
            <KeywordInput label="用户要人工的词（如：转人工、找客服）" value={strings(ai.handoff_keywords)} onChange={(next) => setAi({ ...ai, handoff_keywords: next })} isDisabled={!can('customer_service.ai.manage')} description="用户明确想找人时立刻转人工，不再让 AI 接话。" />
            <KeywordInput label="敏感话题词（如：退款、投诉、发票）" value={strings(ai.forbidden_keywords)} onChange={(next) => setAi({ ...ai, forbidden_keywords: next })} isDisabled={!can('customer_service.ai.manage')} description="涉及资金、纠纷、账号处置的话题永远不由 AI 处理。" />
          </div>
          <p className="text-xs text-default-500">除关键词外，系统还会自动转人工：AI 没把握、知识库没有依据、图片识别不了、模型连续失败、超出每会话每日调用上限、建议长时间无人确认，以及模型自己判断用户情绪激动或反复未解决。</p>
        </CardBody></Card>
        <Card><CardBody className="gap-3">
          <p className="text-sm font-semibold">通知</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Switch isSelected={ai.notify_handoff === true} onValueChange={(value) => setAi({ ...ai, notify_handoff: value })}>有人工交接时通知我</Switch>
            <Switch isSelected={ai.notify_draft === true} onValueChange={(value) => setAi({ ...ai, notify_draft: value })}>有建议待确认时通知我</Switch>
          </div>
          <p className="text-xs text-default-500">Bark / 邮件 / Webhook 接收端在「系统配置 → 在线客服 → 管理员通知」设置；推送只带会话编号和原因，不含订单和聊天内容。</p>
        </CardBody></Card>
        <details><summary className="text-sm">高级参数（一般不用改）</summary><div className="grid gap-3 md:grid-cols-2 mt-2">
          <div className="space-y-1"><NumberInput label="静默等待（秒）" value={number(ai.debounce_seconds)} onValueChange={(value) => setAi({ ...ai, debounce_seconds: value })} isDisabled={!can('customer_service.ai.manage')} /><p className="text-xs text-default-500">用户连发多条时先等这几秒合并成一个问题再处理。</p></div>
          <div className="space-y-1"><NumberInput label="最长合并等待（秒）" value={number(ai.max_wait_seconds)} onValueChange={(value) => setAi({ ...ai, max_wait_seconds: value })} isDisabled={!can('customer_service.ai.manage')} /><p className="text-xs text-default-500">用户一直在发消息时，最多等这么久必须开始处理。</p></div>
          <div className="space-y-1"><NumberInput label="模型响应超时（秒）" value={number(ai.timeout_seconds)} onValueChange={(value) => setAi({ ...ai, timeout_seconds: value })} isDisabled={!can('customer_service.ai.manage')} /><p className="text-xs text-default-500">超过该时间未返回就放弃并转人工。</p></div>
          <div className="space-y-1"><NumberInput label="每会话每日 AI 调用上限" value={number(ai.max_daily_calls)} onValueChange={(value) => setAi({ ...ai, max_daily_calls: value })} isDisabled={!can('customer_service.ai.manage')} /><p className="text-xs text-default-500">防止异常会话无限消耗模型额度，超出后当天转人工。</p></div>
        </div></details>
        <details><summary className="text-sm">分组与分类路由</summary><div className="space-y-2 mt-2">{groups.map((group, index) => <div key={text(group.id)} className="grid grid-cols-3 gap-2"><Input label="分组ID" value={text(group.id)} isReadOnly /><Input label="名称" value={text(group.name)} onValueChange={(value) => setGroups(groups.map((g, i) => i === index ? { ...g, name: value } : g))} /><KeywordInput label="匹配分类ID" value={strings(group.category_ids)} onChange={(next) => setGroups(groups.map((g, i) => i === index ? { ...g, category_ids: next } : g))} /></div>)}<Button size="sm" onPress={() => setGroups([...groups, { id: `group_${Date.now()}`, name: '新分组', category_ids: [], enabled: true }])}>添加分组</Button></div></details>
        <div className="flex gap-2"><Button color="primary" isDisabled={busy || !can('customer_service.ai.manage')} onPress={() => void run(async () => { const value = await adminApiService.updateCsAiConfig({ revision: settings.revision, ai, learning, sla, groups }); setSettings(value); setAi(object(value.ai)); }, '策略已保存')}>保存策略</Button><Button color="danger" variant="flat" isDisabled={busy || !can('customer_service.ai.manage')} onPress={() => void run(async () => { await adminApiService.stopCsAi(); await loadSettings(); })}>立即停止全部 AI</Button></div>
      </div></Tab>
      <Tab key="knowledge" title="知识审核"><div className="space-y-3 mt-3">
        <Alert title="学习只生成候选，不自动批准" description="个人订单事实不能变成通用业务承诺；批准前核对来源与适用范围。" />
        <div className="flex gap-2"><Select label="状态" selectedKeys={[status]} onSelectionChange={(keys) => { setStatus(String(Array.from(keys)[0])); setPage(1); }}>{['all', 'pending', 'approved', 'indexing', 'synced', 'error', 'disabled', 'rejected'].map((key) => <SelectItem key={key}>{key}</SelectItem>)}</Select><Button isDisabled={busy || !can('customer_service.knowledge.manage')} onPress={() => void run(async () => { await adminApiService.mineCsKb({ conversation_ids: selectedConversationIds.length ? selectedConversationIds : undefined, limit: 100 }); setMining(await adminApiService.getCsMineProgress()); })}>{selectedConversationIds.length ? '学习已选已结束会话' : '学习历史（最多100个）'}</Button></div>
        <p className="text-xs text-default-500">历史会话挖掘会分批处理长记录并识别图片素材；图片内容可能不完整，所有候选必须人工核对来源后批准。</p>
        <details><summary className="text-sm">挖掘进度</summary>{records(mining.jobs).map((job) => <div key={text(job.id)} className="border-b py-2 text-xs">
          <p>{text(job.status)} · 已处理 {number(job.processed)}/{number(job.limit)} · 分块 {number(job.chunks)} · 候选 {number(job.candidates)}</p>
          {strings(job.warnings).length > 0 && <p className="text-warning">警告：{strings(job.warnings).join('；')}</p>}
          {!!job.error && <p className="text-danger">错误：{text(job.error)}</p>}
        </div>)}</details>
        <Card><CardBody className="gap-2"><p>{editing ? `编辑知识 #${editing.id}` : '人工新增知识'}</p><Input label="标准问题" value={question} onValueChange={setQuestion} /><Textarea label="可复用答案" value={answer} onValueChange={setAnswer} /><div className="flex gap-2"><Button size="sm" color="primary" isDisabled={busy || !can('customer_service.knowledge.manage')} onPress={() => void saveKnowledge()}>保存待审核</Button>{editing && <Button size="sm" onPress={() => { setEditing(null); setQuestion(''); setAnswer(''); }}>取消编辑</Button>}</div></CardBody></Card>
        {kb.map((row) => <Card key={number(row.id)}><CardBody className="gap-2"><p className="font-medium">#{number(row.id)} {text(row.question)}</p><p className="whitespace-pre-wrap text-sm">{text(row.answer)}</p><p className="text-xs text-default-500"><Chip size="sm" variant="flat" color={({ synced: 'success', pending: 'warning', error: 'danger', rejected: 'default', disabled: 'default', approved: 'secondary', indexing: 'secondary' } as Record<string, 'success' | 'warning' | 'danger' | 'default' | 'secondary'>)[text(row.status)] || 'default'}>{{ pending: '待审核', approved: '已批准，同步中', indexing: '同步中', synced: '已生效', error: '同步失败', disabled: '已停用', rejected: '已拒绝' }[text(row.status)] || text(row.status)}</Chip> · 来源 {({ history: '历史学习', miss: '未命中转人工', manual: '人工录入', draft_edited: '建议修改', incident: '事故话术' } as Record<string, string>)[text(row.source)] || text(row.source)} · 出现过 {number(row.frequency)} 次{number(row.conversation_id) ? ` · 来自会话 #${number(row.conversation_id)}` : ''}</p>{records(row.evidence).length > 0 && <details><summary className="text-xs">来源证据（点开发对）</summary>{records(row.evidence).map((evidence, index) => <div key={index} className="mt-1 text-xs"><p>会话 {number(evidence.conversation_id) || '未知'} · 消息ID {strings(evidence.message_ids || (evidence.message_id !== undefined ? [evidence.message_id] : [])).join(', ') || '未提供'}</p>{strings(evidence.quotes).map((quote, quoteIndex) => <blockquote key={quoteIndex} className="border-l-2 pl-2 text-default-500">{quote}</blockquote>)}</div>)}</details>}{!!row.last_error && <p className="text-danger text-xs">{text(row.last_error)}</p>}<div className="flex flex-wrap items-center gap-2"><Button size="sm" isDisabled={busy || !can('customer_service.knowledge.manage')} onPress={() => { setEditing(row); setQuestion(text(row.question)); setAnswer(text(row.answer)); }}>改内容</Button>{text(row.status) === 'pending' && <Button size="sm" color="primary" isDisabled={busy || !can('customer_service.knowledge.manage')} onPress={() => void kbAction(row, 'approve')}>批准，让 AI 用</Button>}{text(row.status) === 'pending' && <Button size="sm" variant="flat" isDisabled={busy || !can('customer_service.knowledge.manage')} onPress={() => void kbAction(row, 'reject')}>不要这条</Button>}{['approved', 'indexing', 'synced'].includes(text(row.status)) && <Button size="sm" variant="flat" isDisabled={busy || !can('customer_service.knowledge.manage')} onPress={() => void kbAction(row, 'disable')}>停用</Button>}<details className="text-xs"><summary className="cursor-pointer text-default-500">更多</summary><div className="mt-2 space-y-2">{text(row.status) === 'error' && <Button size="sm" variant="flat" isDisabled={busy || !can('customer_service.knowledge.manage')} onPress={() => void kbAction(row, 'retry')}>重试同步</Button>}<div className="flex gap-2"><Input size="sm" label="并入另一条（填它的ID）" value={mergeTarget} onValueChange={setMergeTarget} /><Button size="sm" variant="flat" isDisabled={busy || !can('customer_service.knowledge.manage') || !Number(mergeTarget)} onPress={() => void run(async () => { await adminApiService.updateCsKbCandidate({ id: number(row.id), revision: number(row.revision), action: 'merge', target_id: Number(mergeTarget) }); await loadKb(); })}>合并</Button></div></div></details></div></CardBody></Card>)}
        <Pagination page={page} total={Math.max(1, Math.ceil(kbTotal / 20))} onChange={setPage} />
      </div></Tab>
      <Tab key="incident" title="事故话术"><div className="space-y-3 mt-3">
        <Alert color="warning" title={incident ? `正在生效：${text(incident.title)}` : '无生效事故'} description="限时、限范围、每版本每会话一次。重复追问转人工，不自动关闭。" />
        <Input label="事故标题" value={text(incidentForm.title)} onValueChange={(value) => setIncidentForm({ ...incidentForm, title: value })} />
        <Textarea label="用户公告" value={text(incidentForm.announcement)} onValueChange={(value) => setIncidentForm({ ...incidentForm, announcement: value })} />
        <Textarea label="已核实回复话术" value={text(incidentForm.canned_reply)} onValueChange={(value) => setIncidentForm({ ...incidentForm, canned_reply: value })} />
        <Select label="范围" selectedKeys={[text(incidentForm.scope) || 'matched']} onSelectionChange={(keys) => setIncidentForm({ ...incidentForm, scope: String(Array.from(keys)[0]) })}><SelectItem key="matched">关键词 / 分类匹配</SelectItem><SelectItem key="all">全部新咨询（慎用）</SelectItem></Select>
        <KeywordInput label="关键词（逗号分隔）" value={strings(incidentForm.keywords)} onChange={(next) => setIncidentForm({ ...incidentForm, keywords: next })} />
        <KeywordInput label="分类ID（逗号分隔）" value={strings(incidentForm.category_ids)} onChange={(next) => setIncidentForm({ ...incidentForm, category_ids: next })} />
        <div className="space-y-1"><span className="block text-small text-foreground-500">到期时间（必填，最长7天）</span><Input type="datetime-local" aria-label="到期时间（必填，最长7天）" value={toLocalDateTimeInput(text(incidentForm.expires_at))} onValueChange={(value) => setIncidentForm({ ...incidentForm, expires_at: value })} /></div>
        <div className="flex flex-wrap gap-2"><Button color="warning" isDisabled={busy || !can('customer_service.incident.manage')} onPress={() => void run(async () => { const value = await adminApiService.saveCsIncident({ ...incidentForm, expected_revision: incidentRevision }); setIncident(value.active); setIncidentRevision(value.revision); })}>发布 / 更新话术</Button><Button isDisabled={busy || !can('customer_service.incident.manage')} onPress={() => void run(async () => { await adminApiService.clearCsIncident(); await loadIncident(); })}>结束事故</Button>{(['reply', 'resolve'] as const).map((action) => <Button key={action} isDisabled={busy || !incident || !selectedConversationIds.length || !can('customer_service.incident.manage')} onPress={() => void run(async () => { await adminApiService.batchCsIncident({ conversation_ids: selectedConversationIds, action, client_msg_id: `incident-${Date.now()}` }); })}>{action === 'reply' ? '向所选事故会话补发' : '人工确认所选事故会话已解决'}</Button>)}</div>
        <details><summary>事故历史</summary>{incidentHistory.map((item) => <p key={text(item.id)} className="text-sm">{text(item.title)} · {text(item.ended_at)}</p>)}</details>
      </div></Tab>
      <Tab key="audit" title="统计质检"><div className="space-y-3 mt-3">
        <Button size="sm" onPress={() => void run(async () => setStats(await adminApiService.getCsAiStats()), '')}>刷新统计</Button>
        <div className="grid gap-2 grid-cols-2 md:grid-cols-4">{Object.entries(stats).filter(([, value]) => typeof value === 'number').map(([key, value]) => <Card key={key}><CardBody><span className="text-xs">{key}</span><b>{String(value)}</b></CardBody></Card>)}</div>
        <p className="text-xs">队列：{JSON.stringify(stats.queue || {})} · 质检：{JSON.stringify(stats.audit || {})}</p>
        <Input label="质检消息ID" value={auditId} onValueChange={setAuditId} /><Textarea label="质检备注" value={auditComment} onValueChange={setAuditComment} />
        <div className="flex gap-2">{(['correct', 'incorrect', 'tone'] as const).map((score) => <Button key={score} isDisabled={busy || !Number(auditId) || !can('customer_service.ai.audit')} onPress={() => void run(async () => { await adminApiService.postCsAiAudit({ message_id: Number(auditId), score, comment: auditComment }); setStats(await adminApiService.getCsAiStats()); })}>{({ correct: '正确', incorrect: '错误', tone: '语气问题' })[score]}</Button>)}</div>
      </div></Tab>
    </Tabs>
  </div>;
};
