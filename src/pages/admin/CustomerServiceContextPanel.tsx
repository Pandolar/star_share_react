import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Checkbox,
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
  Textarea,
  Tooltip,
} from '@heroui/react';
import { CircleDollarSign, Mail, Pencil, ReceiptText, RefreshCw, ShieldCheck, StickyNote, UserRound } from 'lucide-react';
import adminApiService from '../../services/adminApi';
import type { AdminCsConversation, AdminCsConversationDetail } from '../../types/admin';
import { showToast } from '../../components/Toast';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { IdentityAvatar } from '../../components/identity/IdentityAvatar';

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
  /** 打开收款卡片弹窗（可带预填金额）。 */
  onOpenPaymentCard: (prefill?: PaymentCardPrefill) => void;
  /** 保存用户备注（仅内部可见，同一用户所有会话共用）。 */
  onUpdateUserRemark: (remark: string) => Promise<void>;
  /** 发送站内消息后刷新聊天区（发送开票资料指引用）。 */
  onRefreshMessages?: () => void;
  className?: string;
}

/**
 * 客服工作台右侧上下文面板：用户资料与备注、权益、购买记录、补开发票与收款卡片入口。
 * 信息密度面向全职客服设计，高频操作就地完成，不打断聊天。
 */
const CustomerServiceContextPanel: React.FC<CustomerServiceContextPanelProps> = ({ conversation, onOpenPaymentCard, onUpdateUserRemark, onRefreshMessages, className }) => {
  const { can } = useAdminAuth();
  const canCreateInvoice = can('invoice.create');
  const canEditRemark = can('customer_service.conversation.manage');
  const [detail, setDetail] = useState<AdminCsConversationDetail | null>(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [remarkEditing, setRemarkEditing] = useState(false);
  const [remarkDraft, setRemarkDraft] = useState('');
  const [remarkSaving, setRemarkSaving] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [invoiceNotice, setInvoiceNotice] = useState(true);
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [guideSending, setGuideSending] = useState(false);
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
    setRemarkEditing(false);
    void load(1);
  }, [load]);

  const user = conversation.user;
  const billing = user.billing;
  const orders = detail?.purchase_history.orders || [];
  const orderPages = Math.max(1, Math.ceil((detail?.purchase_history.total || 0) / ORDER_PAGE_SIZE));

  const startRemarkEdit = () => {
    setRemarkDraft(user.profile.remarks || '');
    setRemarkEditing(true);
  };

  const saveRemark = async () => {
    if (remarkSaving) return;
    setRemarkSaving(true);
    try {
      await onUpdateUserRemark(remarkDraft.trim());
      setRemarkEditing(false);
    } finally {
      setRemarkSaving(false);
    }
  };

  const openInvoice = () => {
    setInvoiceAmount('');
    setInvoiceEmail(user.profile.email || '');
    setInvoiceNotice(true);
    setInvoiceOpen(true);
  };

  // 用户没填开票资料时，不再只给灰色按钮：一键把填写指引发到会话里，附直达深链。
  const sendInvoiceGuide = async () => {
    if (guideSending) return;
    setGuideSending(true);
    try {
      const link = `${window.location.origin}/user-center?tab=profile&openEdit=billing_profile`;
      await adminApiService.sendCsMessage({
        conversation_id: conversation.id,
        content: `您好，开具发票需要您先填写开票信息（发票抬头和税号）。\n请点击链接直接填写：${link}\n也可以在「个人主页 → 账号管理 → 开票主体」里填写。填好后回复我，我马上为您补开发票。`,
        attachment_ids: [],
      });
      showToast('已把开票资料填写指引发送给用户', 'success');
      onRefreshMessages?.();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '发送指引失败', 'error');
    } finally {
      setGuideSending(false);
    }
  };

  const submitInvoice = async () => {
    if (invoiceSaving) return;
    setInvoiceSaving(true);
    try {
      const result = await adminApiService.createManualInvoice({
        user_id: user.id,
        amount: invoiceAmount.trim(),
        email: invoiceEmail.trim() || undefined,
        send_notice: invoiceNotice,
      });
      showToast(result.notice_sent ? '开票信息已补录，并已提示用户' : '开票信息已补录，进入待开票队列', 'success');
      setInvoiceOpen(false);
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
          <div className="mt-2 flex items-start gap-2">
            <IdentityAvatar userId={user.id} name={user.profile.username || user.profile.email || undefined} size={40} />
            <div className="min-w-0 flex-1 space-y-1 text-xs text-default-600">
            <p className="truncate">邮箱：{user.profile.email || '-'}</p>
            <p>用户ID：{user.id} · 状态：{user.profile.status === 1 ? '正常' : '已禁用'}</p>
            <p>注册：{formatDateTime(user.profile.created_at)}</p>
            </div>
          </div>
          <div className="mt-2 rounded-lg bg-default-50 px-2.5 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1 text-xs font-medium text-default-600"><StickyNote className="h-3.5 w-3.5" /> 用户备注（仅内部可见）</p>
              {canEditRemark && !remarkEditing && (
                <Button isIconOnly size="sm" variant="light" aria-label="编辑用户备注" className="h-5 w-5 min-w-0" onPress={startRemarkEdit}>
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
            {remarkEditing ? (
              <div className="mt-1.5 space-y-1.5">
                <Textarea size="sm" minRows={2} maxRows={5} maxLength={255} value={remarkDraft} onValueChange={setRemarkDraft} isDisabled={remarkSaving} aria-label="用户备注" />
                <div className="flex justify-end gap-1.5">
                  <Button size="sm" variant="light" className="h-6 min-w-0 px-2 text-xs" isDisabled={remarkSaving} onPress={() => setRemarkEditing(false)}>取消</Button>
                  <Button size="sm" color="primary" className="h-6 min-w-0 px-2 text-xs" isLoading={remarkSaving} onPress={() => void saveRemark()}>保存</Button>
                </div>
              </div>
            ) : (
              <p
                title={canEditRemark ? '双击编辑备注' : undefined}
                onDoubleClick={() => { if (canEditRemark && !remarkEditing && !remarkSaving) startRemarkEdit(); }}
                className={`mt-1 whitespace-pre-wrap break-words text-xs ${canEditRemark ? 'cursor-text' : ''} ${user.profile.remarks ? 'text-warning-600' : 'text-default-400'}`}
              >
                {user.profile.remarks || (canEditRemark ? '暂无备注（双击添加）' : '暂无备注')}
              </p>
            )}
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
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              size="sm"
              color="warning"
              variant="flat"
              startContent={<CircleDollarSign className="h-4 w-4" />}
              onPress={() => onOpenPaymentCard()}
            >
              收款卡片
            </Button>
            {canCreateInvoice && (
              billing.billing_profile?.title ? (
                <Button
                  size="sm"
                  color="primary"
                  variant="flat"
                  startContent={<ReceiptText className="h-4 w-4" />}
                  onPress={openInvoice}
                >
                  补开发票
                </Button>
              ) : (
                <Tooltip content="发送开票资料填写指引给用户，附直达填写链接">
                  <Button size="sm" color="warning" variant="flat" isLoading={guideSending} startContent={<ReceiptText className="h-4 w-4" />} onPress={() => void sendInvoiceGuide()}>
                    提示用户填开票资料
                  </Button>
                </Tooltip>
              )
            )}
          </div>
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
                  {order.invoice_requested && (
                    <div className="mt-1">
                      <Chip size="sm" variant="flat" color="success">{INVOICE_STATUS_LABELS[order.invoice_status || ''] || '已申请开票'}</Chip>
                    </div>
                  )}
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
      <Modal isOpen={invoiceOpen} onOpenChange={(open) => { if (!open && !invoiceSaving) setInvoiceOpen(false); }} size="md" placement="center">
        <ModalContent>
          <ModalHeader>补开发票</ModalHeader>
          <ModalBody className="gap-3">
            <div className="rounded-lg bg-default-50 px-3 py-2 text-xs">
              <p className="font-medium">用户开票资料（本人填写，不可代改）</p>
              <p className="mt-1 text-default-600">抬头：{billing.billing_profile?.title || '-'}</p>
              <p className="text-default-600">税号：{billing.billing_profile?.tax_number || '（未填写）'}</p>
            </div>
            <Input
              label="开票金额（元）"
              type="number"
              value={invoiceAmount}
              onValueChange={setInvoiceAmount}
              min={0.01}
              step={0.01}
              placeholder="手动输入开票金额"
              description="不绑定具体套餐订单，按实际收款情况填写"
              isRequired
              autoFocus
            />
            <Input label="接收邮箱" type="email" value={invoiceEmail} onValueChange={setInvoiceEmail} startContent={<Mail className="h-4 w-4 text-default-400" />} />
            <Checkbox size="sm" isSelected={invoiceNotice} onValueChange={setInvoiceNotice} isDisabled={invoiceSaving}>
              在会话中提示用户「{invoiceAmount.trim() || 'xxx'}元发票正在补录流程中」
            </Checkbox>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" isDisabled={invoiceSaving} onPress={() => setInvoiceOpen(false)}>取消</Button>
            <Button color="primary" isLoading={invoiceSaving} isDisabled={!invoiceAmount.trim() || Number(invoiceAmount) <= 0} onPress={() => void submitInvoice()}>确认补录</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ScrollShadow>
  );
};

export default CustomerServiceContextPanel;
