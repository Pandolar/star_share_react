import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Chip,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  ScrollShadow,
  Spinner,
  Tooltip,
} from '@heroui/react';
import { CircleDollarSign, Mail, ReceiptText, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import adminApiService from '../../services/adminApi';
import type { AdminCsConversation, AdminCsConversationDetail, AdminCsPurchaseOrder } from '../../types/admin';
import { showToast } from '../../components/Toast';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const ORDER_PAGE_SIZE = 8;

const ORDER_TYPE_LABELS: Record<string, string> = {
  initial: '首次购买',
  renewal: '套餐续费',
  upgrade: '套餐升级',
  downgrade: '套餐降级',
  team_initial: '团队首次购买',
  team_change: '团队套餐调整',
  team_renewal: '团队续费',
  surcharge: '客服收款',
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  awaiting_payment: '待支付',
  pending_issue: '待开票',
  processing: '开票中',
  issued: '已开票',
  cancelled: '已取消',
  payment_exception: '支付异常',
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false });
};

export interface PaymentCardPrefill {
  title?: string;
  amount?: string;
  note?: string;
}

export interface CustomerServiceContextPanelProps {
  conversation: AdminCsConversation;
  /** 打开收款卡片弹窗（可带预填金额，例如补开票后的建议补收）。 */
  onOpenPaymentCard: (prefill?: PaymentCardPrefill) => void;
  /** 面板内部触发用户信息弹层（窄屏回退）。 */
  className?: string;
}

/**
 * 客服工作台右侧上下文面板：用户资料、权益、购买记录、补开票与收款卡片入口。
 * 信息密度面向全职客服设计，所有操作就地完成，不打断聊天。
 */
const CustomerServiceContextPanel: React.FC<CustomerServiceContextPanelProps> = ({ conversation, onOpenPaymentCard, className }) => {
  const { can } = useAdminAuth();
  const canCreateInvoice = can('invoice.create');
  const [detail, setDetail] = useState<AdminCsConversationDetail | null>(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<AdminCsPurchaseOrder | null>(null);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async (page: number, silent = false) => {
    const current = ++requestId.current;
    if (!silent) setLoading(true);
    try {
      const data = await adminApiService.getCsConversation(conversation.id, { orders_page: page, orders_page_size: ORDER_PAGE_SIZE });
      if (current !== requestId.current) return;
      setDetail(data);
    } catch (error) {
      if (current === requestId.current && !silent) showToast(error instanceof Error ? error.message : '加载用户信息失败', 'error');
    } finally {
      if (current === requestId.current && !silent) setLoading(false);
    }
  }, [conversation.id]);

  useEffect(() => {
    setDetail(null);
    setOrdersPage(1);
    void load(1);
  }, [load]);

  const user = conversation.user;
  const billing = user.billing;
  const orders = detail?.purchase_history.orders || [];
  const orderPages = Math.max(1, Math.ceil((detail?.purchase_history.total || 0) / ORDER_PAGE_SIZE));

  const openInvoice = (order: AdminCsPurchaseOrder) => {
    setInvoiceOrder(order);
    setInvoiceAmount(order.paid_amount || '');
    setInvoiceEmail(user.profile.email || '');
  };

  const submitInvoice = async () => {
    if (!invoiceOrder) return;
    setInvoiceSaving(true);
    try {
      const created = await adminApiService.createInvoice({
        id: invoiceOrder.id,
        amount: invoiceAmount.trim() || undefined,
        email: invoiceEmail.trim() || undefined,
      });
      showToast('开票信息已补录，进入待开票队列', 'success');
      setInvoiceOrder(null);
      void load(ordersPage, true);
      const surcharge = Number(created.suggested_surcharge);
      if (surcharge > 0) {
        onOpenPaymentCard({
          title: '开票补差价',
          amount: surcharge.toFixed(2),
          note: `订单 ${invoiceOrder.order_id} 补录开票加价`,
        });
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : '补录开票失败', 'error');
    } finally {
      setInvoiceSaving(false);
    }
  };

  return (
    <ScrollShadow className={`min-h-0 overflow-y-auto ${className || ''}`} hideScrollBar>
      <div className="flex flex-col gap-4 p-1">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold"><UserRound className="h-4 w-4" /> 用户资料</h3>
            <Tooltip content="刷新用户信息">
              <Button isIconOnly size="sm" variant="light" aria-label="刷新用户信息" isLoading={loading} onPress={() => void load(ordersPage)}>
                {!loading && <RefreshCw className="h-3.5 w-3.5" />}
              </Button>
            </Tooltip>
          </div>
          <div className="mt-2 space-y-1 text-xs text-default-600">
            <p className="truncate">邮箱：{user.profile.email || '-'}</p>
            <p>用户ID：{user.id} · 状态：{user.profile.status === 1 ? '正常' : '已禁用'}</p>
            <p>注册：{formatDateTime(user.profile.created_at)}</p>
            {user.profile.remarks && <p className="text-warning-600">备注:{user.profile.remarks}</p>}
          </div>
        </div>
        <Divider />
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck className="h-4 w-4" /> 当前权益</h3>
          <div className="mt-2 space-y-1.5">
            {billing.has_entitlement ? billing.entitlements.map((item) => (
              <div key={`${item.name}-${item.expires_at}`} className="rounded-lg bg-default-50 px-2.5 py-1.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{item.name}</span>
                  <Chip size="sm" variant="flat" color={item.source === 'team' ? 'secondary' : 'primary'}>{item.source === 'team' ? '团队' : '个人'}</Chip>
                </div>
                <p className="mt-0.5 text-default-500">到期：{formatDateTime(item.expires_at)}</p>
              </div>
            )) : <p className="text-xs text-default-400">暂无有效权益</p>}
            <p className="text-xs text-default-500">累计支付 {billing.paid_orders} 单 · ¥{billing.paid_amount.toFixed(2)}</p>
          </div>
          <Button
            size="sm"
            color="warning"
            variant="flat"
            className="mt-3 w-full"
            startContent={<CircleDollarSign className="h-4 w-4" />}
            onPress={() => onOpenPaymentCard()}
          >
            发送收款卡片（补差价）
          </Button>
        </div>
        <Divider />
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold"><ReceiptText className="h-4 w-4" /> 购买记录</h3>
          {loading && !detail ? (
            <div className="flex justify-center py-6"><Spinner size="sm" /></div>
          ) : orders.length ? (
            <div className="mt-2 space-y-1.5">
              {orders.map((order) => (
                <div key={order.id} className="rounded-lg bg-default-50 px-2.5 py-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{order.package_name || `订单 ${order.order_id}`}</span>
                    <span className="shrink-0 font-semibold">¥{order.paid_amount || '--'}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2 text-default-500">
                    <span>{ORDER_TYPE_LABELS[order.order_type] || order.order_type}</span>
                    <span>{formatDateTime(order.paid_at || order.created_at)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    {order.invoice_requested ? (
                      <Chip size="sm" variant="flat" color="success">{INVOICE_STATUS_LABELS[order.invoice_status || ''] || '已申请开票'}</Chip>
                    ) : (
                      <span className="text-default-400">未申请开票</span>
                    )}
                    {canCreateInvoice && !order.invoice_requested && (
                      billing.billing_profile?.title ? (
                        <Button size="sm" variant="flat" color="primary" className="h-6 min-w-0 px-2 text-xs" onPress={() => openInvoice(order)}>
                          补开票
                        </Button>
                      ) : (
                        <Tooltip content="需用户先在个人中心完善发票抬头">
                          <span className="text-xs text-default-400">用户未填开票信息</span>
                        </Tooltip>
                      )
                    )}
                  </div>
                </div>
              ))}
              {orderPages > 1 && (
                <Pagination size="sm" page={ordersPage} total={orderPages} onChange={(page) => { setOrdersPage(page); void load(page); }} className="justify-center" />
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs text-default-400">暂无购买记录</p>
          )}
        </div>
      </div>
      <Modal isOpen={Boolean(invoiceOrder)} onOpenChange={(open) => { if (!open && !invoiceSaving) setInvoiceOrder(null); }} size="md" placement="center">
        <ModalContent>
          <ModalHeader>补录开票信息</ModalHeader>
          <ModalBody className="gap-3">
            <p className="text-xs text-default-500">
              订单 {invoiceOrder?.order_id} · 实付 ¥{invoiceOrder?.paid_amount || '--'}；补录后进入「开票管理」待开票队列。
            </p>
            <div className="rounded-lg bg-default-50 px-3 py-2 text-xs">
              <p className="font-medium">用户开票资料（本人填写，不可代改）</p>
              <p className="mt-1 text-default-600">抬头：{detail?.user.billing.billing_profile?.title || '-'}</p>
              <p className="text-default-600">税号：{detail?.user.billing.billing_profile?.tax_number || '（未填写）'}</p>
            </div>
            <Input
              label="开票金额（元）"
              type="number"
              value={invoiceAmount}
              onValueChange={setInvoiceAmount}
              min={0.01}
              step={0.01}
              description="默认按订单实付金额，可手动调整"
              isRequired
            />
            <Input label="接收邮箱" type="email" value={invoiceEmail} onValueChange={setInvoiceEmail} startContent={<Mail className="h-4 w-4 text-default-400" />} />
            <p className="text-xs text-default-400">若需向用户补收开票加价，提交成功后会自动打开收款卡片并预填建议金额。</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" isDisabled={invoiceSaving} onPress={() => setInvoiceOrder(null)}>取消</Button>
            <Button color="primary" isLoading={invoiceSaving} isDisabled={!invoiceAmount.trim() || Number(invoiceAmount) <= 0} onPress={() => void submitInvoice()}>确认补录</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ScrollShadow>
  );
};

export default CustomerServiceContextPanel;
