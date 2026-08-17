import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Card, CardBody, Checkbox, Chip, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Pagination, Select, SelectItem, Spinner, Table, TableBody,
  TableCell, TableColumn, TableHeader, TableRow, Textarea, useDisclosure,
} from '@heroui/react';
import { Copy, Download, FileText, PlayCircle, RefreshCw, Search } from 'lucide-react';
import adminApiService from '../../services/adminApi';
import type { InvoiceQueryParams, InvoiceRecord } from '../../types/admin';
import { showToast } from '../../components/Toast';

const statusLabels: Record<string, string> = {
  awaiting_payment: '待支付',
  pending_issue: '待开票',
  processing: '开票中',
  issued: '已开票',
  cancelled: '已取消',
  payment_exception: '异常到账',
};


const parseCsvRows = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(cell);
      cell = '';
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    if (row.some((value) => value !== '')) rows.push(row);
  }
  return rows;
};

const invoiceSummaryFromCsv = (csv: string): string => {
  const [headers = [], ...records] = parseCsvRows(csv);
  const titleIndex = headers.indexOf('发票抬头');
  const taxNumberIndex = headers.indexOf('税号');
  const amountIndex = headers.indexOf('实付金额');
  if ([titleIndex, taxNumberIndex, amountIndex].some((index) => index < 0)) return '';
  return records.map((record) => (
    `抬头：${record[titleIndex] || '-'}，税号：${record[taxNumberIndex] || '-'}，金额：${record[amountIndex] || '-'}`
  )).join('\n');
};


const InvoicesManagePage: React.FC = () => {
  const [rows, setRows] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copying, setCopying] = useState(false);
  const [batchUpdating, setBatchUpdating] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('pending_issue');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [selectedRows, setSelectedRows] = useState<Map<number, InvoiceRecord>>(new Map());
  const [csvPreview, setCsvPreview] = useState('');
  const [invoiceSummaryPreview, setInvoiceSummaryPreview] = useState('');
  const copyModal = useDisclosure();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const selectedOnPage = rows.reduce((count, row) => count + Number(selectedRows.has(row.id)), 0);
  const allOnPageSelected = rows.length > 0 && selectedOnPage === rows.length;
  const someOnPageSelected = selectedOnPage > 0 && !allOnPageSelected;
  const selectedIds = useMemo(() => Array.from(selectedRows.keys()), [selectedRows]);
  const processableSelectedIds = useMemo(() => Array.from(selectedRows.values())
    .filter((record) => record.order_status === 'paid' && record.invoice_status === 'pending_issue')
    .map((record) => record.id), [selectedRows]);
  const issuableSelectedIds = useMemo(() => Array.from(selectedRows.values())
    .filter((record) => record.order_status === 'paid' && record.invoice_status === 'processing')
    .map((record) => record.id), [selectedRows]);

  const queryParams = useCallback((): InvoiceQueryParams => ({
    current_page: page,
    page_size: pageSize,
    ...(query ? { querystring: query } : {}),
    ...(status !== 'all' ? { invoice_status: status } : {}),
  }), [page, pageSize, query, status]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApiService.getInvoices(queryParams());
      if (response.code !== 20000) throw new Error(response.msg || '获取开票订单失败');
      const list = Array.isArray(response.data) ? response.data : [];
      const nextTotal = Number(response.total) || 0;
      const nextPages = Math.max(1, Math.ceil(nextTotal / pageSize));
      setRows(list);
      setTotal(nextTotal);
      if (page > nextPages) setPage(nextPages);
    } catch (error) {
      setRows([]);
      setTotal(0);
      showToast(error instanceof Error ? error.message : '获取开票订单失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, queryParams]);

  useEffect(() => { void load(); }, [load]);

  const applySearch = () => {
    setSelectedRows(new Map());
    const next = queryInput.trim();
    if (page === 1 && query === next) void load();
    else { setPage(1); setQuery(next); }
  };

  const togglePage = (selected: boolean) => setSelectedRows((current) => {
    const next = new Map(current);
    rows.forEach((row) => selected ? next.set(row.id, row) : next.delete(row.id));
    return next;
  });
  const toggleRow = (row: InvoiceRecord, selected: boolean) => setSelectedRows((current) => {
    const next = new Map(current);
    if (selected) next.set(row.id, row); else next.delete(row.id);
    return next;
  });

  const updateStatus = async (record: InvoiceRecord, target: 'processing' | 'issued') => {
    setUpdatingId(record.id);
    try {
      const response = await adminApiService.updateInvoiceStatus(record.id, target);
      if (response.code !== 20000) throw new Error(response.msg || '更新开票状态失败');
      showToast(target === 'processing' ? '已标记为开票中' : '已标记为已开票', 'success');
      setSelectedRows((current) => { const next = new Map(current); next.delete(record.id); return next; });
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '更新开票状态失败', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const batchStartProcessing = async () => {
    if (!processableSelectedIds.length) {
      showToast('请先选择待开票的已支付订单', 'warning');
      return;
    }
    setBatchUpdating(true);
    try {
      const response = await adminApiService.updateInvoiceStatuses(processableSelectedIds, 'processing');
      if (response.code !== 20000) throw new Error(response.msg || '批量开始开票失败');
      const updatedCount = Number(response.data?.updated_count) || processableSelectedIds.length;
      showToast(`已将 ${updatedCount} 条订单标记为开票中`, 'success');
      setSelectedRows((current) => {
        const next = new Map(current);
        processableSelectedIds.forEach((id) => next.delete(id));
        return next;
      });
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '批量开始开票失败', 'error');
    } finally {
      setBatchUpdating(false);
    }
  };
  const batchMarkIssued = async () => {
    if (!issuableSelectedIds.length) {
      showToast('请先选择开票中的已支付订单', 'warning');
      return;
    }
    setBatchUpdating(true);
    try {
      const response = await adminApiService.updateInvoiceStatuses(issuableSelectedIds, 'issued');
      if (response.code !== 20000) throw new Error(response.msg || '批量标记已开票失败');
      const updatedCount = Number(response.data?.updated_count) || issuableSelectedIds.length;
      showToast(`已将 ${updatedCount} 条订单标记为已开票`, 'success');
      setSelectedRows((current) => {
        const next = new Map(current);
        issuableSelectedIds.forEach((id) => next.delete(id));
        return next;
      });
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '批量标记已开票失败', 'error');
    } finally {
      setBatchUpdating(false);
    }
  };


  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await adminApiService.exportInvoices({
        ...(query ? { querystring: query } : {}),
        ...(status !== 'all' ? { invoice_status: status } : {}),
        ...(selectedIds.length ? { ids: selectedIds.join(',') } : {}),
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `invoice-orders-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('导出开票订单失败', 'error');
    } finally {
      setExporting(false);
    }
  };

  const openCopy = async () => {
    setCopying(true);
    try {
      const blob = await adminApiService.exportInvoices({
        ...(query ? { querystring: query } : {}),
        ...(status !== 'all' ? { invoice_status: status } : {}),
        ...(selectedIds.length ? { ids: selectedIds.join(',') } : {}),
      });
      if (!blob.size) { showToast('没有可复制的开票记录', 'warning'); return; }
      const csvText = await blob.text();
      setCsvPreview(csvText);
      setInvoiceSummaryPreview(invoiceSummaryFromCsv(csvText));
      copyModal.onOpen();
    } catch {
      showToast('生成复制文本失败', 'error');
    } finally {
      setCopying(false);
    }
  };

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage, 'success');
    } catch {
      showToast('复制失败，请在编辑框中手动复制', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-primary" />
          <div><h1 className="text-2xl font-bold">开票管理</h1><p className="text-sm text-default-500">处理开票申请，并按筛选或选中记录导出财务明细</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button color="primary" variant="flat" startContent={<PlayCircle size={16} />} onPress={batchStartProcessing} isLoading={batchUpdating} isDisabled={!processableSelectedIds.length}>批量开始开票{processableSelectedIds.length ? `（${processableSelectedIds.length}）` : ''}</Button>
          <Button color="success" variant="flat" onPress={batchMarkIssued} isLoading={batchUpdating} isDisabled={!issuableSelectedIds.length}>批量标记已开票{issuableSelectedIds.length ? `（${issuableSelectedIds.length}）` : ''}</Button>
          <Button startContent={<Copy size={16} />} onPress={openCopy} isLoading={copying}>复制文本{selectedIds.length ? `（${selectedIds.length}）` : ''}</Button>
          <Button startContent={<Download size={16} />} onPress={exportCsv} isLoading={exporting}>导出{selectedIds.length ? `选中 ${selectedIds.length} 条` : '当前筛选'}</Button>
        </div>
      </div>

      <Card><CardBody className="flex flex-col gap-3 sm:flex-row">
        <Input value={queryInput} onValueChange={setQueryInput} onKeyDown={(event) => event.key === 'Enter' && applySearch()} placeholder="搜索订单号、用户名、邮箱、抬头或税号" startContent={<Search size={16} />} />
        <Select className="sm:max-w-44" selectedKeys={[status]} onSelectionChange={(keys) => { setStatus(String(Array.from(keys)[0] || 'all')); setPage(1); setSelectedRows(new Map()); }} aria-label="开票状态">
          <SelectItem key="all">全部开票状态</SelectItem><SelectItem key="awaiting_payment">待支付</SelectItem>
          <SelectItem key="pending_issue">待开票</SelectItem><SelectItem key="processing">开票中</SelectItem>
          <SelectItem key="issued">已开票</SelectItem><SelectItem key="cancelled">已取消</SelectItem>
          <SelectItem key="payment_exception">异常到账</SelectItem>
        </Select>
        <Button color="primary" onPress={applySearch}>搜索</Button>
        <Button isIconOnly variant="flat" onPress={load} aria-label="刷新"><RefreshCw size={16} /></Button>
      </CardBody></Card>

      <div className="flex items-center gap-2 text-sm text-default-600">
        <span>共 {total} 条</span>{selectedIds.length > 0 && <Chip color="primary" variant="flat" size="sm">已选 {selectedIds.length} 条</Chip>}
      </div>

      <Table aria-label="开票订单列表" classNames={{ wrapper: 'overflow-x-auto', table: 'min-w-[1120px]' }}>
        <TableHeader>
          <TableColumn width={56}><Checkbox aria-label="选择当前页全部开票记录" isSelected={allOnPageSelected} isIndeterminate={someOnPageSelected} onValueChange={togglePage} /></TableColumn>
          <TableColumn>订单 / 用户</TableColumn><TableColumn>开票主体</TableColumn><TableColumn>金额</TableColumn>
          <TableColumn>状态</TableColumn><TableColumn>时间</TableColumn><TableColumn>操作</TableColumn>
        </TableHeader>
        <TableBody emptyContent="没有符合条件的开票订单" isLoading={loading} loadingContent={<Spinner />}>
          {rows.map((record) => (
            <TableRow key={record.id}>
              <TableCell><Checkbox aria-label={`选择开票记录 ${record.order_id}`} isSelected={selectedRows.has(record.id)} onValueChange={(selected) => toggleRow(record, selected)} /></TableCell>
              <TableCell><div className="space-y-1"><code className="text-xs">{record.order_id}</code><p className="text-xs text-default-500">#{record.user_id} {record.user_email}</p><div className="flex flex-wrap items-center gap-1"><p className="text-xs">{record.package_name}</p>{record.pricing_type === 'team' && <Chip size="sm" color="secondary" variant="flat">团队 #{record.team_id}</Chip>}</div></div></TableCell>
              <TableCell><div className="space-y-1"><p>{record.title}</p><code className="text-xs text-default-500">{record.tax_number}</code></div></TableCell>
              <TableCell><div className="space-y-1 text-sm"><p>实付 ¥{record.paid_amount || record.payable_amount}</p><p className="text-default-500">{record.pricing_type === 'team' ? '席位原价' : '套餐原价'} ¥{record.original_amount ?? record.base_amount}</p>{Number(record.discount_amount || 0) > 0 && <p className="text-success">{record.pricing_type === 'team' ? '团队折扣' : `优惠码 ${record.promotion_code || ''}`}：-¥{Number(record.discount_amount).toFixed(2)}</p>}{Number(record.discount_amount || 0) > 0 && <p className="text-default-500">折后金额 ¥{Number(record.invoice_base_amount || 0).toFixed(2)}</p>}<p className="text-primary">开票价 ¥{record.payable_amount}</p></div></TableCell>
              <TableCell><Chip size="sm" color={record.invoice_status === 'issued' ? 'success' : record.invoice_status === 'processing' ? 'primary' : record.invoice_status === 'pending_issue' ? 'warning' : 'default'} variant="flat">{statusLabels[record.invoice_status]}</Chip></TableCell>
              <TableCell><div className="text-xs"><p>支付：{record.paid_at || '-'}</p><p>开票：{record.invoice_issued_at || '-'}</p>{record.invoice_status_history?.length ? <p className="text-default-500">最近流转：{record.invoice_status_history.at(-1)?.at}</p> : null}</div></TableCell>
              <TableCell>{record.order_status === 'paid' && record.invoice_status === 'pending_issue' ? <Button size="sm" color="primary" variant="flat" isLoading={updatingId === record.id} onPress={() => updateStatus(record, 'processing')}>开始开票</Button> : record.order_status === 'paid' && record.invoice_status === 'processing' ? <Button size="sm" color="success" isLoading={updatingId === record.id} onPress={() => updateStatus(record, 'issued')}>标记已开票</Button> : '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-default-600"><span>每页</span><Select aria-label="每页数量" selectedKeys={[String(pageSize)]} onSelectionChange={(keys) => { setPageSize(Number(Array.from(keys)[0] || 20)); setPage(1); }} className="w-24"><SelectItem key="10">10</SelectItem><SelectItem key="20">20</SelectItem><SelectItem key="50">50</SelectItem><SelectItem key="100">100</SelectItem></Select><span>条，共 {total} 条</span></div>
        <Pagination page={page} total={totalPages} onChange={setPage} showControls color="primary" />
      </div>

      <Modal isOpen={copyModal.isOpen} onClose={copyModal.onClose} size="4xl" scrollBehavior="inside">
        <ModalContent><ModalHeader>开票记录 CSV 文本</ModalHeader><ModalBody className="space-y-4"><div className="space-y-2"><p className="text-sm text-default-500">内容与导出 CSV 的列顺序一致，可手动选择复制，也可点击底部按钮复制。</p><Textarea aria-label="开票记录 CSV 文本内容" value={csvPreview} onValueChange={setCsvPreview} minRows={12} className="font-mono" /></div><div className="space-y-2"><p className="text-sm text-default-500">开票信息简版，每条记录一行。</p><Textarea aria-label="开票信息简版文本" value={invoiceSummaryPreview} onValueChange={setInvoiceSummaryPreview} minRows={8} /></div></ModalBody><ModalFooter><Button variant="light" onPress={copyModal.onClose}>关闭</Button><Button variant="flat" startContent={<Copy size={16} />} onPress={() => copyText(csvPreview, 'CSV文本已复制')}>复制 CSV</Button><Button color="primary" startContent={<Copy size={16} />} onPress={() => copyText(invoiceSummaryPreview, '开票信息简版已复制')}>复制开票信息</Button></ModalFooter></ModalContent>
      </Modal>
    </div>
  );
};

export default InvoicesManagePage;
