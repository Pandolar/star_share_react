import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, Chip, Input, Pagination, Select, SelectItem,
  Spinner, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@heroui/react';
import { Download, FileText, RefreshCw, Search } from 'lucide-react';
import adminApiService from '../../services/adminApi';
import type { InvoiceQueryParams, InvoiceRecord } from '../../types/admin';
import { showToast } from '../../components/Toast';

const statusLabels: Record<string, string> = {
  awaiting_payment: '待支付',
  pending_issue: '待开票',
  issued: '已开票',
  cancelled: '已取消',
  payment_exception: '异常到账',
};

const InvoicesManagePage: React.FC = () => {
  const [rows, setRows] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('pending_issue');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const queryParams = useCallback((): InvoiceQueryParams => ({
    current_page: page,
    page_size: pageSize,
    ...(query ? { querystring: query } : {}),
    ...(status !== 'all' ? { invoice_status: status } : {}),
  }), [page, query, status]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApiService.getInvoices(queryParams());
      if (response.code === 20000) {
        setRows(Array.isArray(response.data) ? response.data : []);
        setTotal(Number(response.total) || 0);
      } else {
        showToast(response.msg || '获取开票订单失败', 'error');
      }
    } catch {
      showToast('获取开票订单失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => { load(); }, [load]);

  const markIssued = async (record: InvoiceRecord) => {
    if (!window.confirm(`确认订单 ${record.order_id} 已完成开票并发送？`)) return;
    const response = await adminApiService.markInvoiceIssued(record.id);
    if (response.code === 20000) {
      showToast('已标记为开票完成', 'success');
      load();
    } else {
      showToast(response.msg || '更新开票状态失败', 'error');
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await adminApiService.exportInvoices({
        ...(query ? { querystring: query } : {}),
        ...(status !== 'all' ? { invoice_status: status } : {}),
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText className="w-7 h-7 text-primary" />
          <div><h1 className="text-2xl font-bold">开票管理</h1><p className="text-sm text-default-500">处理已支付的开票申请并导出财务明细</p></div>
        </div>
        <Button startContent={<Download size={16} />} onPress={exportCsv} isLoading={exporting}>导出当前筛选</Button>
      </div>

      <Card><CardBody className="flex flex-col sm:flex-row gap-3">
        <Input
          value={queryInput}
          onValueChange={setQueryInput}
          onKeyDown={(event) => { if (event.key === 'Enter') { setPage(1); setQuery(queryInput.trim()); } }}
          placeholder="搜索订单号、用户名、邮箱、抬头或税号"
          startContent={<Search size={16} />}
        />
        <Select className="sm:max-w-44" selectedKeys={[status]} onSelectionChange={(keys) => { setStatus(String(Array.from(keys)[0] || 'all')); setPage(1); }}>
          <SelectItem key="all">全部开票状态</SelectItem>
          <SelectItem key="awaiting_payment">待支付</SelectItem>
          <SelectItem key="pending_issue">待开票</SelectItem>
          <SelectItem key="issued">已开票</SelectItem>
          <SelectItem key="cancelled">已取消</SelectItem>
          <SelectItem key="payment_exception">异常到账</SelectItem>
        </Select>
        <Button color="primary" onPress={() => { setPage(1); setQuery(queryInput.trim()); }}>搜索</Button>
        <Button isIconOnly variant="flat" onPress={load} aria-label="刷新"><RefreshCw size={16} /></Button>
      </CardBody></Card>

      <Table aria-label="开票订单列表">
        <TableHeader>
          <TableColumn>订单 / 用户</TableColumn><TableColumn>开票主体</TableColumn><TableColumn>金额</TableColumn>
          <TableColumn>状态</TableColumn><TableColumn>时间</TableColumn><TableColumn>操作</TableColumn>
        </TableHeader>
        <TableBody emptyContent="没有符合条件的开票订单" isLoading={loading} loadingContent={<Spinner />}>
          {rows.map((record) => (
            <TableRow key={record.id}>
              <TableCell><div className="space-y-1"><code className="text-xs">{record.order_id}</code><p className="text-xs text-default-500">#{record.user_id} {record.user_email}</p><p className="text-xs">{record.package_name}</p></div></TableCell>
              <TableCell><div className="space-y-1"><p>{record.title}</p><code className="text-xs text-default-500">{record.tax_number}</code></div></TableCell>
              <TableCell><div className="space-y-1 text-sm"><p>实付 ¥{record.paid_amount || record.payable_amount}</p><p className="text-default-500">套餐原价 ¥{record.base_amount}</p>{Number(record.discount_amount || 0) > 0 && <p className="text-success">优惠码 {record.promotion_code}：-¥{Number(record.discount_amount).toFixed(2)}</p>}{Number(record.discount_amount || 0) > 0 && <p className="text-default-500">优惠后 ¥{Number(record.invoice_base_amount || 0).toFixed(2)}</p>}<p className="text-primary">开票价 ¥{record.payable_amount}</p></div></TableCell>
              <TableCell><Chip size="sm" color={record.invoice_status === 'issued' ? 'success' : record.invoice_status === 'pending_issue' ? 'warning' : 'default'} variant="flat">{statusLabels[record.invoice_status]}</Chip></TableCell>
              <TableCell><div className="text-xs"><p>支付：{record.paid_at || '-'}</p><p>开票：{record.invoice_issued_at || '-'}</p>{record.invoice_status_history?.length ? <p className="text-default-500">最近流转：{record.invoice_status_history[record.invoice_status_history.length - 1].at}</p> : null}</div></TableCell>
              <TableCell>{record.invoice_status === 'pending_issue' && record.order_status === 'paid' ? <Button size="sm" color="success" onPress={() => markIssued(record)}>标记已开票</Button> : '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {total > pageSize && <div className="flex justify-center"><Pagination page={page} total={Math.ceil(total / pageSize)} onChange={setPage} showControls /></div>}
    </div>
  );
};

export default InvoicesManagePage;
