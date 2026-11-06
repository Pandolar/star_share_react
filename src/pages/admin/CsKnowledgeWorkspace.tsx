import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, CardBody, Checkbox, Chip, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Pagination, Select, SelectItem, Textarea } from '@heroui/react';
import csKnowledgeApi, { KnowledgeCandidate, KnowledgeUsage } from '../../services/csKnowledgeApi';
import adminApi from '../../services/adminApi';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

type Props = { selectedConversationIds: number[]; initialMessageId?: number | null; onOpenConversation?: (id: number) => void };
type Sources = { message_id: number; conversation_id: number; answer: string; citations: Array<{ document_id?: string; document_name?: string; content?: string }>; candidate_ids: number[] };
const statuses: Record<string, string> = { pending: '待审核', synced: '已生效', processed: '已处理', approved: '已批准待同步', indexing: '同步中', error: '同步失败', disabled: '已停用', rejected: '已拒绝', all: '全部状态' };
const sources: Record<string, string> = { manual: '人工录入', history: '历史学习', miss: '未命中转人工', draft_edited: '人工修订', incident: '问题复盘' };
const disposition: Record<string, string> = { ai: '自动回复', adopted: '人工采用', edited: '修改后发送', human_reviewed: '人工确认', draft: '内部建议', command_task: '任务回复' };
const date = (value?: string) => value ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '—';
const records = (value: unknown): Array<Record<string, unknown>> => Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : [];

export const CsKnowledgeWorkspace: React.FC<Props> = ({ selectedConversationIds, initialMessageId, onOpenConversation }) => {
  const { can } = useAdminAuth();
  const canRead = can('customer_service.conversation.read');
  const canManage = can('customer_service.knowledge.manage');
  const [status, setStatus] = useState(initialMessageId ? 'all' : 'pending');
  const [source, setSource] = useState('all');
  const [sort, setSort] = useState('frequency');
  const [minFrequency, setMinFrequency] = useState('');
  const [onlyRepeated, setOnlyRepeated] = useState(false);
  const [selected, setSelected] = useState<Record<number, KnowledgeCandidate>>({});
  const [batchAction, setBatchAction] = useState<'approve'|'reject'|null>(null);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [messageInput, setMessageInput] = useState(initialMessageId ? String(initialMessageId) : '');
  const [messageId, setMessageId] = useState(initialMessageId || 0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [rows, setRows] = useState<KnowledgeCandidate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [detail, setDetail] = useState<KnowledgeCandidate | null>(null);
  const [usages, setUsages] = useState<KnowledgeUsage[]>([]);
  const [usagePage, setUsagePage] = useState(1);
  const [usageTotal, setUsageTotal] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [trace, setTrace] = useState<Sources | null>(null);
  const [editor, setEditor] = useState(false);
  const [draft, setDraft] = useState({ question: '', answer: '' });
  const [mergeTarget, setMergeTarget] = useState('');
  const [mining, setMining] = useState<Record<string, unknown>>({});
  const version = useRef(0);
  const detailVersion = useRef(0);
  const operation = useRef(false);
  const load = useCallback(async () => {
    if (!canRead) return;
    const request = ++version.current;
    setLoading(true); setError('');
    try {
      const result = await csKnowledgeApi.list({ status, source: source === 'all' ? undefined : source, sort, query, message_id: messageId || undefined, min_frequency: minFrequency ? Number(minFrequency) : undefined, only_repeated: onlyRepeated || undefined, current_page: page, page_size: size });
      if (request !== version.current) return;
      const lastPage = Math.max(1, Math.ceil((result.total || 0) / size));
      if (page > lastPage) { setPage(lastPage); return; }
      setRows(result.data); setTotal(result.total || 0);
    } catch (caught) { if (request === version.current) setError(caught instanceof Error ? caught.message : '知识列表加载失败'); }
    finally { if (request === version.current) setLoading(false); }
  }, [canRead, status, source, sort, query, messageId, page, size, minFrequency, onlyRepeated]);
  useEffect(() => { void load(); return () => { version.current += 1; }; }, [load]);
  useEffect(() => { setSelected({}); }, [status, source, sort, query, messageId, page, size, minFrequency, onlyRepeated]);
  useEffect(() => { setSelected((current) => Object.fromEntries(Object.entries(current).filter(([id, row]) => { const latest = rows.find((candidate) => candidate.id === Number(id)); return latest?.status === 'pending' && latest.revision === row.revision; }))); }, [rows]);
  const pendingRows = rows.filter((row) => row.status === 'pending');
  const selectedRows = Object.values(selected).filter((row) => pendingRows.some((item) => item.id === row.id && item.revision === row.revision));
  const toggleRow = (row: KnowledgeCandidate, checked: boolean) => setSelected((current) => { const next = { ...current }; if (checked) next[row.id] = row; else delete next[row.id]; return next; });
  const togglePage = (checked: boolean) => setSelected((current) => { const next = { ...current }; pendingRows.forEach((row) => { if (checked) next[row.id] = row; else delete next[row.id]; }); return next; });
  const executeBatch = () => run(async () => { if (!batchAction) return; const rowsToProcess = selectedRows; const { data: result } = await csKnowledgeApi.batch({ action: batchAction, items: rowsToProcess.map((row) => ({ id: row.id, revision: row.revision })) }); const failed = result.results.filter((item) => !item.success); setSelected(Object.fromEntries(failed.flatMap((item) => { const row = rowsToProcess.find((candidate) => candidate.id === item.id); return row ? [[row.id, row]] : []; }))); setBatchAction(null); await load(); if (result.failed) setError(`${batchAction === 'approve' ? '批准' : '拒绝'}部分完成：成功 ${result.succeeded} 条，失败 ${result.failed} 条。${failed.map((item) => ` #${item.id} ${item.error || '版本冲突'}`).join('；')}`); else setNotice(`${batchAction === 'approve' ? '批准' : '拒绝'}成功 ${result.succeeded} 条。`); });
  const quickReject = (row: KnowledgeCandidate) => run(async () => {
    const { data: result } = await csKnowledgeApi.batch({ action: 'reject', items: [{ id: row.id, revision: row.revision }] });
    await load();
    const failure = result.results.find((item) => !item.success);
    if (failure) setError(`拒绝 #${row.id} 失败：${failure.error || '版本冲突'}`);
    else setNotice(`已拒绝知识 #${row.id}。`);
  });
  useEffect(() => {
    if (!initialMessageId) return;
    setMessageInput(String(initialMessageId)); setMessageId(initialMessageId); setStatus('all'); setSource('all'); setQuery(''); setInput(''); setPage(1);
  }, [initialMessageId]);
  useEffect(() => {
    let current = true; setTrace(null);
    if (messageId && canRead) void csKnowledgeApi.messageSources(messageId).then((value) => { if (current) setTrace(value.data); }).catch((caught) => { if (current) setError(caught instanceof Error ? caught.message : '来源读取失败'); });
    return () => { current = false; };
  }, [messageId, canRead]);
  const refreshDetail = async (id: number, nextPage = 1) => {
    const request = ++detailVersion.current; setDetailLoading(true);
    try {
      const result = await csKnowledgeApi.detail(id, { current_page: nextPage, page_size: 10 });
      if (request !== detailVersion.current) return;
      setDetail(result.data.candidate); setUsages(result.data.usages); setUsageTotal(result.total || 0); setUsagePage(nextPage);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '知识详情读取失败'); }
    finally { if (request === detailVersion.current) setDetailLoading(false); }
  };
  const run = async (fn: () => Promise<void>) => {
    if (operation.current || !canManage) return;
    operation.current = true; setBusy(true); setError(''); setNotice('');
    try { await fn(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '知识操作失败，请刷新后重试'); }
    finally { operation.current = false; setBusy(false); }
  };
  const act = (row: KnowledgeCandidate, action: string) => run(async () => {
    if (['disable', 'reject', 'merge'].includes(action) && !window.confirm(`确认${action === 'disable' ? '停用这条知识，停止后续引用' : action === 'reject' ? '拒绝这条候选' : '将这条知识合并到目标条目'}？`)) return;
    const result = await csKnowledgeApi.act({ id: row.id, revision: row.revision, action, ...(action === 'merge' ? { target_id: Number(mergeTarget) } : {}) });
    setNotice('操作成功，列表已按当前筛选重新加载。'); await load();
    if (detail?.id === row.id) { setDetail(result.data); await refreshDetail(row.id); }
  });
  const search = () => { const value = messageInput.trim(); if (value && !/^[1-9]\d*$/.test(value)) { setError('答复消息ID必须是正整数'); return; } setMessageId(Number(value || 0)); setQuery(input.trim()); setPage(1); if (value) setStatus('all'); };
  if (!canRead) return <Alert color="warning" title="需要查看客服会话权限才能读取知识与引用来源" />;
  return <section className="mt-3 min-w-0 space-y-4">
    <Alert title="知识审核与答复追溯" description="待审核只显示尚未批准的候选；已生效与已处理独立筛选。AI 答错时，从会话消息的“查看知识来源”定位引用，核对后再编辑或停用。" />
    {error && <Alert color="danger" title="操作未完成" description={error} />}
    {notice && <Alert color="success" title={notice} />}
    {trace && <Card shadow="none" className="border border-secondary"><CardBody className="gap-2"><b>正在追溯答复 #{trace.message_id}</b><p className="whitespace-pre-wrap text-sm">{trace.answer}</p><div className="flex flex-wrap gap-2">{trace.citations.map((hit, i) => <details key={`${hit.document_id}-${i}`} className="rounded border border-divider p-2 text-xs"><summary>{hit.document_name || '外部知识文档'} · {hit.document_id}</summary><p className="mt-2 whitespace-pre-wrap">{hit.content || '没有保存引用片段'}</p></details>)}</div>{!trace.citations.length && <p className="text-sm text-warning">这条答复未保存明确知识引用，不能推断是哪条知识造成；请结合会话和模型输出核对。</p>}{trace.citations.length > 0 && !trace.candidate_ids.length && <p className="text-sm text-warning">引用来自尚未关联本地候选的 Dify 文档，可按上面的文档ID在 Dify 核对。</p>}<Button size="sm" className="self-start" onPress={() => { setMessageId(0); setMessageInput(''); setTrace(null); setPage(1); }}>退出此答复筛选</Button></CardBody></Card>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Select label="知识状态" selectedKeys={[status]} onSelectionChange={(keys) => { setStatus(String(Array.from(keys)[0] || 'pending')); setPage(1); }}>{Object.entries(statuses).map(([key, label]) => <SelectItem key={key}>{label}</SelectItem>)}</Select>
      <Select label="来源" selectedKeys={[source]} onSelectionChange={(keys) => { setSource(String(Array.from(keys)[0] || 'all')); setPage(1); }}>{[{ id: 'all', name: '全部来源' }, ...Object.entries(sources).map(([id, name]) => ({ id, name }))].map((item) => <SelectItem key={item.id}>{item.name}</SelectItem>)}</Select>
      <Select label="排序" selectedKeys={[sort]} onSelectionChange={(keys) => { setSort(String(Array.from(keys)[0] || 'frequency')); setPage(1); }}><SelectItem key="frequency">问题频次优先</SelectItem><SelectItem key="recent">最近更新优先</SelectItem></Select>
      <Input label="最低出现频次" type="number" min="1" value={minFrequency} onValueChange={(value) => { setMinFrequency(value); setPage(1); }} />
      <Checkbox isSelected={onlyRepeated} onValueChange={(value) => { setOnlyRepeated(value); setPage(1); }}>仅多次出现（至少2次）</Checkbox>
      <Select label="每页条数" selectedKeys={[String(size)]} onSelectionChange={(keys) => { setSize(Number(Array.from(keys)[0] || 20)); setPage(1); }}>{[10, 20, 50, 100].map((value) => <SelectItem key={String(value)}>{value} 条</SelectItem>)}</Select>
    </div>
    <div className="flex flex-wrap items-center gap-2"><Checkbox isSelected={pendingRows.length > 0 && selectedRows.length === pendingRows.length} isIndeterminate={selectedRows.length > 0 && selectedRows.length < pendingRows.length} isDisabled={!pendingRows.length || busy} onValueChange={togglePage}>选择当前页待审</Checkbox><span className="text-sm text-default-500">已选 {selectedRows.length} 条（仅当前页）</span><Button size="sm" color="primary" isDisabled={!canManage || busy || !selectedRows.length} onPress={() => setBatchAction('approve')}>批量批准</Button><Button size="sm" color="danger" variant="flat" isDisabled={!canManage || busy || !selectedRows.length} onPress={() => setBatchAction('reject')}>批量拒绝</Button></div>
    <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); search(); }}><Input label="搜索问题、答案、知识ID或文档ID" className="min-w-60 flex-1" value={input} onValueChange={setInput} /><Input label="答复消息ID" className="w-44" value={messageInput} onValueChange={setMessageInput} /><Button type="submit" color="primary">搜索</Button><Button variant="flat" isLoading={loading} onPress={() => void load()}>刷新</Button></form>
    <div className="flex flex-wrap gap-2"><Button isDisabled={!canManage || busy} onPress={() => { setDetail(null); setDraft({ question: '', answer: '' }); setEditor(true); }}>新增知识</Button><Button isDisabled={!canManage || busy} onPress={() => void run(async () => { if (!window.confirm('仅会安全汇总等价问答；答案冲突的候选将保留人工复核，且不会自动批准。确认继续？')) return; const result = await adminApi.dedupeCsKb(); setNotice(`重复清理完成：检查 ${result.scanned} 条，安全汇总 ${result.merged} 条；答案冲突项保留待人工复核，未自动批准。`); await load(); })}>清理重复待审</Button><Button isDisabled={!canManage || busy} onPress={() => void run(async () => { await csKnowledgeApi.mine({ conversation_ids: selectedConversationIds.length ? selectedConversationIds : undefined, limit: 100 }); setMining(await adminApi.getCsMineProgress()); setNotice('已提交学习任务，只生成待审核候选。'); })}>{selectedConversationIds.length ? '学习已选已结束会话' : '学习历史会话'}</Button><Button variant="light" onPress={() => void adminApi.getCsMineProgress().then(setMining).catch((e) => setError(e.message))}>查看学习进度</Button></div>
    {Object.keys(mining).length > 0 && <details className="rounded border border-divider p-3"><summary>历史学习进度</summary>{records(mining.jobs).map((job, index) => <p key={String(job.id || index)} className="mt-2 text-sm">{String(job.status || '')} · 已处理 {String(job.processed || 0)} / {String(job.limit || 0)} · 候选 {String(job.candidates || 0)}{job.error ? ` · ${String(job.error)}` : ''}</p>)}</details>}
    <Modal isOpen={Boolean(batchAction)} onClose={() => !busy && setBatchAction(null)} isDismissable={!busy}><ModalContent><ModalHeader>确认{batchAction === 'approve' ? '批准' : '拒绝'} {selectedRows.length} 条待审知识</ModalHeader><ModalBody><p>仅处理当前页面已选条目，不处理隐藏页面。</p>{selectedRows.map((row) => <div key={row.id} className="mt-2 rounded border border-divider p-2"><p>#{row.id} · {row.question}</p><p className="line-clamp-3 text-sm">{row.answer}</p></div>)}</ModalBody><ModalFooter><Button isDisabled={busy} onPress={() => setBatchAction(null)}>取消</Button><Button color={batchAction === 'approve' ? 'primary' : 'danger'} isLoading={busy} onPress={executeBatch}>确认执行</Button></ModalFooter></ModalContent></Modal>
    <Card shadow="none" className="border border-divider"><CardBody className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[1060px] text-left text-sm"><thead className="bg-default-100"><tr><th className="px-3 py-3"><Checkbox aria-label="选择当前页全部待审候选" isSelected={pendingRows.length > 0 && selectedRows.length === pendingRows.length} isIndeterminate={selectedRows.length > 0 && selectedRows.length < pendingRows.length} isDisabled={!pendingRows.length || busy} onValueChange={togglePage} /></th>{['ID', '标准问题', '答案预览', '状态', '来源 / 频次', '更新时间', '管理'].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-divider align-top"><td className="px-3 py-3">{row.status === 'pending' && <Checkbox aria-label={`选择待审知识 #${row.id}`} isSelected={Boolean(selected[row.id])} isDisabled={!canManage || busy} onValueChange={(checked) => toggleRow(row, checked)} />}</td><td className="px-3 py-3 text-default-500">#{row.id}</td><td className="max-w-64 px-3 py-3"><p className="line-clamp-3 font-medium">{row.question}</p></td><td className="max-w-80 px-3 py-3"><p className="line-clamp-3 whitespace-pre-wrap text-default-600">{row.answer}</p></td><td className="px-3 py-3"><Chip size="sm" variant="flat" color={row.status === 'pending' ? 'warning' : row.status === 'synced' ? 'success' : row.status === 'error' ? 'danger' : 'default'}>{statuses[row.status] || row.status}</Chip></td><td className="px-3 py-3"><p>{sources[row.source] || row.source}</p><p className="text-xs text-default-400">问题观察到 {row.frequency} 次{row.duplicate_target ? ` · 相似知识 #${row.duplicate_target}` : ''}{row.duplicate_conflict ? ' · 答案冲突待复核' : ''}</p></td><td className="whitespace-nowrap px-3 py-3 text-xs text-default-500">{date(row.updated_at)}</td><td className="px-3 py-3"><div className="flex flex-wrap gap-1"><Button size="sm" variant="light" isDisabled={busy} onPress={() => { setDetail(row); setUsages([]); void refreshDetail(row.id); }}>查看 / 编辑</Button>{row.status === 'pending' && <><Button size="sm" color="primary" isDisabled={!canManage || busy} onPress={() => void act(row, 'approve')}>批准</Button><Button size="sm" color="danger" variant="light" isDisabled={!canManage || busy} onPress={() => void quickReject(row)}>快速拒绝</Button></>}</div></td></tr>)}</tbody></table></div>{loading && <p className="p-3 text-center text-sm" role="status">正在加载知识…</p>}{!rows.length && !loading && <p className="p-8 text-center text-default-500">{messageId ? '该答复没有匹配当前条件的本地知识；引用文档信息见上方。' : '当前筛选没有知识条目。'}</p>}<div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider p-3"><p className="text-sm text-default-500">共 {total} 条 · 第 {page}/{Math.max(1, Math.ceil(total / size))} 页</p><Pagination aria-label="知识分页" page={page} total={Math.max(1, Math.ceil(total / size))} onChange={setPage} isDisabled={loading} /></div></CardBody></Card>
    <Modal isOpen={Boolean(detail) && !editor} onClose={() => { detailVersion.current += 1; setDetail(null); }} size="4xl" scrollBehavior="inside"><ModalContent><ModalHeader>知识 #{detail?.id} · {detail ? statuses[detail.status] : ''}</ModalHeader><ModalBody className="gap-4">{detail && <><section><h3 className="font-semibold">标准问题</h3><p className="mt-1 whitespace-pre-wrap">{detail.question}</p><h3 className="mt-3 font-semibold">完整答复</h3><p className="mt-1 whitespace-pre-wrap text-sm">{detail.answer}</p><p className="mt-2 break-all text-xs text-default-400">版本 {detail.revision} · 文档 {detail.dify_document_id || '尚未发布'} · {date(detail.updated_at)}</p>{Boolean(detail.last_error) && <Alert color="danger" title="同步异常" description={String(detail.last_error)} />}</section><section><h3 className="font-semibold">知识来源与问题变体</h3>{records(detail.evidence).map((item, index) => <div key={index} className="mt-2 rounded border border-divider p-2 text-sm"><p>会话 #{String(item.conversation_id || '—')} · 消息 {String(item.message_ids || item.message_id || '—')}</p>{Array.isArray(item.quotes) && item.quotes.map((quote, i) => <blockquote key={i} className="mt-1 whitespace-pre-wrap border-l-2 pl-2 text-default-500">{String(quote)}</blockquote>)}</div>)}{records(detail.similar_variants).map((item, index) => <details key={index} className="mt-2 text-sm"><summary>{String(item.question || '相似问题')}</summary><p>{String(item.answer || '')}</p></details>)}{detail.conversation_id && onOpenConversation && <Button className="mt-2" size="sm" onPress={() => onOpenConversation(detail.conversation_id!)}>打开原始会话</Button>}</section><section className="space-y-2"><h3 className="font-semibold">引用过这条知识的实际答复（{usageTotal} 条）</h3>{detailLoading && <p>正在读取引用记录…</p>}{usages.map((usage) => <div key={usage.message_id} className="space-y-2 rounded-lg border border-divider p-3"><p className="text-xs text-default-500">消息 #{usage.message_id} · 会话 #{usage.conversation_id} · {disposition[usage.disposition] || usage.disposition} · {date(usage.time)}</p><p className="whitespace-pre-wrap text-sm">{usage.answer}</p><details className="text-xs"><summary>当时引用的知识片段</summary><p className="mt-1 whitespace-pre-wrap">{usage.excerpt || '没有保存引用片段'}</p></details>{onOpenConversation && <Button size="sm" onPress={() => onOpenConversation(usage.conversation_id)}>打开答复会话</Button>}</div>)}{!usages.length && !detailLoading && <p className="text-sm text-default-500">暂无明确引用记录；未保存来源的旧回复不会猜测关联。</p>}{usageTotal > 10 && <Pagination aria-label="引用记录分页" page={usagePage} total={Math.ceil(usageTotal / 10)} onChange={(next) => void refreshDetail(detail.id, next)} />}</section></>}</ModalBody><ModalFooter className="flex-wrap">{detail && <><Button isDisabled={!canManage || busy || detailLoading} onPress={() => { setDraft({ question: detail.question, answer: detail.answer }); setEditor(true); }}>编辑内容</Button>{detail.status === 'pending' && <><Button color="primary" isDisabled={!canManage || busy} onPress={() => void act(detail, 'approve')}>批准</Button><Button isDisabled={!canManage || busy} onPress={() => void act(detail, 'reject')}>拒绝</Button></>}{['approved', 'indexing', 'synced', 'error'].includes(detail.status) && <Button color="danger" variant="flat" isDisabled={!canManage || busy} onPress={() => void act(detail, 'disable')}>停用</Button>}{detail.status === 'error' && <Button isDisabled={!canManage || busy} onPress={() => void act(detail, 'retry')}>重试同步</Button>}<Input className="w-36" size="sm" label="合并目标知识ID" value={mergeTarget} onValueChange={setMergeTarget} /><Button isDisabled={!canManage || busy || !/^[1-9]\d*$/.test(mergeTarget)} onPress={() => void act(detail, 'merge')}>合并</Button></>}<Button variant="light" onPress={() => setDetail(null)}>关闭</Button></ModalFooter></ModalContent></Modal>
    <Modal isOpen={editor} onClose={() => { if (!busy) setEditor(false); }} size="2xl" scrollBehavior="inside"><ModalContent><ModalHeader>{detail ? `编辑知识 #${detail.id}` : '新增待审知识'}</ModalHeader><ModalBody><Input label="标准问题" value={draft.question} onValueChange={(question) => setDraft((value) => ({ ...value, question }))} /><Textarea label="完整答复" minRows={8} value={draft.answer} onValueChange={(answer) => setDraft((value) => ({ ...value, answer }))} /></ModalBody><ModalFooter><Button isDisabled={busy} onPress={() => setEditor(false)}>取消</Button><Button color="primary" isLoading={busy} isDisabled={!canManage || busy || !draft.question.trim() || !draft.answer.trim()} onPress={() => void run(async () => { if (detail) { const result = await csKnowledgeApi.act({ id: detail.id, revision: detail.revision, action: 'edit', ...draft }); setDetail(result.data); } else await csKnowledgeApi.add(draft); setEditor(false); setNotice('内容已保存，需核对审核后才供 AI 使用。'); await load(); })}>保存内容</Button></ModalFooter></ModalContent></Modal>
  </section>;
};
export default CsKnowledgeWorkspace;
