import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, CardBody, Chip, Input, NumberInput, Select, SelectItem, Switch, Tab, Tabs, Textarea } from '@heroui/react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import csCommandApi from '../../services/csCommandApi';
import type { Batch, CommandSettings, Directive, DirectivePlan, ScopeKind, Task, TaskScope } from '../../types/csCommand';

interface ScopeOptions {
  sites?: Array<{ id: number; name: string; domains: string[] }>;
  distributors?: Array<{ id: number; username: string; status: number }>;
}
const statusLabels: Record<string, string> = {
  draft: '草稿', applied: '已应用', active: '生效中', needs_review: '待核实', paused: '已暂停',
  resolved: '已恢复 / 已结束', retired: '已归档', preview: '待确认预览', running: '处理中',
  completed: '本轮完成', cancelled: '已取消', failed: '失败', pending: '等待处理',
  sent: '已发送', skipped: '已跳过', indexing: '知识索引中', synced: '已可检索',
};
const actionLabels: Record<string, string> = {
  publish: '发布生效', pause: '暂停', resume: '重新启用', resolve: '确认恢复 / 结束', retire: '归档',
  confirm: '确认处理本轮', cancel: '取消剩余处理', retry_failed: '只重试失败项',
};
const actions = [
  { id: 'clarify', name: '补充信息，暂不执行' }, { id: 'create_incident', name: '新建临时故障' },
  { id: 'create_knowledge', name: '新增长期标准答复' }, { id: 'update_task', name: '更新已有任务' },
  { id: 'resolve_task', name: '确认已有故障恢复' }, { id: 'pause_task', name: '暂停已有任务' },
  { id: 'resume_task', name: '重新启用已有任务' }, { id: 'retire_task', name: '归档已有任务' },
  { id: 'prepare_batch', name: '预览积压咨询' }, { id: 'status', name: '查看任务进展' },
];
const scopeKinds: Array<{ id: ScopeKind; name: string }> = [
  { id: 'self', name: '只用于自营站点' }, { id: 'sites', name: '指定站点' },
  { id: 'distributors', name: '指定代理的站点' }, { id: 'domains', name: '指定访问域名' },
  { id: 'all', name: '全部已核实来源（明确选择）' },
];
const fields: Record<string, string> = {
  scope: '适用范围', title: '标题', feature_key: '功能名称', reply: '对外答复',
  expires_at: '话术到期时间', review_at: '进展核实时间', task_id: '对应任务', plan: '指令内容',
};
const reasonLabels: Record<string, string> = {
  commands_disabled: '自动任务已关闭', task_or_authorization_changed: '任务或操作权限已变化',
  stale_or_ineligible: '用户补充了消息，或客服已经接管', stale_before_publish: '发送前状态已变化',
  retry_limit: '重试次数已达上限', no_enabled_task_context: '没有匹配的生效任务',
  command_evidence_rejected: '任务已更新，需要重新判断', command_response_failed: '模型暂时不可用',
  task_reply_staged: '已生成待确认回复', not_currently_eligible: '当前不在处理范围',
};
const batchActions: Record<string, string[]> = {
  preview: ['confirm', 'cancel'], running: ['pause', 'cancel'], paused: ['resume', 'cancel', 'retry_failed'],
  completed: ['retry_failed'], cancelled: [],
};
const splitWords = (value: string) => value.split(/[,，\n]/).map((part) => part.trim()).filter(Boolean);
const keyForRequest = () => `cs-command-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`}`;
const displayTime = (value?: string | null) => value ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '未设置';
const inputTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value.includes('Z') || /[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}+08:00`);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date).replace(' ', 'T');
};
const transportTime = (value: string) => value ? `${value}:00+08:00` : null;
const tone = (status: string): 'default' | 'success' | 'warning' | 'danger' => {
  if (['active', 'sent', 'synced', 'completed'].includes(status)) return 'success';
  if (['needs_review', 'paused', 'pending', 'running'].includes(status)) return 'warning';
  return ['failed', 'cancelled'].includes(status) ? 'danger' : 'default';
};

export const CsCommandPanel: React.FC<{ selectedConversationIds: number[] }> = ({ selectedConversationIds }) => {
  const { can } = useAdminAuth();
  const [settings, setSettings] = useState<CommandSettings | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [directive, setDirective] = useState<Directive | null>(null);
  const [detail, setDetail] = useState<Task | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [command, setCommand] = useState('');
  const [contextId, setContextId] = useState<string>('none');
  const [tab, setTab] = useState('console');
  const [taskPage, setTaskPage] = useState(1);
  const [taskStatus, setTaskStatus] = useState('all');
  const [taskKind, setTaskKind] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const requestKey = useRef(keyForRequest());
  const busyRef = useRef(false);
  const loadSequence = useRef(0);
  const mounted = useRef(true);
  const canManage = can('customer_service.ai.manage');
  const canReadConfig = can('customer_service.runtime_config.read');
  const canReadConversation = can('customer_service.conversation.read');
  const installed = settings?.schema_ready !== false;
  const options = (settings?.scope_options || {}) as ScopeOptions;
  const plan = directive?.plan;
  const scope = plan?.scope;
  const hasTaskFields = ['create_incident', 'create_knowledge', 'update_task'].includes(plan?.action || '');
  const requiresTarget = ['update_task', 'resolve_task', 'pause_task', 'resume_task', 'retire_task', 'prepare_batch'].includes(plan?.action || '');
  const canTask = (task: Task) => canManage && can(task.kind === 'incident' ? 'customer_service.incident.manage' : 'customer_service.knowledge.manage');

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    const requests: Array<Promise<unknown>> = [];
    if (canReadConfig) requests.push(csCommandApi.getSettings());
    if (canReadConversation) {
      requests.push(csCommandApi.listTasks({ current_page: taskPage, page_size: 30,
        status: taskStatus === 'all' ? undefined : taskStatus, kind: taskKind === 'all' ? undefined : taskKind }));
      requests.push(csCommandApi.listDirectives({ status: 'draft', page_size: 50 }));
      requests.push(csCommandApi.listBatches({ page_size: 50 }));
    }
    const results = await Promise.allSettled(requests);
    if (!mounted.current || sequence !== loadSequence.current) return;
    let index = 0;
    const failures: string[] = [];
    if (canReadConfig) {
      const result = results[index++];
      if (result.status === 'fulfilled') setSettings(result.value as CommandSettings);
      else failures.push('运行设置暂不可读（需要“读取客服运行配置”权限）');
    }
    if (canReadConversation) {
      const tasksResult = results[index++];
      const directivesResult = results[index++];
      const batchesResult = results[index++];
      if (tasksResult.status === 'fulfilled') setTasks(tasksResult.value as Task[]); else failures.push('任务暂不可读（需要“查看客服会话”权限）');
      if (directivesResult.status === 'fulfilled') setDirectives(directivesResult.value as Directive[]); else failures.push('草稿暂不可读（需要“查看客服会话”权限）');
      if (batchesResult.status === 'fulfilled') setBatches(batchesResult.value as Batch[]); else failures.push('批次暂不可读（需要“查看客服会话”权限）');
    }
    setError(failures.join('；'));
    if (mounted.current && sequence === loadSequence.current) setLoading(false);
  }, [canReadConfig, canReadConversation, taskPage, taskStatus, taskKind]);

  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; loadSequence.current += 1; }; }, [load]);
  const batchId = batch?.id;
  const batchStatus = batch?.status;
  useEffect(() => {
    if (!batchId || !batchStatus || !['preview', 'running', 'paused'].includes(batchStatus)) return;
    let active = true;
    let requesting = false;
    const ident = batchId;
    const timer = window.setInterval(() => {
      if (requesting || busyRef.current) return;
      requesting = true;
      void csCommandApi.getBatch(ident).then((next) => {
        if (active) setBatch((current) => current?.id === next.id && next.revision >= current.revision ? next : current);
      }).catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : '处理进度暂时不可用，稍后重试');
      }).finally(() => { requesting = false; });
    }, 4000);
    return () => { active = false; window.clearInterval(timer); };
  }, [batchId, batchStatus]);

  const run = async (operation: () => Promise<unknown>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setNotice('');
    try { await operation(); }
    catch (caught) { if (mounted.current) setError(caught instanceof Error ? caught.message : '操作失败，请核对当前状态后重试'); }
    finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  };
  const changePlan = (patch: Partial<DirectivePlan>) => setDirective((current) => current ? { ...current, plan: { ...current.plan, ...patch } } : null);
  const changeScope = (patch: Partial<TaskScope>) => changePlan({ scope: { kind: 'self', site_ids: [], distributor_ids: [], domains: [], ...scope, ...patch } });
  const createDraft = async () => {
    if (!command.trim()) throw new Error('请先输入要交代客服的事情');
    const next = await csCommandApi.createDirective({ text: command.trim(), request_key: requestKey.current,
      selected_task_id: contextId === 'none' ? undefined : Number(contextId),
      conversation_ids: selectedConversationIds.length ? selectedConversationIds : undefined });
    setDirective(next); requestKey.current = keyForRequest();
    await load();
  };
  const manualDraft = async (kind: 'incident' | 'knowledge', target?: Task) => {
    const value: DirectivePlan = target ? { ...target, action: 'update_task', task_id: target.id, expected_task_revision: target.revision } : {
      action: kind === 'incident' ? 'create_incident' : 'create_knowledge', title: '', feature_key: '', scope: null,
      keywords: [], excluded_keywords: [], reply: '', fallback_reply: '', internal_note: '',
      estimated_recovery_at: null, review_at: null, expires_at: null, missing_fields: [],
      explanation: '手工完善草稿，不调用模型，也不会自动生效。',
    };
    const next = await csCommandApi.createDirective({ text: target ? `手工修改任务 #${target.id}` : `手工创建${kind === 'incident' ? '故障' : '知识'}草稿`,
      request_key: keyForRequest(), manual: true, plan: value });
    setDirective(next); setTab('console'); await load();
  };
  const saveDraft = async () => {
    if (!directive) throw new Error('没有待保存的草稿');
    const saved = await csCommandApi.updateDirective(directive.id, directive.revision, directive.plan);
    setDirective(saved); return saved;
  };
  const applyDraft = async () => {
    const saved = await saveDraft();
    const result = await csCommandApi.applyDirective(saved.id, saved.revision);
    setDirective(result.directive);
    if (result.task) {
      if (canReadConversation) setDetail(await csCommandApi.getTask(result.task.id));
      setTab(canReadConversation ? 'tasks' : 'console');
      setNotice(result.task.status === 'draft' ? '任务草稿已保存。核对后点击“发布生效”，才会用于接待。' : '任务已按预览更新。');
    } else if (result.batch) {
      if (canReadConversation) { setBatch(await csCommandApi.getBatch(result.batch.id)); setTab('batches'); }
      else setNotice('批次已创建；需要“查看客服会话”权限才能查看处理进度。');
    }
    else setNotice('状态查询完成，没有修改任务或发送消息。');
    await load();
  };
  const previewBatch = async (task: Task, afterId?: number) => {
    const created = await csCommandApi.createBatch({ task_id: task.id, task_revision: task.revision,
      conversation_ids: !afterId && selectedConversationIds.length ? selectedConversationIds : undefined, after_id: afterId });
    setBatch(await csCommandApi.getBatch(created.id)); setTab('batches'); await load();
  };
  const taskItems = [{ id: 'none', name: '不关联已有任务' }, ...tasks.map((task) => ({ id: String(task.id), name: `#${task.id} ${task.title} · ${statusLabels[task.status] || task.status}` }))];

  if (loading && !settings && (canReadConfig || canReadConversation)) return <div className="mt-3 space-y-3"><p>正在加载客服指令台…</p>{error && <Alert color="danger" title={error} endContent={<Button onPress={() => void load()}>重新加载</Button>} />}</div>;

  return <div className="mt-3 min-w-0 space-y-4">
    {!canReadConfig && <Alert color="warning" title="运行设置不可读" description="当前账号缺少“读取客服运行配置”权限；仍可使用已获授权的指令草稿操作。" />}
    {!canReadConversation && <Alert color="warning" title="任务和会话记录不可读" description="当前账号缺少“查看客服会话”权限；不能选择、查看或处理现有任务和批次。" />}
    {error && <Alert color="danger" title="操作未完成" description={error} endContent={<Button size="sm" onPress={() => void load()}>刷新状态</Button>} />}
    {notice && <Alert color="success" title={notice} />}
    {!installed && <Alert color="warning" title="请先安装指令台数据库迁移" description="现有人工客服继续可用。执行配套增量迁移并重启新版后端后，再配置此功能；不会自动修改数据库。" />}
    <Tabs aria-label="客服指令台功能" selectedKey={tab} onSelectionChange={(key) => setTab(String(key))} classNames={{ tabList: 'max-w-full overflow-x-auto' }}>
      <Tab key="console" title="交代客服">
        <section className="mt-3 space-y-4">
          <Alert color="default" title="像交代真人客服一样说清楚事情" description="先生成草稿，核对范围、话术和时间；明确应用后才更新任务。生成草稿不会向客户发送消息。请勿在指令中填写密钥或密码。" />
          <Textarea label="想让客服做什么" minRows={3} value={command} isDisabled={busy || !canManage || !installed}
            placeholder="例如：自营站的文件导出有故障，预计半天修复，期间只给问导出的用户解释正在处理，其他问题正常回答。"
            onValueChange={(value) => { if (value !== command) requestKey.current = keyForRequest(); setCommand(value); }} />
          <Select label="这句话对应哪件事" items={taskItems} selectedKeys={[contextId]} isDisabled={busy || !canReadConversation}
            onSelectionChange={(keys) => { const value = Array.from(keys)[0]; if (value !== undefined) { setContextId(String(value)); requestKey.current = keyForRequest(); } }}
            description="说“恢复了”“再延迟两小时”前先选任务；未选择且有多个可能对象时，系统会要求澄清。">
            {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
          </Select>
          <div className="flex flex-wrap gap-2">
            <Button color="primary" isLoading={busy} isDisabled={!canManage || !installed || !command.trim()} onPress={() => void run(createDraft)}>理解并生成草稿</Button>
            <Button variant="flat" isDisabled={busy || !canManage || !installed} onPress={() => void run(() => manualDraft('incident'))}>手工填写故障</Button>
            <Button variant="flat" isDisabled={busy || !canManage || !installed} onPress={() => void run(() => manualDraft('knowledge'))}>手工填写长期答复</Button>
          </div>
          {directive && <Card><CardBody className="gap-4 p-4">
            <div className="flex flex-wrap items-center gap-2"><b>指令 #{directive.id}</b><Chip size="sm" color={tone(directive.status)}>{statusLabels[directive.status] || directive.status}</Chip><span className="text-xs text-default-500">版本 {directive.revision}</span></div>
            <p className="whitespace-pre-wrap text-sm text-default-600">{directive.input_text}</p>
            {directive.last_error && <Alert color="warning" title="尚未解析完成，生效任务没有改变" description={directive.last_error} />}
            {plan?.explanation && <p className="text-sm">{plan.explanation}</p>}
            {plan?.question && <Alert color="warning" title="还需要确认" description={plan.question} />}
            {(plan?.missing_fields || []).length > 0 && <p className="text-sm text-warning-700">解析时待补充：{plan?.missing_fields?.map((field) => fields[field] || field).join('、')}。填写后以服务端核对结果为准。</p>}
            <Select label="准备执行什么" items={actions} selectedKeys={[plan?.action || 'clarify']} isDisabled={busy || directive.status !== 'draft' || !canManage}
              onSelectionChange={(keys) => { const action = Array.from(keys)[0]; if (action) changePlan({ action: String(action) }); }}>
              {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
            </Select>
            {requiresTarget && <Select label="对应任务" items={tasks} selectedKeys={plan?.task_id ? [String(plan.task_id)] : []}
              isDisabled={busy || directive.status !== 'draft'} placeholder="请选择要修改或结束的任务"
              onSelectionChange={(keys) => { const task = tasks.find((item) => String(item.id) === String(Array.from(keys)[0])); if (task) changePlan({ task_id: task.id, expected_task_revision: task.revision }); }}>
              {(item) => <SelectItem key={String(item.id)}>#{item.id} {item.title} · 版本 {item.revision}</SelectItem>}
            </Select>}
            {hasTaskFields && <>
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="内部任务名称" value={plan?.title || ''} maxLength={255} isDisabled={busy || directive.status !== 'draft'} onValueChange={(title) => changePlan({ title })} />
                <Input label="对应功能" value={plan?.feature_key || ''} maxLength={128} isDisabled={busy || directive.status !== 'draft'} onValueChange={(feature_key) => changePlan({ feature_key })} description="同一功能保持同一个名称，用于发现重复或矛盾话术。" />
              </div>
              <Select label="适用范围" items={scopeKinds} selectedKeys={scope ? [scope.kind] : []} placeholder="必须明确选择，不会默认为全站"
                isDisabled={busy || directive.status !== 'draft'} onSelectionChange={(keys) => { const kind = Array.from(keys)[0]; if (kind) changeScope({ kind: String(kind) as ScopeKind }); }}>
                {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
              </Select>
              {scope?.kind === 'sites' && <Select label="选择站点" selectionMode="multiple" items={options.sites || []} selectedKeys={scope.site_ids.map(String)} isDisabled={busy || directive.status !== 'draft'}
                onSelectionChange={(keys) => changeScope({ site_ids: Array.from(keys).map(Number) })}>
                {(item) => <SelectItem key={String(item.id)}>{item.name} · {item.domains.join('、')}</SelectItem>}
              </Select>}
              {scope?.kind === 'distributors' && <Select label="选择代理" selectionMode="multiple" items={options.distributors || []} selectedKeys={scope.distributor_ids.map(String)} isDisabled={busy || directive.status !== 'draft'}
                onSelectionChange={(keys) => changeScope({ distributor_ids: Array.from(keys).map(Number) })}>
                {(item) => <SelectItem key={String(item.id)}>{item.username} · #{item.id}</SelectItem>}
              </Select>}
              {scope?.kind === 'domains' && <Textarea label="指定域名" value={scope.domains.join('\n')} isDisabled={busy || directive.status !== 'draft'} description="每行一个域名。按实际消息来源核对，不接受用户自报站点。" onValueChange={(value) => changeScope({ domains: splitWords(value) })} />}
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="相关功能关键词" value={(plan?.keywords || []).join('，')} isDisabled={busy || directive.status !== 'draft'} onValueChange={(value) => changePlan({ keywords: splitWords(value) })} description="帮助识别话题，命中关键词不代表整段问题都属于故障。" />
                <Input label="排除词" value={(plan?.excluded_keywords || []).join('，')} isDisabled={busy || directive.status !== 'draft'} onValueChange={(value) => changePlan({ excluded_keywords: splitWords(value) })} description="明确不应使用这份话术的问题。" />
              </div>
              <Textarea label="用户可以看到的标准答复" minRows={3} value={plan?.reply || ''} maxLength={8000} isDisabled={busy || directive.status !== 'draft'} onValueChange={(reply) => changePlan({ reply })} description="只填写已经核实的事实。预计时间不能写成保证。" />
              {(plan?.action === 'create_incident' || (plan?.action === 'update_task' && tasks.find((task) => task.id === plan.task_id)?.kind === 'incident')) && <>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input type="datetime-local" label="预计恢复（北京时间）" value={inputTime(plan?.estimated_recovery_at)} isDisabled={busy || directive.status !== 'draft'} onValueChange={(value) => changePlan({ estimated_recovery_at: transportTime(value) })} />
                  <Input type="datetime-local" label="下次核实（北京时间）" value={inputTime(plan?.review_at)} isDisabled={busy || directive.status !== 'draft'} onValueChange={(value) => changePlan({ review_at: transportTime(value) })} isRequired />
                  <Input type="datetime-local" label="旧话术到期（北京时间）" value={inputTime(plan?.expires_at)} isDisabled={busy || directive.status !== 'draft'} onValueChange={(value) => changePlan({ expires_at: transportTime(value) })} isRequired />
                </div>
                <Textarea label="到点仍未确认恢复时怎么说" value={plan?.fallback_reply || ''} maxLength={2000} isDisabled={busy || directive.status !== 'draft'} onValueChange={(fallback_reply) => changePlan({ fallback_reply })} description="留空则转人工。到期不会自动宣称恢复，也不会继续引用过时的预计时间。" />
              </>}
              <Textarea label="内部备注（客户看不到）" value={plan?.internal_note || ''} maxLength={4000} isDisabled={busy || directive.status !== 'draft'} onValueChange={(internal_note) => changePlan({ internal_note })} />
            </>}
            <div className="flex flex-wrap gap-2">
              <Button variant="flat" isDisabled={busy || !canManage || directive.status !== 'draft'} onPress={() => void run(async () => { await saveDraft(); setNotice('仅保存了草稿，任务尚未生效。'); })}>仅保存草稿</Button>
              <Button color="primary" isDisabled={busy || !canManage || directive.status !== 'draft' || plan?.action === 'clarify'} onPress={() => void run(applyDraft)}>
                {plan?.action?.startsWith('create_') ? '确认保存为任务草稿' : '确认执行已预览操作'}
              </Button>
            </div>
            {directive.status === 'applied' && <p className="text-sm text-default-500">这条指令已处理，不会重复执行。后续修改请生成新的草稿。</p>}
          </CardBody></Card>}
          <details className="rounded-xl border border-divider p-3"><summary>找回未应用的指令草稿</summary><div className="mt-2 flex flex-wrap gap-2">{directives.map((item) => <Button key={item.id} size="sm" variant="flat" isDisabled={busy} onPress={() => setDirective(item)}>#{item.id} {item.input_text.slice(0, 35)}</Button>)}{!directives.length && <p className="text-sm text-default-500">没有待确认草稿</p>}</div></details>
        </section>
      </Tab>
      <Tab key="tasks" title="任务与进展">
        <section className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Select label="状态" className="min-w-40 flex-1" items={[{ id: 'all', name: '全部状态' }, ...['draft', 'active', 'needs_review', 'paused', 'resolved', 'retired'].map((id) => ({ id, name: statusLabels[id] }))]} selectedKeys={[taskStatus]} onSelectionChange={(keys) => { setTaskStatus(String(Array.from(keys)[0] || 'all')); setTaskPage(1); }}>{(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}</Select>
            <Select label="任务类型" className="min-w-40 flex-1" items={[{ id: 'all', name: '全部任务' }, { id: 'incident', name: '临时故障' }, { id: 'knowledge', name: '长期标准答复' }]} selectedKeys={[taskKind]} onSelectionChange={(keys) => { setTaskKind(String(Array.from(keys)[0] || 'all')); setTaskPage(1); }}>{(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}</Select>
            <Button variant="flat" isLoading={loading} isDisabled={!canReadConversation} onPress={() => void load()}>刷新任务</Button>
          </div>
          <p className="text-xs text-default-500">结束故障只停止旧话术，不会自动关闭客户会话，也不会自动群发“已恢复”。</p>
          {tasks.map((task) => <Card key={task.id}><CardBody className="gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><b>#{task.id} {task.title}</b><Chip size="sm" color={tone(task.status)}>{statusLabels[task.status] || task.status}</Chip></div>
            <p className="text-xs text-default-500">{task.kind === 'incident' ? '临时故障' : '长期标准答复'} · 版本 {task.revision} · {task.scope_label}</p>
            <p className="whitespace-pre-wrap text-sm">{task.reply}</p>
            {task.kind === 'incident' && <p className="text-xs text-default-500">预计：{displayTime(task.estimated_recovery_at)} · 下次核实：{displayTime(task.review_at)} · 话术到期：{displayTime(task.expires_at)}</p>}
            {task.kind === 'knowledge' && <p className="text-xs text-default-500">{task.status === 'draft' ? '草稿尚未发布' : task.knowledge_delivery === 'local' ? '限定范围的本地标准答复，不上传共享知识库' : '全站知识同步情况可在“知识审核”或版本详情中查看'}</p>}
            <div className="flex flex-wrap gap-2">
              {(task.available_actions || []).map((action) => <Button key={action} size="sm" color={action === 'publish' ? 'primary' : 'default'} variant={action === 'publish' ? 'solid' : 'flat'} isDisabled={busy || !canTask(task)} onPress={() => void run(async () => { const next = await csCommandApi.transitionTask(task.id, task.revision, action); setDetail(await csCommandApi.getTask(next.id)); await load(); setNotice(action === 'publish' ? '任务已发布，自动发送仍受全局开关和人工接管限制。' : '任务状态已更新。'); })}>{actionLabels[action] || action}</Button>)}
              <Button size="sm" variant="light" isDisabled={busy || !canTask(task) || ['resolved', 'retired'].includes(task.status)} onPress={() => void run(() => manualDraft(task.kind, task))}>修改内容</Button>
              <Button size="sm" variant="light" isDisabled={busy} onPress={() => void run(async () => { setDetail(await csCommandApi.getTask(task.id)); })}>查看版本与来源</Button>
              <Button size="sm" variant="flat" isDisabled={busy || !can('customer_service.message.batch_send') || !canTask(task) || !['active', 'needs_review'].includes(task.status)} onPress={() => void run(() => previewBatch(task))}>预览积压咨询</Button>
            </div>
          </CardBody></Card>)}
          {!tasks.length && !loading && <p className="p-4 text-default-500">当前筛选没有任务。可以先在“交代客服”里生成草稿。</p>}
          <div className="flex items-center justify-between gap-2"><Button size="sm" isDisabled={taskPage === 1 || loading} onPress={() => setTaskPage(taskPage - 1)}>上一页</Button><span className="text-sm">第 {taskPage} 页</span><Button size="sm" isDisabled={tasks.length < 30 || loading} onPress={() => setTaskPage(taskPage + 1)}>下一页</Button></div>
          {detail && <Card shadow="none" className="border border-divider"><CardBody className="gap-2"><div className="flex justify-between gap-2"><b>#{detail.id} 版本记录</b><Button size="sm" variant="light" onPress={() => setDetail(null)}>收起</Button></div>{detail.knowledge_status && <p className="text-sm">共享知识库：{statusLabels[detail.knowledge_status] || detail.knowledge_status}{detail.knowledge_error ? ` · ${detail.knowledge_error}` : ''}</p>}{(detail.versions || []).map((version) => <details key={version.revision} className="rounded-lg border border-divider p-3"><summary>版本 {version.revision} · {displayTime(version.created_at)}</summary><p className="mt-2 whitespace-pre-wrap text-sm">{String(version.payload?.reply || '')}</p><p className="text-xs text-default-500">状态：{statusLabels[String(version.payload?.status)] || String(version.payload?.status || '')}</p></details>)}</CardBody></Card>}
        </section>
      </Tab>
      <Tab key="batches" title="积压接待">
        <section className="mt-3 space-y-3">
          <Alert color="default" title="先固定范围，再确认处理" description={`左侧已勾选 ${selectedConversationIds.length} 个会话。未勾选时按任务范围预览当前待回复咨询；只处理确认时的固定消息，新增消息会跳过并重新交给客服。`} />
          {batch && <Card><CardBody className="gap-3 p-4">
            <div className="flex flex-wrap justify-between gap-2"><b>批次 #{batch.id}</b><Chip size="sm" color={tone(batch.status)}>{statusLabels[batch.status] || batch.status}</Chip></div>
            <p className="text-xs text-default-500">任务 #{batch.task_id} · 任务版本 {batch.task_revision} · 本轮消息截止 #{batch.cutoff_message_id}</p>
            <p className="text-sm">{Object.entries(batch.counts || {}).map(([key, count]) => `${statusLabels[key] || key} ${count}`).join(' · ')}</p>
            <p className="text-xs text-default-500">自动发送关闭时，本轮只生成待人工确认的回复。人工接管、任务变化或失效的会话会跳过。</p>
            <div className="flex flex-wrap gap-2">
              {(batchActions[batch.status] || []).map((action) => <Button key={action} size="sm" color={action === 'confirm' ? 'primary' : 'default'} isDisabled={busy || !can('customer_service.message.batch_send')} onPress={() => void run(async () => { const next = await csCommandApi.actBatch(batch.id, batch.revision, action); setBatch(await csCommandApi.getBatch(next.id)); })}>{actionLabels[action]}</Button>)}
              <Button size="sm" variant="light" isDisabled={busy} onPress={() => void run(async () => { setBatch(await csCommandApi.getBatch(batch.id)); })}>刷新进度</Button>
              {batch.summary?.has_more === true && <Button size="sm" variant="flat" isDisabled={busy || !can('customer_service.message.batch_send')} onPress={() => void run(async () => { const task = await csCommandApi.getTask(batch.task_id); await previewBatch(task, Number(batch.summary?.next_cursor)); })}>预览下一批</Button>}
            </div>
            {(batch.items || []).map((item) => <div key={item.id} className="space-y-1 rounded-lg border border-divider p-3"><p className="text-sm">会话 #{item.conversation_id} · {statusLabels[item.status] || item.status}</p>{item.reason && <p className="text-xs text-default-500">{reasonLabels[item.reason] || '处理条件已变化，可查看会话的最新消息。'}</p>}{item.reply && <p className="whitespace-pre-wrap text-sm">{item.reply}</p>}<p className="text-xs text-default-400">已尝试 {item.attempts} 次{item.message_id ? ` · 消息 #${item.message_id}` : ''}</p></div>)}
            {!batch.items?.length && <p className="text-sm text-default-500">本轮没有符合条件的待回复咨询，不会发送消息。</p>}
          </CardBody></Card>}
          <details className="rounded-xl border border-divider p-3" open={!batch}><summary>最近的接待批次</summary><div className="mt-2 flex flex-wrap gap-2">{batches.map((item) => <Button key={item.id} size="sm" variant="flat" isDisabled={busy} onPress={() => void run(async () => { setBatch(await csCommandApi.getBatch(item.id)); })}>#{item.id} · {statusLabels[item.status] || item.status}</Button>)}{!batches.length && <p className="text-sm text-default-500">尚未创建批次，请从任务卡片点击“预览积压咨询”。</p>}</div></details>
        </section>
      </Tab>
      <Tab key="settings" title="运行开关">
        <section className="mt-3 space-y-3">{!canReadConfig ? <Alert color="warning" title="运行设置不可读" description="需要“读取客服运行配置”权限才能查看或修改任务接待开关。" /> : settings && <Card><CardBody className="gap-4 p-4">
          <Alert color={settings.enabled ? 'warning' : 'default'} title={settings.enabled ? '任务接待已开启' : '任务接待默认关闭'} description="指令解析和保存草稿不会开启自动接待。实际发送还需要原有 AI 代答开关、自动模式和这里的自动发送许可同时满足。" />
          <Switch isSelected={settings.enabled} isDisabled={busy || !canManage || !installed} onValueChange={(enabled) => setSettings({ ...settings, enabled, auto_send: enabled ? settings.auto_send : false })}>启用已发布任务参与客服接待</Switch>
          <Switch isSelected={settings.auto_send} isDisabled={busy || !canManage || !installed || !settings.enabled} onValueChange={(auto_send) => setSettings({ ...settings, auto_send })}>允许发送任务回复（默认关闭；关闭时仅生成建议）</Switch>
          <div className="grid gap-3 md:grid-cols-2"><NumberInput label="每天最多调用指令 / 分类模型多少次" minValue={1} maxValue={10000} value={settings.max_daily_calls} isDisabled={busy || !canManage} onValueChange={(value) => setSettings({ ...settings, max_daily_calls: Math.max(1, Math.trunc(value || 1)) })} /><NumberInput label="每轮最多处理多少个会话" minValue={1} maxValue={1000} value={settings.max_batch_size} isDisabled={busy || !canManage} onValueChange={(value) => setSettings({ ...settings, max_batch_size: Math.max(1, Math.trunc(value || 1)) })} /></div>
          <div className="flex flex-wrap gap-2"><Button color="primary" isDisabled={busy || !canManage || !installed} onPress={() => void run(async () => { setSettings(await csCommandApi.saveSettings(settings)); setNotice('运行设置已保存。'); })}>保存运行设置</Button><Button color="danger" variant="flat" isDisabled={busy || !canManage || !installed} onPress={() => void run(async () => { const current = await csCommandApi.getSettings(); setSettings(await csCommandApi.saveSettings({ ...current, enabled: false, auto_send: false })); setNotice('任务接待已停止，待发送结果会重新核验。'); })}>立即停止任务接待</Button></div>
        </CardBody></Card>}</section>
      </Tab>
    </Tabs>
  </div>;
};
