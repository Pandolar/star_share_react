import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, CardBody, Checkbox, Chip, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Pagination, Select, SelectItem, Spinner, Textarea } from '@heroui/react';
import csKnowledgeApi, { KnowledgeBackfillReport, KnowledgeCluster, KnowledgeClusterDetail, KnowledgeFilters, KnowledgeMetrics, KnowledgeTab } from '../../services/csKnowledgeApi';
import csProductApi from '../../services/csProductApi';
import adminApi from '../../services/adminApi';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

type Props = { selectedConversationIds: number[]; initialMessageId?: number | null; onOpenConversation?: (id: number) => void };
type Sources = { message_id: number; conversation_id: number; answer: string; citations: Array<{ document_id?: string; document_name?: string; content?: string }>; candidate_ids: number[] };
type Job = { id: string; action: string; status: string; succeeded: number; failed: number; errors: Array<{ id: number; error: string }>; total: number };

const tabs: Array<{ key: KnowledgeTab; label: string }> = [
  { key: 'pending', label: '待审核' },
  { key: 'conflict', label: '待裁决冲突' },
  { key: 'needs_answer', label: '待补充答案' },
  { key: 'published', label: '已发布' },
  { key: 'blocked', label: '拉黑问法' },
  { key: 'rejected', label: '已拒绝' },
];
const statuses: Record<string, string> = { pending: '待审核', needs_answer: '待补答案', synced: '已生效', approved: '已批准待同步', indexing: '同步中', error: '同步失败', disabled: '已停用', rejected: '已拒绝' };
const sources: Record<string, string> = { manual: '人工录入', history: '历史学习', miss: '未命中转人工', draft_edited: '人工修订', incident: '问题复盘' };
const date = (value?: string) => value ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '—';

export const CsKnowledgeWorkspace: React.FC<Props> = ({ selectedConversationIds, initialMessageId, onOpenConversation }) => {
  const { can } = useAdminAuth();
  const canManage = can('customer_service.knowledge.manage');
  const [tab, setTab] = useState<KnowledgeTab>('pending');
  const [productId, setProductId] = useState(0);
  const [products, setProducts] = useState<Array<{ id: number; name: string }>>([]);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyTarget, setCopyTarget] = useState<number | null>(null);
  const [source, setSource] = useState('all');
  const [minFrequency, setMinFrequency] = useState('');
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [rows, setRows] = useState<KnowledgeCluster[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [metrics, setMetrics] = useState<KnowledgeMetrics | null>(null);
  const [selected, setSelected] = useState<Record<number, KnowledgeCluster>>({});
  const [detail, setDetail] = useState<KnowledgeClusterDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [batch, setBatch] = useState<'approve' | 'reject' | 'merge' | 'retry' | null>(null);
  const [mergeTarget, setMergeTarget] = useState('');
  const [targetId, setTargetId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [remember, setRemember] = useState(true);
  const [job, setJob] = useState<Job | null>(null);
  const [backfill, setBackfill] = useState<KnowledgeBackfillReport | null>(null);
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [editor, setEditor] = useState(false);
  const [draft, setDraft] = useState({ question: '', answer: '' });
  const [messageId, setMessageId] = useState(initialMessageId || 0);
  const [messageInput, setMessageInput] = useState(initialMessageId ? String(initialMessageId) : '');
  const [messageSources, setMessageSources] = useState<Sources | null>(null);
  const [mining, setMining] = useState<Record<string, unknown>>({});
  const detailVersion = useRef(0);

  const filters = (): Omit<KnowledgeFilters, 'tab'> => ({ source: source === 'all' ? undefined : source, min_frequency: minFrequency || undefined, query: query || undefined, product_id: productId });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await csKnowledgeApi.clusters({ tab, ...filters(), product_id: productId, current_page: page, page_size: size, sort: 'frequency' });
      setRows(result.data); setTotal(result.total || 0);
      setSelected((current) => Object.fromEntries(Object.entries(current).filter(([id]) => result.data.some((row) => row.id === Number(id)))));
    } catch (caught) { setError(caught instanceof Error ? caught.message : '知识加载失败'); }
    finally { setLoading(false); }
  }, [tab, source, minFrequency, query, page, size, productId]);

  const loadMetrics = useCallback(async () => {
    try { setMetrics((await csKnowledgeApi.metrics({ product_id: productId })).data); } catch { /* 指标失败不阻塞列表 */ }
  }, []);

  useEffect(() => {
    void csProductApi.list().then((result) => setProducts(result.data.map((item) => ({ id: item.id, name: item.name })))).catch(() => undefined);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadMetrics(); }, [loadMetrics, productId]);
  useEffect(() => { setSelected({}); setPage(1); }, [tab, source, minFrequency, query, productId]);

  useEffect(() => {
    if (!initialMessageId) return;
    setMessageId(initialMessageId); setMessageInput(String(initialMessageId));
    void csKnowledgeApi.messageSources(initialMessageId).then((result) => {
      const data = result.data as Sources;
      setMessageSources({ ...data, citations: Array.isArray(data?.citations) ? data.citations : [], candidate_ids: Array.isArray(data?.candidate_ids) ? data.candidate_ids : [] });
    }).catch((caught) => setError(caught instanceof Error ? caught.message : '引用信息加载失败'));
  }, [initialMessageId]);

  useEffect(() => {
    if (!job || job.status === 'done') return;
    const timer = window.setTimeout(async () => {
      try {
        const result = await csKnowledgeApi.batchJob(job.id);
        setJob(result.data);
        if (result.data.status === 'done') { await load(); await loadMetrics(); }
      } catch { /* 下一轮继续轮询 */ }
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [job, load, loadMetrics]);

  const normalizeDetail = (value: KnowledgeClusterDetail | KnowledgeCluster): KnowledgeClusterDetail => ({
    ...(value as KnowledgeClusterDetail),
    questions: Array.isArray((value as KnowledgeClusterDetail).questions) ? (value as KnowledgeClusterDetail).questions : [],
    answers: Array.isArray((value as KnowledgeClusterDetail).answers) ? (value as KnowledgeClusterDetail).answers : [],
    absorbed: Array.isArray((value as KnowledgeClusterDetail).absorbed) ? (value as KnowledgeClusterDetail).absorbed : [],
    similar_published: Array.isArray((value as KnowledgeClusterDetail).similar_published) ? (value as KnowledgeClusterDetail).similar_published : [],
    evidence: Array.isArray(value.evidence) ? value.evidence : [],
  });

  const refreshDetail = async (id: number) => {
    const version = ++detailVersion.current;
    setDetailLoading(true);
    try {
      const result = await csKnowledgeApi.cluster(id);
      if (version === detailVersion.current) setDetail(normalizeDetail(result.data));
    } catch (caught) { setError(caught instanceof Error ? caught.message : '详情加载失败'); }
    finally { if (version === detailVersion.current) setDetailLoading(false); }
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(''); setNotice('');
    try { await fn(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '操作失败'); }
    finally { setBusy(false); }
  };

  const submitBatch = (mode: 'selected' | 'filter') => run(async () => {
    if (!batch) return;
    const items = mode === 'selected' ? Object.values(selected).map((row) => ({ id: row.id, revision: row.revision })) : undefined;
    if (mode === 'selected' && !items?.length) throw new Error('请先选择知识');
    if (batch === 'merge' && !/^[1-9]\d*$/.test(mergeTarget)) throw new Error('请填写合并目标知识ID');
    const result = await csKnowledgeApi.batch({
      action: batch,
      items,
      filters: mode === 'filter' ? { tab, ...filters() } : undefined,
      target_id: batch === 'merge' ? Number(mergeTarget) : undefined,
      reason: batch === 'reject' ? rejectReason.trim() || undefined : undefined,
      remember: batch === 'reject' ? remember : undefined,
      background: mode === 'filter',
    });
    setBatch(null); setSelected({}); setRejectReason('');
    if (result.data.queued && result.data.job_id) {
      setJob({ id: result.data.job_id, action: batch, status: 'queued', succeeded: 0, failed: 0, errors: [], total: result.data.total || 0 });
      setNotice(`已提交后台批量任务（${result.data.total || 0} 条），进度见上方。`);
    } else {
      setNotice(result.data.failed ? `完成 ${result.data.succeeded} 条，失败 ${result.data.failed} 条，请查看逐条结果。` : `已完成 ${result.data.succeeded} 条。`);
      await load(); await loadMetrics();
    }
  });

  const act = (row: KnowledgeCluster, action: string, extra: Record<string, unknown> = {}) => run(async () => {
    await csKnowledgeApi.act({ id: row.id, revision: row.revision, action, ...extra });
    await load(); await loadMetrics();
    if (detail?.id === row.id) await refreshDetail(row.id);
  });

  const previewBackfill = () => run(async () => {
    const result = await csKnowledgeApi.backfill({ dry_run: true });
    setBackfill(result.data); setBackfillOpen(true);
  });

  const applyBackfill = () => run(async () => {
    if (!backfill) return;
    const result = await csKnowledgeApi.backfill({ dry_run: false, token: backfill.token });
    setBackfill(result.data);
    setNotice(`收敛完成：合并 ${result.data.merged} 条、归档 ${result.data.archived} 条，待审 ${result.data.pending_after} 条。`);
    await load(); await loadMetrics();
  });

  const toggleRow = (row: KnowledgeCluster, checked: boolean) => setSelected((current) => {
    const next = { ...current };
    if (checked) next[row.id] = row; else delete next[row.id];
    return next;
  });
  const pageAllSelected = rows.length > 0 && rows.every((row) => selected[row.id]);
  const selectedRows = Object.values(selected);

  return <section className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">知识管理</h2>
        <p className="text-sm text-default-500">一行一个意图：相似问法与不同答案都收在同一个知识下统一裁决。</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" isDisabled={!canManage || busy} onPress={() => { setDraft({ question: '', answer: '' }); setEditor(true); }}>新增知识</Button>
        <Button size="sm" variant="flat" isDisabled={!canManage || busy} onPress={() => void previewBackfill()}>清理重复待审</Button>
        <Button size="sm" variant="light" isDisabled={busy} onPress={() => void run(async () => { await csKnowledgeApi.mine({ conversation_ids: selectedConversationIds.length ? selectedConversationIds : undefined, limit: 100 }); setMining(await adminApi.getCsMineProgress()); setNotice('已提交学习任务，只生成待审核候选。'); })}>{selectedConversationIds.length ? '学习已选已结束会话' : '学习历史会话'}</Button>
        <Button size="sm" variant="light" onPress={() => void load()}>刷新</Button>
      </div>
    </div>

    {metrics && <div className="flex flex-wrap gap-2 text-sm">
      <Chip size="sm" variant="flat" color={metrics.pending ? 'warning' : 'success'}>待审核 {metrics.pending}</Chip>
      <Chip size="sm" variant="flat" color={metrics.conflict ? 'danger' : 'default'}>待裁决 {metrics.conflict}</Chip>
      <Chip size="sm" variant="flat">待补答案 {metrics.needs_answer}</Chip>
      <Chip size="sm" variant="flat" color="success">已发布 {metrics.published}</Chip>
      <Chip size="sm" variant="flat">已合并 {metrics.variants_absorbed}</Chip>
      <Chip size="sm" variant="flat">近7天自动处理 {metrics.auto_7d}</Chip>
      <Chip size="sm" variant="flat">拉黑 {metrics.blocked}</Chip>
    </div>}

    {error && <Alert color="danger" title={error} />}
    {notice && <Alert color="success" title={notice} />}
    {job && <Alert color={job.status === 'done' ? 'success' : 'primary'} title={`批量任务 ${job.action} · ${job.status}`} description={`成功 ${job.succeeded} / ${job.total || '—'}，失败 ${job.failed}。${job.errors.slice(-3).map((item) => `#${item.id} ${item.error}`).join('；')}`} />}

    <div className="flex flex-wrap gap-2">
      {tabs.map((item) => <Button key={item.key} size="sm" variant={tab === item.key ? 'solid' : 'flat'} color={tab === item.key ? 'primary' : 'default'} onPress={() => setTab(item.key)}>{item.label}</Button>)}
    </div>

    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <Select label="产品" selectedKeys={[String(productId)]} onSelectionChange={(keys) => setProductId(Number(Array.from(keys)[0] || 0))}>{products.map((product) => <SelectItem key={String(product.id)}>{product.name}</SelectItem>)}</Select>
      <Select label="来源" selectedKeys={[source]} onSelectionChange={(keys) => setSource(String(Array.from(keys)[0] || 'all'))}>{[{ id: 'all', name: '全部来源' }, ...Object.entries(sources).map(([id, name]) => ({ id, name }))].map((item) => <SelectItem key={item.id}>{item.name}</SelectItem>)}</Select>
      <Input label="最少出现次数" type="number" min="1" value={minFrequency} onValueChange={setMinFrequency} />
      <Select label="每页条数" selectedKeys={[String(size)]} onSelectionChange={(keys) => setSize(Number(Array.from(keys)[0] || 20))}>{[10, 20, 50, 100].map((value) => <SelectItem key={String(value)}>{value} 条</SelectItem>)}</Select>
      <form className="flex items-end gap-2" onSubmit={(event) => { event.preventDefault(); setQuery(input.trim()); }}><Input label="搜索问题/答案/ID" value={input} onValueChange={setInput} /><Button type="submit">搜索</Button></form>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <Checkbox isSelected={pageAllSelected} isIndeterminate={!pageAllSelected && selectedRows.length > 0} isDisabled={!rows.length || busy} onValueChange={(checked) => setSelected(checked ? Object.fromEntries(rows.map((row) => [row.id, row])) : {})}>选择本页</Checkbox>
      <span className="text-sm text-default-500">已选 {selectedRows.length} 条</span>
      <Button size="sm" color="primary" isDisabled={!canManage || busy || !selectedRows.length} onPress={() => setBatch('approve')}>批量批准</Button>
      <Button size="sm" color="danger" variant="flat" isDisabled={!canManage || busy || !selectedRows.length} onPress={() => setBatch('reject')}>批量拒绝</Button>
      <Button size="sm" variant="flat" isDisabled={!canManage || busy || selectedRows.length < 1} onPress={() => setBatch('merge')}>批量合并</Button>
      <Button size="sm" variant="light" isDisabled={!canManage || busy || !selectedRows.length} onPress={() => setBatch('retry')}>批量重试</Button>
      <Button size="sm" variant="light" isDisabled={!canManage || busy || !total} onPress={() => setBatch('reject')}>按筛选处理…</Button>
      {selectedRows.length > 0 && <Button size="sm" variant="light" onPress={() => setSelected({})}>清空选择</Button>}
    </div>

    <Card shadow="none" className="border border-divider"><CardBody className="p-0">
      <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-sm">
        <thead className="bg-default-100"><tr>{['', '标准问题', '问法/答案', '状态', '频次', '来源', '最近', '操作'].map((label) => <th key={label} className="px-3 py-2 font-medium">{label}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-divider align-top">
          <td className="px-3 py-2"><Checkbox aria-label={`选择知识 #${row.id}`} isSelected={Boolean(selected[row.id])} isDisabled={busy} onValueChange={(checked) => toggleRow(row, checked)} /></td>
          <td className="max-w-72 px-3 py-2"><p className="line-clamp-3 font-medium">{row.question}</p><p className="text-xs text-default-400">#{row.id}{row.auto_state ? ` · ${row.auto_state}` : ''}{row.blocked ? ` · 已拉黑(${row.block_hits})` : ''}</p></td>
          <td className="px-3 py-2"><p className="text-xs text-default-500">问法 {row.question_variant_count} · 答案 {row.answer_variant_count}{row.has_human ? ' · 含人工答复' : ''}</p><p className="line-clamp-2 text-default-600">{row.answer}</p></td>
          <td className="px-3 py-2"><Chip size="sm" variant="flat" color={row.conflict_state === 'hard' ? 'danger' : row.status === 'synced' ? 'success' : row.status === 'error' ? 'danger' : row.status === 'needs_answer' ? 'warning' : 'default'}>{statuses[row.status] || row.status}{row.conflict_state === 'hard' ? ' · 冲突' : ''}</Chip></td>
          <td className="px-3 py-2 tabular-nums">{row.frequency}</td>
          <td className="px-3 py-2 text-xs">{sources[row.source] || row.source}</td>
          <td className="whitespace-nowrap px-3 py-2 text-xs text-default-500">{date(row.updated_at)}</td>
          <td className="px-3 py-2"><div className="flex flex-wrap gap-1"><Button size="sm" variant="light" isDisabled={busy} onPress={() => { setDetail(normalizeDetail(row)); void refreshDetail(row.id); }}>查看</Button>{row.blocked ? <Button size="sm" variant="light" isDisabled={!canManage || busy} onPress={() => void run(async () => { await csKnowledgeApi.unblock(row.id); await load(); await loadMetrics(); })}>解除拉黑</Button> : <>{['pending', 'needs_answer'].includes(row.status) && <><Button size="sm" color="primary" isDisabled={!canManage || busy} onPress={() => void act(row, 'approve')}>批准</Button><Button size="sm" color="danger" variant="light" isDisabled={!canManage || busy} onPress={() => void act(row, 'reject', { remember: true })}>拒绝并拉黑</Button></>}{row.status === 'error' && <Button size="sm" isDisabled={!canManage || busy} onPress={() => void act(row, 'retry')}>重试</Button>}</>}</div></td>
        </tr>)}</tbody>
      </table></div>
      {loading && <p className="p-3 text-center text-sm" role="status">正在加载知识…</p>}
      {!rows.length && !loading && <p className="p-8 text-center text-default-500">当前筛选没有知识。</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider p-3">
        <p className="text-sm text-default-500">共 {total} 条 · 第 {page}/{Math.max(1, Math.ceil(total / size))} 页</p>
        <Pagination page={page} total={Math.max(1, Math.ceil(total / size))} onChange={setPage} isDisabled={loading || busy} />
      </div>
    </CardBody></Card>

    {messageSources && <Card shadow="none" className="border border-divider"><CardBody className="gap-2">
      <div className="flex items-center justify-between"><h3 className="font-semibold">答复 #{messageSources.message_id} 引用的知识</h3><Button size="sm" variant="light" onPress={() => { setMessageSources(null); setMessageId(0); }}>关闭</Button></div>
      {(messageSources.citations || []).map((item, index) => <div key={index} className="rounded border border-divider p-2 text-sm"><p className="text-xs text-default-500">{item.document_name || item.document_id || '未命名'}</p><p className="whitespace-pre-wrap">{item.content}</p></div>)}
      {!(messageSources.citations || []).length && <p className="text-sm text-default-500">该答复没有引用记录。</p>}
    </CardBody></Card>}

    <Modal isOpen={Boolean(detail)} onClose={() => { detailVersion.current += 1; setDetail(null); }} size="4xl" scrollBehavior="inside">
      <ModalContent><ModalHeader>知识 #{detail?.id} · {detail ? statuses[detail.status] || detail.status : ''}</ModalHeader>
        <ModalBody className="gap-4">{detailLoading && <Spinner label="加载详情…" />}{detail && <>
          <section><h3 className="font-semibold">标准问题</h3>
            <p className="mt-1 whitespace-pre-wrap">{detail.question}</p>
            {detail.questions.map((item, index) => <label key={index} className="mt-2 flex items-start gap-2 rounded border border-divider p-2 text-sm">
              <input type="radio" className="mt-1" name="canonical-question" checked={item.question === detail.question} disabled={!canManage || busy} onChange={() => void act(detail as unknown as KnowledgeCluster, 'resolve', { question_index: index })} />
              <span className="flex-1">{item.question}<span className="ml-2 text-xs text-default-400">出现 {item.count} 次 · 相似 {item.similarity}</span></span>
              {item.question !== detail.question && <Button size="sm" variant="light" isDisabled={!canManage || busy} onPress={() => void act(detail as unknown as KnowledgeCluster, 'split', { question_index: index })}>拆出</Button>}
            </label>)}
            {!(detail.questions || []).length && <p className="text-sm text-default-500">暂无其他相似问法。</p>}
          </section>
          <section><h3 className="font-semibold">答案候选（{detail.answer_variant_count}）</h3>
            {detail.answers.map((item, index) => <label key={item.hash} className={`mt-2 flex items-start gap-2 rounded border p-2 text-sm ${item.state === 'conflict' ? 'border-danger-200 bg-danger-50/40' : 'border-divider'}`}>
              <input type="radio" className="mt-1" name="canonical-answer" checked={item.state === 'chosen'} disabled={!canManage || busy} onChange={() => void act(detail as unknown as KnowledgeCluster, 'resolve', { answer_index: index })} />
              <span className="flex-1 whitespace-pre-wrap">{item.answer}<span className="ml-2 text-xs text-default-400">命中 {item.count} 次{item.has_human ? ' · 人工' : ''}{item.state === 'conflict' ? ' · 冲突待裁决' : ''}</span></span>
            </label>)}
            {!(detail.answers || []).length && <p className="text-sm text-default-500">还没有答案，补充后再批准。</p>}
          </section>
          <section><h3 className="font-semibold">已并入的问法（{(detail.absorbed || []).length}）</h3>
            {detail.absorbed.map((item) => <p key={item.id} className="mt-1 text-sm">#{item.id} {item.question} <span className="text-xs text-default-400">{statuses[item.status] || item.status} · {item.frequency} 次</span></p>)}
            {!(detail.absorbed || []).length && <p className="text-sm text-default-500">没有历史合并行。</p>}
          </section>
          <section><h3 className="font-semibold">已发布知识里的相近条目</h3>
            {detail.similar_published.map((item) => <div key={item.id} className="mt-2 flex items-center justify-between gap-2 rounded border border-divider p-2 text-sm"><span>#{item.id} {item.question}<span className="ml-2 text-xs text-default-400">相似 {item.similarity} · {statuses[item.status] || item.status}</span></span><Button size="sm" variant="light" isDisabled={!canManage || busy} onPress={() => void act(detail as unknown as KnowledgeCluster, 'merge', { target_id: item.id })}>并入该条</Button></div>)}
            {!(detail.similar_published || []).length && <p className="text-sm text-default-500">没有相近的已发布知识。</p>}
          </section>
          <section className="space-y-2"><h3 className="font-semibold">证据（{detail.evidence?.length || 0}）</h3>
            {(detail.evidence as Array<Record<string, unknown>> | undefined)?.map((item, index) => <p key={index} className="text-xs text-default-500">会话 #{String(item.conversation_id || '—')} · 消息 {String(item.message_id || '—')} · {String(item.source || '')} · {String(item.at || '')}</p>)}
            {detail.conversation_id && onOpenConversation && <Button size="sm" variant="flat" onPress={() => onOpenConversation(detail.conversation_id!)}>打开原始会话</Button>}
          </section>
        </>}</ModalBody>
        <ModalFooter className="flex-wrap">
          {detail && <><Button isDisabled={!canManage || busy} onPress={() => { setDraft({ question: detail.question, answer: detail.answer }); setEditor(true); }}>编辑内容</Button>
            {['pending', 'needs_answer'].includes(detail.status) && <><Button color="primary" isDisabled={!canManage || busy} onPress={() => void act(detail as unknown as KnowledgeCluster, 'approve')}>批准</Button><Button color="danger" variant="flat" isDisabled={!canManage || busy} onPress={() => void act(detail as unknown as KnowledgeCluster, 'reject', { remember })}>拒绝</Button></>}
            {detail.blocked ? <Button color="primary" variant="flat" isDisabled={!canManage || busy} onPress={() => void run(async () => { await csKnowledgeApi.unblock(detail.id); await refreshDetail(detail.id); await load(); })}>解除拉黑</Button> : <Button variant="flat" isDisabled={!canManage || busy} onPress={() => void run(async () => { await csKnowledgeApi.block(detail.id, 'manual'); await refreshDetail(detail.id); await load(); })}>拉黑该问法</Button>}
          </>}
          <Button variant="light" onPress={() => setDetail(null)}>关闭</Button>
        </ModalFooter></ModalContent></Modal>

    <Modal isOpen={Boolean(batch)} onClose={() => !busy && setBatch(null)} isDismissable={!busy}>
      <ModalContent><ModalHeader>{batch === 'approve' ? '批量批准' : batch === 'reject' ? '批量拒绝' : batch === 'merge' ? '批量合并' : '批量重试'}</ModalHeader>
        <ModalBody className="gap-3">
          <p className="text-sm">已选 {selectedRows.length} 条；选择“按筛选处理”时会处理后端匹配的全部知识（后台任务）。</p>
          {batch === 'reject' && <>
            <Input label="拒绝原因（可选）" value={rejectReason} onValueChange={setRejectReason} />
            <Checkbox isSelected={remember} onValueChange={setRemember}>同时拉黑这些问法（之后只计数，不再进入审核队列）</Checkbox>
          </>}
          {batch === 'merge' && <Input label="合并目标知识ID" value={mergeTarget} onValueChange={setMergeTarget} description="目标必须是未合并的簇主行；相似问法与答案会并入目标。" />}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" isDisabled={busy} onPress={() => setBatch(null)}>取消</Button>
          {batch === 'merge' ? <Button color="primary" isLoading={busy} isDisabled={!mergeTarget} onPress={() => void submitBatch('selected')}>合并已选</Button>
            : <><Button variant="flat" isLoading={busy} isDisabled={!selectedRows.length} onPress={() => void submitBatch('selected')}>处理已选</Button><Button color="primary" isLoading={busy} isDisabled={!total} onPress={() => void submitBatch('filter')}>按筛选全部处理（{total}）</Button></>}
        </ModalFooter></ModalContent></Modal>

    <Modal isOpen={backfillOpen} onClose={() => !busy && setBackfillOpen(false)} size="3xl" scrollBehavior="inside">
      <ModalContent><ModalHeader>历史知识收敛预览</ModalHeader>
        <ModalBody className="gap-3">{backfill && <>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <span>扫描：{backfill.scanned} 条</span><span>待审：{backfill.pending_before} → {backfill.pending_after}</span><span>簇：{backfill.clusters}</span>
            <span>可合并：{backfill.merged} 条（{backfill.merged_clusters} 组）</span><span>冲突待裁决：{backfill.conflicts}</span><span>归档待补答案：{backfill.archived}</span>
          </div>
          <div><h3 className="font-semibold">合并示例</h3>{backfill.examples.map((item) => <div key={item.target_id} className="mt-2 rounded border border-divider p-2 text-sm"><p className="font-medium">#{item.target_id} {item.target_question}</p>{item.absorbed.map((child) => <p key={child.id} className="text-xs text-default-500">← #{child.id} {child.question}（相似 {child.similarity}）</p>)}</div>)}</div>
          <Alert color="warning" title="执行会改写现有行" description="合并后来源行保留为已并入记录（不再占用审核队列），并写入审计；预览令牌执行一次后失效。" />
        </>}</ModalBody>
        <ModalFooter><Button variant="light" isDisabled={busy} onPress={() => setBackfillOpen(false)}>关闭</Button><Button color="primary" isLoading={busy} isDisabled={!canManage || !backfill || !backfill.dry_run} onPress={() => void applyBackfill()}>确认执行</Button></ModalFooter></ModalContent></Modal>

    <Modal isOpen={editor} onClose={() => { if (!busy) setEditor(false); }} size="2xl" scrollBehavior="inside">
      <ModalContent><ModalHeader>{detail ? `编辑知识 #${detail.id}` : '新增待审知识'}</ModalHeader>
        <ModalBody><Input label="标准问题" value={draft.question} onValueChange={(value) => setDraft((current) => ({ ...current, question: value }))} /><Textarea label="完整答复" minRows={8} value={draft.answer} onValueChange={(value) => setDraft((current) => ({ ...current, answer: value }))} /></ModalBody>
        <ModalFooter><Button isDisabled={busy} onPress={() => setEditor(false)}>取消</Button>
          <Button color="primary" isLoading={busy} isDisabled={!canManage || busy || !draft.question.trim() || !draft.answer.trim()} onPress={() => void run(async () => {
            if (detail) await csKnowledgeApi.act({ id: detail.id, revision: detail.revision, action: 'edit', ...draft });
            else await csKnowledgeApi.add(draft);
            setEditor(false); setNotice('内容已保存，需核对审核后才供 AI 使用。');
            await load(); if (detail) await refreshDetail(detail.id);
          })}>保存内容</Button></ModalFooter></ModalContent></Modal>
  </section>;
};
export default CsKnowledgeWorkspace;
