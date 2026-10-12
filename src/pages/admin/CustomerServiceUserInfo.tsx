import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react';
import { RefreshCw } from 'lucide-react';
import adminApiService from '../../services/adminApi';
import type { AdminCsConversationDetail } from '../../types/admin';

const ORDER_PAGE_SIZE = 10;

const ORDER_TYPE_LABELS: Record<string, string> = {
  initial: '首次购买',
  renewal: '套餐续费',
  upgrade: '套餐升级',
  downgrade: '套餐降级',
  team_initial: '团队首次购买',
  team_change: '团队套餐调整',
  team_renewal: '团队续费',
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

const formatMoney = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '-';
  const amount = Number(value);
  return Number.isFinite(amount) ? `¥${amount.toFixed(2)}` : '-';
};

const profileStatus = (status: number): string => (status === 1 ? '正常' : '已禁用');

export interface Props {
  conversationId: number | null;
  onClose: () => void;
}

export default function CustomerServiceUserInfo({ conversationId, onClose }: Props): React.ReactElement {
  const [loadedDetail, setDetail] = useState<AdminCsConversationDetail | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const activeConversationId = useRef<number | null>(null);
  const detail = loadedDetail?.id === conversationId ? loadedDetail : null;

  useEffect(() => {
    if (conversationId === null) {
      activeConversationId.current = null;
      setDetail(null);
      setLoading(false);
      setError(null);
      setPage(1);
      return;
    }

    const isConversationChange = activeConversationId.current !== conversationId;
    activeConversationId.current = conversationId;
    if (isConversationChange && page !== 1) {
      setDetail(null);
      setError(null);
      setPage(1);
      return;
    }

    let cancelled = false;
    if (isConversationChange) setDetail(null);
    setLoading(true);
    setError(null);

    void adminApiService.getCsConversation(conversationId, { orders_page: page, orders_page_size: ORDER_PAGE_SIZE })
      .then((result) => {
        if (cancelled || activeConversationId.current !== conversationId) return;
        setDetail(result);
      })
      .catch((requestError: unknown) => {
        if (cancelled || activeConversationId.current !== conversationId) return;
        setError(requestError instanceof Error ? requestError.message : '获取用户资料失败');
      })
      .finally(() => {
        if (!cancelled && activeConversationId.current === conversationId) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, page, retry]);

  const purchaseHistory = detail?.purchase_history;
  const totalOrders = purchaseHistory?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalOrders / ORDER_PAGE_SIZE));
  const entitlements = detail?.user.billing.entitlements ?? [];

  return (
    <Modal
      isOpen={conversationId !== null}
      onClose={onClose}
      size="4xl"
      scrollBehavior="inside"
      classNames={{ base: 'max-h-[92vh] sm:max-h-[94vh]' }}
    >
      <ModalContent>
        <ModalHeader>用户资料与购买记录</ModalHeader>
        <ModalBody className="gap-5">
          {loading && !detail ? (
            <div className="flex min-h-64 items-center justify-center"><Spinner label="加载用户资料中..." /></div>
          ) : error && !detail ? (
            <Alert
              color="danger"
              title="用户资料加载失败"
              description={error}
              endContent={<Button size="sm" variant="flat" startContent={<RefreshCw className="h-4 w-4" />} onPress={() => setRetry((value) => value + 1)}>重试</Button>}
            />
          ) : detail ? <>
            {error && <Alert color="danger" title="购买记录刷新失败" description={error} endContent={<Button size="sm" variant="flat" onPress={() => setRetry((value) => value + 1)}>重试</Button>} />}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">账号资料</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card shadow="none" className="border border-divider"><CardBody className="gap-1 p-3"><span className="text-xs text-default-500">用户名</span><span className="break-all text-sm font-medium">{detail.user.profile.username || '-'}</span></CardBody></Card>
                <Card shadow="none" className="border border-divider"><CardBody className="gap-1 p-3"><span className="text-xs text-default-500">邮箱</span><span className="break-all text-sm font-medium">{detail.user.profile.email || '-'}</span></CardBody></Card>
                <Card shadow="none" className="border border-divider"><CardBody className="gap-1 p-3"><span className="text-xs text-default-500">账号状态</span><span className="text-sm font-medium">{profileStatus(detail.user.profile.status)}</span></CardBody></Card>
                <Card shadow="none" className="border border-divider"><CardBody className="gap-1 p-3"><span className="text-xs text-default-500">注册时间</span><span className="text-sm font-medium">{formatDateTime(detail.user.profile.created_at)}</span></CardBody></Card>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-medium bg-default-50 p-3 text-sm"><span className="text-default-500">累计购买</span><p className="mt-1 font-medium">{detail.user.billing.paid_orders} 笔 / {formatMoney(detail.user.billing.paid_amount)}</p></div>
                <div className="rounded-medium bg-default-50 p-3 text-sm"><span className="text-default-500">用户备注（内部可见）</span><p className="mt-1 whitespace-pre-wrap break-words">{detail.user.profile.remarks || '未填写'}</p></div>
              </div>
            </section>

            <Divider />

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">当前套餐</h3>
              {entitlements.length === 0 ? <p className="text-sm text-default-500">暂无有效套餐</p> : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {entitlements.map((item, index) => (
                    <Card key={`${item.name}-${item.source}-${item.expires_at}-${index}`} shadow="none" className="border border-divider">
                      <CardBody className="gap-2 p-3">
                        <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{item.name}</span><Chip size="sm" color={item.source === 'team' ? 'secondary' : 'primary'} variant="flat">{item.source === 'team' ? '团队套餐' : '个人套餐'}</Chip></div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-default-600"><span>级别：{item.level || '-'}</span><span>到期：{formatDateTime(item.expires_at)}</span></div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <Divider />

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">历史购买订单</h3><span className="text-sm text-default-500">共 {totalOrders} 笔</span></div>
              <Table aria-label="历史购买订单" classNames={{ wrapper: 'overflow-x-auto', table: 'min-w-[760px]' }}>
                <TableHeader><TableColumn>订单</TableColumn><TableColumn>套餐 / 类型</TableColumn><TableColumn>现金实付</TableColumn><TableColumn>返利抵扣</TableColumn><TableColumn>支付时间</TableColumn></TableHeader>
                <TableBody isLoading={loading} loadingContent={<Spinner label="加载订单中..." />} emptyContent={error ? '本页订单加载失败，请重试' : '暂无历史购买订单'}>
                  {(purchaseHistory?.current_page === page ? purchaseHistory.orders : []).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell><span className="font-mono text-xs">{order.order_id}</span></TableCell>
                      <TableCell><div className="space-y-1"><p className="text-sm">{order.package_name || '未关联套餐'}</p><p className="text-xs text-default-500">{ORDER_TYPE_LABELS[order.order_type] || '套餐购买'}</p></div></TableCell>
                      <TableCell>{formatMoney(order.paid_amount)}</TableCell>
                      <TableCell>{formatMoney(order.cashback_credit_amount)}</TableCell>
                      <TableCell><div className="text-xs"><p>支付：{formatDateTime(order.paid_at)}</p><p className="text-default-500">创建：{formatDateTime(order.created_at)}</p></div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><span className="text-sm text-default-500">第 {page} / {totalPages} 页</span><Pagination page={page} total={totalPages} showControls onChange={setPage} /></div>}
            </section>
          </> : null}
        </ModalBody>
        <ModalFooter><Button variant="light" onPress={onClose}>关闭</Button></ModalFooter>
      </ModalContent>
    </Modal>
  );
}
