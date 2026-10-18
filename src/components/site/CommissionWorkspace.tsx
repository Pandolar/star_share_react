import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, CardBody, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Pagination, Select, SelectItem, Tab, Tabs, Textarea } from '@heroui/react';
import { Clipboard, Download, RefreshCw } from 'lucide-react';
import siteApi, { siteData } from '../../services/siteApi';
import type { CommissionLedger, CommissionSummary, PageQuery, SiteOrder } from '../../types/site';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { showToast } from '../Toast';

const emptySummary: CommissionSummary = { timezone: 'Asia/Shanghai', period_start: '', period_end: '', as_of: '', distributor_id: null, distributor_name: null, site_id: null, sales_order_count: 0, sales_amount: '0.00', opening_net_commission: '0.00', period_commission: '0.00', period_refund_commission: '0.00', period_refund_amount: '0.00', period_net_commission: '0.00', closing_net_commission: '0.00', lifetime_net_commission: '0.00', reconciliation_text: '' };
const summaryLabels: Record<string, string> = { sales_amount: '本期现金销售额', opening_net_commission: '期初累计净佣金', period_commission: '本期新增佣金', period_refund_commission: '本期佣金冲减', period_net_commission: '本期净佣金', closing_net_commission: '期末累计净佣金', lifetime_net_commission: '截至统计时间累计净佣金', period_refund_amount: '本期登记现金退款' };
const statuses: Record<string, string> = { pending: '待处理', paid: '已支付', failed: '失败', cancelled: '已取消', accrual: '计提', refund: '退款冲减' };
type Section = 'orders' | 'ledger';
interface Props { distributor?: boolean; fixedSiteId?: number; }
const shanghaiMonth = () => { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit' }).formatToParts(new Date()); const year = parts.find((part) => part.type === 'year')?.value || '1970'; const month = parts.find((part) => part.type === 'month')?.value || '01'; return `${year}-${month}`; };

export default function CommissionWorkspace({ distributor = false, fixedSiteId }: Props) {
  const { can } = useAdminAuth();
  const [tab, setTab] = useState<Section>('orders'); const [page, setPage] = useState(1); const [total, setTotal] = useState(0);
  const [owner, setOwner] = useState(''); const [siteId, setSiteId] = useState(''); const [status, setStatus] = useState('');
  const [month, setMonth] = useState(shanghaiMonth); const [fromDate, setFromDate] = useState(''); const [toDate, setToDate] = useState('');
  const [summary, setSummary] = useState<CommissionSummary>(emptySummary); const [orders, setOrders] = useState<SiteOrder[]>([]); const [ledger, setLedger] = useState<CommissionLedger[]>([]);
  const [loading, setLoading] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [refundOpen, setRefundOpen] = useState(false); const [orderId, setOrderId] = useState(''); const [amount, setAmount] = useState(''); const [remark, setRemark] = useState(''); const [requestKey, setRequestKey] = useState('');
  const requestSequence = useRef(0);
  const [loadedScope, setLoadedScope] = useState('');
  const range = useMemo(() => ({ month: fromDate || toDate ? undefined : month, from_date: fromDate || undefined, to_date: toDate || undefined }), [month, fromDate, toDate]);
  const query = useCallback((): PageQuery => ({ ...range, distributor_id: !distributor && owner ? Number(owner) : undefined, site_id: fixedSiteId ?? (siteId ? Number(siteId) : undefined) }), [range, distributor, owner, fixedSiteId, siteId]);
  const scope = JSON.stringify(query());
  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoading(true); setError(''); setLoadedScope(''); setSummary(emptySummary);
    try {
      const filter = query();
      const params = { ...filter, current_page: page, page_size: 20, status: status || undefined };
      const [summaryResponse, listResponse] = await Promise.all([
        siteApi.summary(filter, distributor),
        tab === 'orders' ? siteApi.orders(params, distributor) : siteApi.ledger(params, distributor),
      ]);
      const nextSummary = siteData(summaryResponse);
      if (listResponse.code !== 20000 || !Array.isArray(listResponse.data)) throw new Error(listResponse.msg || '明细加载失败');
      if (requestSequence.current !== sequence) return;
      setSummary(nextSummary); setLoadedScope(JSON.stringify(filter));
      if (tab === 'orders') setOrders(listResponse.data as SiteOrder[]);
      else setLedger(listResponse.data as CommissionLedger[]);
      setTotal(listResponse.total || 0);
    } catch (caught) {
      if (requestSequence.current !== sequence) return;
      setError(caught instanceof Error ? caught.message : '账务数据加载失败');
      setSummary(emptySummary); setOrders([]); setLedger([]); setTotal(0);
    } finally { if (requestSequence.current === sequence) setLoading(false); }
  }, [query, page, status, tab, distributor]);
  useEffect(() => { void load(); return () => { requestSequence.current += 1; }; }, [load]);
  const exportData = async () => {
    setBusy(true);
    try {
      const result: Array<Record<string, unknown>> = [];
      const filter = { ...query(), status: status || undefined };
      let current = 1; let count = Infinity;
      while (result.length < count) {
        const params = { ...filter, current_page: current, page_size: 100 };
        const response = tab === 'orders' ? await siteApi.orders(params, distributor) : await siteApi.ledger(params, distributor);
        if (response.code !== 20000 || !Array.isArray(response.data)) throw new Error(response.msg || '导出失败');
        for (const row of response.data) result.push({ ...row });
        count = response.total ?? result.length;
        if (!response.data.length) break;
        current += 1;
      }
      if (!result.length) { showToast('当前筛选没有数据', 'warning'); return; }
      const columns = Object.keys(result[0]);
      const escape = (value: unknown) => {
        let text = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
        if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
      };
      const csv = [columns.map(escape).join(','), ...result.map((row) => columns.map((column) => escape(row[column])).join(','))].join('\r\n');
      const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = `${tab}-${fromDate ? `${fromDate}_${toDate}` : month}.csv`; link.click(); URL.revokeObjectURL(url);
    } catch (caught) { showToast(caught instanceof Error ? caught.message : '导出失败', 'error'); }
    finally { setBusy(false); }
  };
  const submitRefund = async () => { setBusy(true); try { siteData(await siteApi.registerRefund({ order_id: Number(orderId), refund_amount: amount, request_key: requestKey, remark })); setRefundOpen(false); showToast('退款冲减已登记', 'success'); await load(); } catch (caught) { showToast(caught instanceof Error ? caught.message : '退款登记失败', 'error'); } finally { setBusy(false); } };
  const copySummary = async () => {
    if (loading || error || loadedScope !== scope || !summary.reconciliation_text) return;
    try { await navigator.clipboard.writeText(summary.reconciliation_text); showToast('对账摘要已复制', 'success'); }
    catch { showToast('无法访问剪贴板，请在安全浏览器环境重试', 'error'); }
  };
  const statusOptions = tab === 'orders' ? ['pending', 'paid', 'failed'] : ['accrual', 'refund'];
  return <div className="space-y-5"><Alert color="warning" title="统计不代表已打款，线下转账不清零累计值" description={summary.period_end && Date.parse(summary.period_end) > Date.parse(summary.as_of) ? '统计周期尚未截止，当前显示截至统计时间的临时读数。' : '本期净佣金 = 期末累计净佣金 − 期初累计净佣金；退款按实际登记月份冲减。'} />
    {summary.as_of && <p className="text-xs text-default-500">北京时间区间：{summary.period_start} 至 {summary.period_end}（不含终点）；统计时间：{summary.as_of}</p>}
    <Button variant="flat" startContent={<Clipboard size={16} />} isDisabled={loading || Boolean(error) || loadedScope !== scope || !summary.reconciliation_text} onPress={() => void copySummary()}>复制群聊对账摘要</Button>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(summaryLabels).map(([key, label]) => <Card key={key} shadow="sm"><CardBody className="gap-2 p-4"><p className="text-xs text-default-500">{label}</p><p className="text-xl font-semibold tabular-nums">¥{summary[key as keyof CommissionSummary] as string}</p></CardBody></Card>)}<Card shadow="sm"><CardBody className="gap-2 p-4"><p className="text-xs text-default-500">销售订单数</p><p className="text-xl font-semibold tabular-nums">{summary.sales_order_count}</p></CardBody></Card></div>
    <Card shadow="none"><CardBody className="gap-4 p-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {!distributor && <Input label="代理 ID" type="number" value={owner} onValueChange={(value) => { setOwner(value); setPage(1); }} />}
        {!fixedSiteId && <Input label="站点 ID" type="number" value={siteId} onValueChange={(value) => { setSiteId(value); setPage(1); }} />}
        <Input label="统计月份（北京时间）" type="month" value={month} isDisabled={Boolean(fromDate || toDate)} onValueChange={(value) => { setMonth(value); setPage(1); }} />
        <Input label="开始日期" type="date" value={fromDate} onValueChange={(value) => { setFromDate(value); setPage(1); }} />
        <Input label="结束日期" type="date" value={toDate} onValueChange={(value) => { setToDate(value); setPage(1); }} />
        <Select label="列表状态" selectedKeys={[status || 'all']} onChange={(event) => { setStatus(event.target.value === 'all' ? '' : event.target.value); setPage(1); }}>{['all', ...statusOptions].map((value) => <SelectItem key={value}>{value === 'all' ? '全部' : statuses[value]}</SelectItem>)}</Select>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="flat" startContent={<RefreshCw size={16} />} isLoading={loading} onPress={() => void load()}>刷新</Button>
        {(fromDate || toDate) && <Button variant="light" onPress={() => { setFromDate(''); setToDate(''); setPage(1); }}>恢复按月</Button>}
        <Button variant="flat" startContent={<Download size={16} />} isDisabled={busy || loading || Boolean(error) || loadedScope !== scope} onPress={() => void exportData()}>导出全部筛选结果</Button>
        {!distributor && can('commission.refund') && <Button variant="flat" color="warning" isDisabled={busy} onPress={() => { setRequestKey(crypto.randomUUID()); setOrderId(''); setAmount(''); setRemark(''); setRefundOpen(true); }}>登记已完成退款</Button>}
      </div>
      <p className="text-xs text-default-500">自定义日期需同时填写起止日期。汇总不受明细状态筛选影响；筛选某个站点时，摘要仅代表该站点。</p>
    </CardBody></Card>
    {error && <Alert color="danger" title="数据未加载" description={error} />}<Tabs aria-label="经营账务分类" selectedKey={tab} onSelectionChange={(key) => { setTab(String(key) as Section); setStatus(''); setPage(1); }} variant="underlined"><Tab key="orders" title="销售订单" /><Tab key="ledger" title="佣金流水" /></Tabs><div className="overflow-x-auto rounded-xl border border-default-200"><table className="w-full min-w-[800px] text-left text-sm">{tab === 'orders' ? <><thead className="bg-default-50"><tr><th className="p-3">订单 / 站点</th><th>金额</th><th>佣金</th><th>状态</th><th>支付时间</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-t border-default-100"><td className="p-3"><p className="font-medium">{order.order_id}</p><p className="text-xs text-default-500">记录 #{order.id} · 站点 #{order.site_id} · 代理 #{order.distributor_id}</p></td><td>¥{order.paid_amount}</td><td>¥{order.commission_amount}{order.commission_mode && <p className="text-xs text-default-500">{order.commission_mode === 'margin' ? '差价归代理（等效比例仅供参考）' : `比例分成 ${(Number(order.commission_rate || 0) * 100).toFixed(2)}%`}</p>}</td><td>{statuses[order.status] || order.status}</td><td>{order.paid_at || '-'}</td></tr>)}</tbody></> : <><thead className="bg-default-50"><tr><th className="p-3">记录 / 订单</th><th>类型</th><th>佣金变动</th><th>现金退款</th><th>时间 / 备注</th></tr></thead><tbody>{ledger.map((entry) => <tr key={entry.id} className="border-t border-default-100"><td className="p-3">#{entry.id} / #{entry.order_id}</td><td>{statuses[entry.kind]}</td><td className={Number(entry.amount) < 0 ? 'text-warning-600' : ''}>¥{entry.amount}</td><td>¥{entry.refund_amount}</td><td>{entry.created_at}<p className="text-xs text-default-500">{entry.remark}</p></td></tr>)}</tbody></>}</table></div>{!total && !loading && <p className="py-5 text-center text-default-500">当前筛选暂无记录</p>}<Pagination page={page} total={Math.max(1, Math.ceil(total / 20))} onChange={setPage} />
    <Modal isOpen={refundOpen} onClose={() => !busy && setRefundOpen(false)} isDismissable={!busy}><ModalContent><ModalHeader>登记已完成退款</ModalHeader><ModalBody><Alert color="warning" title="此操作不会向支付渠道退款" description="仅登记已完成的现金退款并冲减佣金；请求幂等键不可重复用于其他金额或订单。" /><Input label="订单记录 ID" type="number" value={orderId} onValueChange={setOrderId} /><Input label="本次现金退款金额" type="number" min="0.01" step="0.01" value={amount} onValueChange={setAmount} /><Textarea label="完成退款的原因 / 凭证（必填）" value={remark} onValueChange={setRemark} maxLength={500} /></ModalBody><ModalFooter><Button variant="flat" isDisabled={busy} onPress={() => setRefundOpen(false)}>返回</Button><Button color="primary" isLoading={busy} isDisabled={!orderId || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || !remark.trim()} onPress={() => void submitRefund()}>确认保存</Button></ModalFooter></ModalContent></Modal>
  </div>;
}
