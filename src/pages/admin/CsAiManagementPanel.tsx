import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, CardBody, Chip, Input, NumberInput, Select, SelectItem, Switch, Tab, Tabs, Textarea } from '@heroui/react';
import adminApiService from '../../services/adminApi';
import { showToast } from '../../components/Toast';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { CsCommandPanel } from './CsCommandPanel';
import { CsAiConnectionsPanel } from './CsAiConnectionsPanel';
import { CsKnowledgeWorkspace } from './CsKnowledgeWorkspace';

type Data = Record<string, unknown>;
const object = (value: unknown): Data => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Data : {};
const text = (value: unknown) => typeof value === 'string' ? value : '';
const number = (value: unknown) => typeof value === 'number' ? value : 0;
const strings = (value: unknown) => Array.isArray(value) ? value.map(String) : [];
const records = (value: unknown) => Array.isArray(value) ? value.map(object) : [];
const csv = (value: string) => value.split(/[,，\n]/).map((part) => part.trim()).filter(Boolean);

const STAT_LABELS: Record<string, { label: string; hint: string }> = {
  auto_replies: { label: 'AI 自动回复', hint: '直接发给用户的回复' },
  drafts: { label: '生成建议', hint: '先给客服看的草稿' },
  adopted: { label: '建议直接采纳', hint: '未修改就发送' },
  edited: { label: '编辑后发送', hint: '客服改过才发送' },
  rejected: { label: '建议被驳回', hint: '质量不达标被拒绝' },
  handoffs: { label: '转人工会话', hint: '周期内交给人工的会话' },
};
const AUDIT_META: Record<string, { label: string; color: 'success' | 'danger' | 'warning' }> = {
  correct: { label: '回答正确', color: 'success' },
  incorrect: { label: '回答错误', color: 'danger' },
  tone: { label: '语气问题', color: 'warning' },
};
const QUEUE_LABELS: Record<string, string> = { waiting: '等待处理', running: 'AI 正在处理', draft_pending: '建议待确认', human: '人工处理中' };
const HANDOFF_LABELS: Record<string, string> = {
  user_requested_human: '用户要求人工', sensitive_request: '敏感话题', ai_disabled: '自动处理已关闭',
  human_takeover: '客服主动接管', draft_rejected: '建议被驳回', draft_timeout: '建议超时未确认',
  worker_timeout: '模型响应超时', provider_unavailable: '模型服务不可用', ai_queue_overloaded: 'AI 排队超时',
  incident_followup: '事故话术后追问', takeover_expired: '接管闲置交还', unknown: '其他原因',
};

const StatCard: React.FC<{ label: string; value: string | number; hint?: string; tone?: 'success' | 'warning' | 'danger' | 'default' | 'primary' | 'secondary' }> = ({ label, value, hint, tone = 'default' }) => (
  <Card shadow="none" className="border border-divider"><CardBody className="gap-0.5 p-3">
    <span className="text-xs text-default-500">{label}</span>
    <span className={`text-xl font-bold ${({ success: 'text-success', warning: 'text-warning', danger: 'text-danger', primary: 'text-primary', secondary: 'text-secondary', default: 'text-foreground' } as Record<string, string>)[tone]}`}>{value}</span>
    {hint && <span className="text-xs text-default-400">{hint}</span>}
  </CardBody></Card>
);

// 纯 CSS 每日对比柱：自动回复 vs 建议采纳/驳回，悬浮可见精确数字，无图表库依赖。
const DailyBars: React.FC<{ days: Data[] }> = ({ days }) => {
  const max = Math.max(1, ...days.map((day) => Math.max(number(day.auto_replies), number(day.drafts))));
  if (!days.length) return <p className="text-xs text-default-400">本周期暂无 AI 消息。</p>;
  return <div className="flex items-end gap-1.5 overflow-x-auto pb-1">
    {days.map((day) => (
      <div key={text(day.date)} className="flex min-w-8 flex-col items-center gap-1" title={`${text(day.date)}：自动回复 ${number(day.auto_replies)} · 建议 ${number(day.drafts)}（采纳 ${number(day.adopted)} / 改后发 ${number(day.edited)} / 驳回 ${number(day.rejected)}）`}>
        <div className="flex h-24 items-end gap-0.5">
          <div className="w-3 rounded-t bg-primary/70" style={{ height: `${Math.max(2, (number(day.auto_replies) / max) * 96)}px` }} />
          <div className="w-3 rounded-t bg-success/70" style={{ height: `${Math.max(2, (number(day.drafts) / max) * 96)}px` }} />
        </div>
        <span className="text-[10px] text-default-400">{text(day.date)}</span>
      </div>
    ))}
  </div>;
};


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

type Props = { selectedConversationIds: number[]; onClose?: () => void; knowledgeMessageId?: number | null; onOpenConversation?: (id: number) => void };
export const CsAiManagementPanel: React.FC<Props> = ({ selectedConversationIds, onClose, knowledgeMessageId, onOpenConversation }) => {
  const { can } = useAdminAuth();
  const [settings, setSettings] = useState<Data>({});
  const [ai, setAi] = useState<Data>({});
  const [learning, setLearning] = useState<Data>({});
  const [sla, setSla] = useState<Data>({});
  const [groups, setGroups] = useState<Data[]>([]);
  const [stats, setStats] = useState<Data>({});
  const [statsDays, setStatsDays] = useState(7);
  const [statsLoading, setStatsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [auditId, setAuditId] = useState('');
  const [auditComment, setAuditComment] = useState('');
  const canReadConfig = can('customer_service.runtime_config.read');
  const canReadConversation = can('customer_service.conversation.read');
  const [activeTab, setActiveTab] = useState(knowledgeMessageId ? 'knowledge' : 'config');
  useEffect(() => { if (knowledgeMessageId) setActiveTab('knowledge'); }, [knowledgeMessageId]);
  const loadSettings = useCallback(async () => {
    if (!canReadConfig) return;
    const value = await adminApiService.getCsAiConfig();
    setSettings(value); setAi(object(value.ai)); setLearning(object(value.learning)); setSla(object(value.sla)); setGroups(records(value.groups));
  }, [canReadConfig]);
  const refreshStats = async (days = statsDays) => {
    setStatsLoading(true);
    try { setStats(await adminApiService.getCsAiStats(days)); }
    catch (e) { setError(e instanceof Error ? e.message : '统计加载失败'); }
    finally { setStatsLoading(false); }
  };
  const run = async (operation: () => Promise<void>, success = '操作成功') => {
    if (busy) return;
    setBusy(true); setError('');
    try { await operation(); if (success) showToast(success, 'success'); }
    catch (e) { setError(e instanceof Error ? e.message : '操作失败'); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    if (!canReadConfig && !canReadConversation) return;
    void run(async () => {
      if (canReadConfig) await loadSettings();
      if (canReadConversation) setStats(await adminApiService.getCsAiStats());
    }, '');
  }, [canReadConfig, canReadConversation, loadSettings]); // eslint-disable-line react-hooks/exhaustive-deps
  const publishedAi = object(settings.ai);
  const strategyDirty = JSON.stringify(ai) !== JSON.stringify(publishedAi)
    || JSON.stringify(learning) !== JSON.stringify(object(settings.learning))
    || JSON.stringify(sla) !== JSON.stringify(object(settings.sla));
  return <div className="space-y-4">
    <div className="flex justify-between items-center"><h2 className="font-semibold">客服自动化与知识管理</h2>{onClose && <Button size="sm" onPress={onClose}>关闭</Button>}</div>
    {!canReadConfig && <Alert color="warning" title="处理策略不可读" description="当前账号缺少“读取客服运行配置”权限；模型连接和已获授权的命令操作仍可使用。" />}
    {!canReadConversation && <Alert color="warning" title="会话数据不可读" description="当前账号缺少“查看客服会话”权限；知识审核、统计和命令任务记录不会加载。" />}
    {error && <Alert color="danger" title={error} />}
    <Tabs aria-label="客服管理功能" selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(String(key))}>
      <Tab key="config" title="处理策略">{!canReadConfig ? <div className="mt-3"><Alert color="warning" title="处理策略不可用" description="需要“读取客服运行配置”权限才能读取当前值并安全修改 AI 策略。" /></div> : <div className="mt-3 space-y-3">
        <Alert color={publishedAi.enabled ? 'success' : 'default'} title={publishedAi.enabled ? `已生效：AI 代答（${publishedAi.mode === 'auto' ? '有依据时自动发送' : '先生成建议，人工确认'}）` : '已生效：人工模式，AI 代答关闭'} description={`外部依赖：${Object.entries(object(settings.integrations)).map(([key, value]) => `${({ chat: '对客回复', command: '指令理解', mining: '知识提炼', knowledge: '知识库', vision: '图片识别' } as Record<string, string>)[key] || key} ${value ? '已配置' : '未配置'}`).join(' · ')}。修改下方表单需要保存后才生效；保存失败会保留原运行设置。`} />
        {strategyDirty && <p className="text-sm text-warning-700">表单有尚未保存的修改；上方显示的是当前已生效的策略。</p>}
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
        <div className="flex gap-2"><Button color="primary" isDisabled={busy || !can('customer_service.ai.manage')} onPress={() => void run(async () => { const value = await adminApiService.updateCsAiConfig({ revision: settings.revision, ai, learning, sla, groups }); setSettings(value); setAi(object(value.ai)); setLearning(object(value.learning)); setSla(object(value.sla)); }, '策略已保存')}>保存策略</Button><Button color="danger" variant="flat" isDisabled={busy || !can('customer_service.ai.manage')} onPress={() => void run(async () => { await adminApiService.stopCsAi(); await loadSettings(); })}>立即停止全部 AI</Button></div>
      </div>}</Tab>
      <Tab key="knowledge" title="知识管理"><CsKnowledgeWorkspace selectedConversationIds={selectedConversationIds} initialMessageId={knowledgeMessageId} onOpenConversation={onOpenConversation} /></Tab>
      <Tab key="command" title="命令中心"><CsCommandPanel selectedConversationIds={selectedConversationIds} /></Tab>
      <Tab key="connections" title="模型连接" isDisabled={!can('customer_service.ai.manage')}><CsAiConnectionsPanel /></Tab>
      <Tab key="audit" title="统计质检"><div className="space-y-4 mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select size="sm" label="统计周期" className="w-36" selectedKeys={[String(statsDays)]} onSelectionChange={(keys) => { const next = Number(Array.from(keys)[0] || 7); setStatsDays(next); void refreshStats(next); }}>
            {[7, 14, 30, 90].map((days) => <SelectItem key={String(days)}>近 {days} 天</SelectItem>)}
          </Select>
          <Button size="sm" isLoading={statsLoading} onPress={() => void refreshStats()}>刷新统计</Button>
        </div>
        <section className="space-y-2">
          <p className="text-sm font-semibold">回复概览（近 {number(stats.period_days) || statsDays} 天）</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            {Object.entries(STAT_LABELS).map(([key, meta]) => <StatCard key={key} label={meta.label} value={number(stats[key])} hint={meta.hint} tone={key === 'rejected' && number(stats.rejected) > 0 ? 'warning' : key === 'auto_replies' ? 'primary' : 'default'} />)}
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <StatCard label="建议采纳率" value={(() => { const decided = number(stats.adopted) + number(stats.edited) + number(stats.rejected); return decided ? `${Math.round(((number(stats.adopted) + number(stats.edited)) / decided) * 100)}%` : '—'; })()} hint="采纳+改后发 ÷ 全部已处理建议" tone="success" />
            <StatCard label="原样采纳占比" value={(() => { const decided = number(stats.adopted) + number(stats.edited) + number(stats.rejected); return decided ? `${Math.round((number(stats.adopted) / decided) * 100)}%` : '—'; })()} hint="不改一字直接发送的比例" />
            <StatCard label="AI 处理占比" value={(() => { const total = number(stats.auto_replies) + number(stats.drafts); return total ? `${Math.round((number(stats.auto_replies) / total) * 100)}%` : '—'; })()} hint="自动直接回复 ÷ AI 全部回复" />
            <StatCard label="质检评分" value={`${number(object(stats.audit).correct)}/${number(object(stats.audit).incorrect)}/${number(object(stats.audit).tone)}`} hint="正确 / 错误 / 语气问题" tone={number(object(stats.audit).incorrect) > 0 ? 'danger' : 'success'} />
          </div>
        </section>
        <section className="space-y-2">
          <p className="text-sm font-semibold">每日回复量<span className="ml-2 text-xs font-normal text-default-400">蓝=自动回复，绿=生成建议</span></p>
          <Card shadow="none" className="border border-divider"><CardBody className="p-3"><DailyBars days={records(stats.daily)} /></CardBody></Card>
        </section>
        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-2">
            <p className="text-sm font-semibold">当前队列</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(QUEUE_LABELS).map(([key, label]) => <StatCard key={key} label={label} value={number(object(stats.queue)[key])} tone={key === 'draft_pending' && number(object(stats.queue).draft_pending) > 0 ? 'warning' : 'default'} />)}
            </div>
            <p className="text-xs text-default-400">「建议待确认」是需要客服点发送的草稿；积压时先处理这些。</p>
          </section>
          <section className="space-y-2">
            <p className="text-sm font-semibold">转人工原因 TOP10</p>
            {Object.keys(object(stats.handoff_reasons)).length === 0 && <p className="text-xs text-default-400">本周期没有转人工。</p>}
            <div className="space-y-1">{Object.entries(object(stats.handoff_reasons)).map(([reason, count]) => {
              const total = Math.max(1, number(stats.handoffs));
              return <div key={reason} className="flex items-center gap-2 text-xs">
                <span className="w-32 shrink-0 truncate">{HANDOFF_LABELS[reason] || reason}</span>
                <div className="h-2 flex-1 rounded bg-default-100"><div className="h-2 rounded bg-warning/70" style={{ width: `${(Number(count) / total) * 100}%` }} /></div>
                <span className="w-8 text-right text-default-500">{Number(count)}</span>
              </div>;
            })}</div>
          </section>
        </div>
        <section className="space-y-2">
          <p className="text-sm font-semibold">知识库健康</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <StatCard label="已生效知识" value={number(object(stats.knowledge).synced)} tone="success" hint="AI 正在引用" />
            <StatCard label="待审核" value={number(object(stats.knowledge).pending)} tone={number(object(stats.knowledge).pending) > 0 ? 'warning' : 'default'} hint="需要人工批准" />
            <StatCard label="同步失败" value={number(object(stats.knowledge).error)} tone={number(object(stats.knowledge).error) > 0 ? 'danger' : 'default'} hint="需重试同步" />
            <StatCard label="本周期新增" value={number(object(stats.knowledge).mined_in_period)} hint="学习+手动录入合计" />
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-2">
            <p className="text-sm font-semibold">最近质检记录</p>
            {records(stats.recent_audits).length === 0 && <p className="text-xs text-default-400">还没有质检评分，挑几条 AI 回复打打分。</p>}
            <div className="space-y-1.5">{records(stats.recent_audits).map((item, index) => {
              const meta = AUDIT_META[text(item.score)] || { label: text(item.score), color: 'default' as const };
              return <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-divider px-2 py-1.5 text-xs">
                <Chip size="sm" variant="flat" color={meta.color}>{meta.label}</Chip>
                <span className="text-default-500">会话 #{number(item.conversation_id)} · 消息 #{number(item.message_id)}</span>
                <span className="text-default-400">{text(item.actor)} · {text(item.at).slice(0, 16).replace('T', ' ')}</span>
                {!!item.comment && <span className="w-full text-default-600">{text(item.comment)}</span>}
              </div>;
            })}</div>
          </section>
          <section className="space-y-2">
            <p className="text-sm font-semibold">给 AI 回复打分</p>
            <p className="text-xs text-default-400">在会话里把鼠标放到 AI 回复上可看到消息ID；错误/语气问题会进入模型改进依据。</p>
            <Input size="sm" label="质检消息ID" value={auditId} onValueChange={setAuditId} />
            <Textarea size="sm" label="质检备注（可选）" value={auditComment} onValueChange={setAuditComment} minRows={2} />
            <div className="flex gap-2">{(['correct', 'incorrect', 'tone'] as const).map((score) => <Button key={score} size="sm" color={AUDIT_META[score].color} variant="flat" isDisabled={busy || !Number(auditId) || !can('customer_service.ai.audit')} onPress={() => void run(async () => { await adminApiService.postCsAiAudit({ message_id: Number(auditId), score, comment: auditComment }); setAuditId(''); setAuditComment(''); await refreshStats(); }, '质检已记录')}>{AUDIT_META[score].label}</Button>)}</div>
          </section>
        </div>
      </div></Tab>
    </Tabs>
  </div>;
};
