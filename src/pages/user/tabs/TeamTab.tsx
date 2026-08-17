import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  NumberInput,
  Select,
  SelectItem,
  Spinner,
  Switch,
  useDisclosure,
} from '@heroui/react';
import {
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Crown,
  Info,
  MailPlus,
  ReceiptText,
  UserRoundCog,
  RefreshCw,
  Settings2,
  ShieldCheck,
  UserMinus,
  UsersRound,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  InvoiceEligibility,
  TeamCheckout,
  TeamInvitation,
  TeamMember,
  TeamOverview,
  TeamPlan,
  teamUserApi,
} from '../../../services/userApi';
import { toast } from '../../../utils/toast';
import { TeamPaymentModal } from './team/TeamPaymentModal';
import { UserAgreementConsent, useUserAgreementRequirement } from '../../../components/UserAgreementConsent';

const formatDate = (value?: string | null) => value
  ? new Date(value).toLocaleString('zh-CN', { hour12: false })
  : '--';

const memberName = (member: TeamMember) => member.username || member.email || `用户 #${member.user_id}`;
const formatDiscount = (rate: number) => `${Number((rate * 10).toFixed(2))} 折`;
const INVOICE_REASON: Record<string, string> = {
  invoice_disabled: '开票功能暂未开放',
  below_threshold: '当前团队订单金额未达到开票门槛',
  email_unbound: '请先绑定邮箱后再申请开票',
  email_not_allowed: '当前邮箱不符合开票要求，请联系客服',
  billing_profile_missing: '请先完善开票主体信息',
  non_self_site: '开票仅在自营站点可用',
};

const TEAM_STATUS: Record<string, { label: string; color: 'success' | 'warning' | 'danger' | 'default' }> = {
  active: { label: '生效中', color: 'success' },
  pending: { label: '等待付款', color: 'warning' },
  expired: { label: '已到期', color: 'danger' },
  cancelled: { label: '已关闭', color: 'default' },
};

const MEMBER_STATUS: Record<string, string> = {
  active: '正常',
  suspended: '已暂停',
};

interface InviteRowProps {
  invitation: TeamInvitation;
  owner?: boolean;
  actionId: number | null;
  onAction: (invitation: TeamInvitation, action: 'accept' | 'reject' | 'revoke') => void;
}

const InviteRow: React.FC<InviteRowProps> = ({ invitation, owner, actionId, onAction }) => (
  <div className="flex flex-col gap-3 border-b border-divider py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <p className="truncate font-medium">{invitation.team_name || '团队邀请'}</p>
      <p className="mt-1 truncate text-sm text-default-500">
        {owner
          ? `邀请 ${invitation.invitee_name || `用户 #${invitation.invitee_user_id}`}`
          : `由 ${invitation.inviter_name || `用户 #${invitation.inviter_user_id}`} 发出`}
      </p>
      <p className="mt-1 text-xs text-default-400">{formatDate(invitation.expires_at)} 失效</p>
    </div>
    {owner ? (
      <Button
        size="sm"
        color="danger"
        variant="flat"
        isLoading={actionId === invitation.id}
        onPress={() => onAction(invitation, 'revoke')}
      >
        撤销邀请
      </Button>
    ) : (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="flat"
          startContent={<X className="h-4 w-4" />}
          isDisabled={actionId === invitation.id}
          onPress={() => onAction(invitation, 'reject')}
        >
          拒绝
        </Button>
        <Button
          size="sm"
          color="primary"
          startContent={<Check className="h-4 w-4" />}
          isLoading={actionId === invitation.id}
          onPress={() => onAction(invitation, 'accept')}
        >
          接受
        </Button>
      </div>
    )}
  </div>
);

export const TeamTab: React.FC = () => {
  const [overview, setOverview] = useState<TeamOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [orderAction, setOrderAction] = useState<'initial' | 'change' | 'renewal'>('initial');
  const [planId, setPlanId] = useState('');
  const [seats, setSeats] = useState(2);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [checkout, setCheckout] = useState<TeamCheckout | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const orderModal = useDisclosure();
  const cancelModal = useDisclosure();
  const [cancellingTeam, setCancellingTeam] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(true);
  const { isRequired: isAgreementRequired } = useUserAgreementRequirement();
  const [invoiceRequested, setInvoiceRequested] = useState(false);
  const [invoiceEligibility, setInvoiceEligibility] = useState<InvoiceEligibility | null>(null);
  const [invoiceEligibilityLoading, setInvoiceEligibilityLoading] = useState(false);
  const navigate = useNavigate();

  const loadOverview = useCallback(async (background = false): Promise<TeamOverview | null> => {
    if (background) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await teamUserApi.getTeam();
      if (response.code !== 20000 || !response.data) {
        throw new Error(response.msg || '团队信息加载失败');
      }
      setOverview(response.data);
      setCheckout(response.data.pending_checkout || null);
      setError('');
      if (response.data.team) {
        setTeamName(response.data.team.team_name);
      } else {
        const accountEmail = response.data.current_user?.email?.trim();
        if (accountEmail) setTeamName((current) => current || `${accountEmail} 的团队1`);
      }
      return response.data;
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : '团队信息加载失败';
      setError(message);
      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const team = overview?.team || null;
  const plans = useMemo(() => overview?.plan_config.plans || [], [overview]);
  const incoming = overview?.invitations.incoming || [];
  const outgoing = overview?.invitations.outgoing || [];
  const activeMembers = overview?.members.filter((member) => member.status === 'active' || member.status === 'suspended') || [];
  const occupiedSeats = activeMembers.length + outgoing.length;
  const selectedPlan = useMemo(
    () => plans.find((plan) => String(plan.package_id) === planId) || null,
    [planId, plans],
  );
  const estimatedTotal = selectedPlan
    ? Number(selectedPlan.unit_price) * seats * selectedPlan.discount_rate
    : 0;
  const invoiceOptionVisible = invoiceEligibilityLoading || !invoiceEligibility || !['invoice_disabled', 'non_self_site'].includes(invoiceEligibility.reason || '');
  const invoiceRatePoints = Number(invoiceEligibility?.surcharge_rate || 0) * 100;

  useEffect(() => {
    if (!orderModal.isOpen || !selectedPlan) {
      setInvoiceEligibility(null);
      setInvoiceEligibilityLoading(false);
      return;
    }
    let cancelled = false;
    setInvoiceEligibilityLoading(true);
    const timer = window.setTimeout(() => {
      void teamUserApi.getInvoiceEligibility(selectedPlan.package_id, seats)
        .then((response) => {
          if (cancelled) return;
          const next = response.code === 20000 ? response.data || null : null;
          setInvoiceEligibility(next);
          if (next?.reason === 'invoice_disabled' || next?.reason === 'non_self_site') setInvoiceRequested(false);
        })
        .catch(() => {
          if (!cancelled) setInvoiceEligibility(null);
        })
        .finally(() => {
          if (!cancelled) setInvoiceEligibilityLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [orderModal.isOpen, seats, selectedPlan]);

  const openOrder = (
    action: 'initial' | 'change' | 'renewal',
    sourceCheckout?: TeamCheckout | null,
  ) => {
    const preferredId = sourceCheckout?.package_id || (action === 'initial' ? plans[0]?.package_id : team?.package_id);
    const plan = plans.find((item) => item.package_id === preferredId) || plans[0];
    setOrderAction(action);
    setPlanId(plan ? String(plan.package_id) : '');
    const desiredSeats = sourceCheckout?.seat_count || team?.seat_count || plan?.min_seats || overview?.plan_config.min_seats || 2;
    setInvoiceRequested(Boolean(sourceCheckout?.invoice_requested));
    setSeats(Math.max(plan?.min_seats || 2, Math.min(plan?.max_seats || 200, desiredSeats)));
    orderModal.onOpen();
  };

  const continuePayment = () => {
    const pending = overview?.pending_checkout;
    if (pending?.recoverable) {
      setCheckout(pending);
      setPaymentOpen(true);
      return;
    }
    const action = pending?.action || (team?.status === 'pending' ? 'initial' : 'renewal');
    openOrder(action, pending);
  };

  const replacePendingOrder = () => {
    openOrder(overview?.pending_checkout?.action || 'initial', overview?.pending_checkout);
  };

  const goToInvoiceProfile = (openEdit: 'email' | 'billing_profile') => {
    orderModal.onClose();
    navigate('/user-center?tab=profile', { state: { openEdit } });
  };

  const cancelPendingTeam = async () => {
    setCancellingTeam(true);
    try {
      const response = await teamUserApi.cancelPending();
      if (response.code !== 20000) throw new Error(response.msg || '取消团队失败');
      setPaymentOpen(false);
      setCheckout(null);
      cancelModal.onClose();
      toast.success('已取消团队创建，可以重新选择套餐');
      await loadOverview(true);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : '取消团队失败');
    } finally {
      setCancellingTeam(false);
    }
  };

  const createOrder = async () => {
    if (!selectedPlan) {
      toast.error('请选择团队套餐');
      return;
    }
    if (orderAction === 'initial' && !teamName.trim()) {
      toast.error('请输入团队名称');
      return;
    }
    if (isAgreementRequired && !agreementAccepted) {
      toast.warning('请先勾选同意《用户协议》');
      return;
    }
    if (invoiceRequested && !invoiceEligibility?.eligible) {
      toast.warning(INVOICE_REASON[invoiceEligibility?.reason || ''] || '当前团队订单无法开票');
      return;
    }
    setCreatingOrder(true);
    try {
      const response = await teamUserApi.createOrder({
        action: orderAction,
        package_id: selectedPlan.package_id,
        seat_count: seats,
        team_name: orderAction === 'initial' ? teamName.trim() : undefined,
        replace_pending: Boolean(overview?.pending_checkout),
        invoice_requested: invoiceRequested,
      });
      if (response.code !== 20000 || !response.data?.order_id) {
        throw new Error(response.msg || '创建支付订单失败');
      }
      setCheckout(response.data);
      orderModal.onClose();
      setPaymentOpen(true);
      await loadOverview(true);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : '创建支付订单失败';
      if (message === '请求超时') {
        const latest = await loadOverview(true);
        if (latest?.pending_checkout?.recoverable) {
          setCheckout(latest.pending_checkout);
          orderModal.onClose();
          setPaymentOpen(true);
          toast.info('订单已创建，已恢复支付页面');
        } else {
          toast.warning('订单仍在确认中，请稍后刷新后继续支付');
        }
      } else {
        toast.error(message);
      }
    } finally {
      setCreatingOrder(false);
    }
  };

  const sendInvite = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) return;
    setInviting(true);
    try {
      const response = await teamUserApi.invite({ email: normalizedEmail });
      if (response.code !== 20000) throw new Error(response.msg || '邀请失败');
      toast.success('团队邀请已发送');
      setEmail('');
      await loadOverview(true);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : '邀请失败');
    } finally {
      setInviting(false);
    }
  };

  const invitationAction = async (
    invitation: TeamInvitation,
    action: 'accept' | 'reject' | 'revoke',
  ) => {
    setActionId(invitation.id);
    try {
      const response = action === 'accept'
        ? await teamUserApi.acceptInvitation(invitation.id)
        : action === 'reject'
          ? await teamUserApi.rejectInvitation(invitation.id)
          : await teamUserApi.revokeInvitation(invitation.id);
      if (response.code !== 20000) throw new Error(response.msg || '操作失败');
      toast.success(action === 'accept' ? '已加入团队' : action === 'reject' ? '已拒绝邀请' : '邀请已撤销');
      await loadOverview(true);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : '操作失败');
    } finally {
      setActionId(null);
    }
  };

  const memberAction = async (member: TeamMember, action: 'suspend' | 'resume' | 'remove') => {
    setActionId(member.id);
    try {
      const response = action === 'suspend'
        ? await teamUserApi.suspendMember(member.id)
        : action === 'resume'
          ? await teamUserApi.resumeMember(member.id)
          : await teamUserApi.removeMember(member.id);
      if (response.code !== 20000) throw new Error(response.msg || '操作失败');
      toast.success('成员状态已更新');
      await loadOverview(true);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : '操作失败');
    } finally {
      setActionId(null);
    }
  };

  const leaveTeam = async () => {
    try {
      const response = await teamUserApi.leave();
      if (response.code !== 20000) throw new Error(response.msg || '退出失败');
      toast.success('已退出团队');
      await loadOverview(true);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : '退出失败');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Spinner size="lg" label="正在加载组织团队..." />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <Card>
        <CardBody className="items-center gap-4 py-12 text-center">
          <Alert color="danger" title="组织团队加载失败" description={error} className="max-w-xl" />
          <Button color="primary" startContent={<RefreshCw className="h-4 w-4" />} onPress={() => void loadOverview()}>
            重新加载
          </Button>
        </CardBody>
      </Card>
    );
  }

  const status = TEAM_STATUS[team?.status || ''] || { label: team?.status || '未知', color: 'default' as const };
  const canCreate = !team && overview?.plan_config.enabled && plans.length > 0;
  const pendingCheckout = overview?.pending_checkout;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
            <UsersRound className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">组织团队</h1>
              {team && <Chip size="sm" color={status.color} variant="flat">{status.label}</Chip>}
            </div>
            <p className="mt-1 text-sm text-default-500">统一购买团队套餐，按席位管理成员访问权限</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="light"
          isIconOnly
          aria-label="刷新团队信息"
          title="刷新团队信息"
          isLoading={refreshing}
          onPress={() => void loadOverview(true)}
        >
          {!refreshing && <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      <Card className="border border-primary-100 bg-primary-50/40 shadow-sm">
        <CardBody className="p-4 sm:p-5">
          <button
            type="button"
            onClick={() => setGuideOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-4 text-left"
            aria-expanded={guideOpen}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary">
                <Info className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold">团队使用说明</p>
                <p className="text-sm text-default-500">创建、席位、邀请与续费规则</p>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 shrink-0 text-default-500 transition-transform ${guideOpen ? 'rotate-180' : ''}`} />
          </button>
          {guideOpen && (
            <div className="mt-4 grid gap-3 border-t border-primary-100 pt-4 text-sm md:grid-cols-2">
              <p className="rounded-lg bg-white/70 p-3 leading-6 text-default-700 md:col-span-2">
                团队模式适用于科研团队、班级、企业组织及其他集中管理场景。一次采购多席位，一键邀请成员使用，被邀请人无需另行下单购买。
              </p>
              <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /><p><strong>独立权益：</strong>团队套餐与个人套餐分开，成员使用团队统一权益。</p></div>
              <div className="flex gap-3"><UsersRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p><strong>席位计算：</strong>所有者、正式成员和未过期邀请都会占用席位。</p></div>
              <div className="flex gap-3"><MailPlus className="mt-0.5 h-4 w-4 shrink-0 text-secondary" /><p><strong>邀请成员：</strong>只能邀请已注册账户；同一用户同时只能属于一个团队。</p></div>
              <div className="flex gap-3"><Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-warning" /><p><strong>调整席位：</strong>新席位数不能低于当前成员和待处理邀请的总数。</p></div>
              <div className="flex gap-3"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-danger" /><p><strong>套餐变更：</strong>升级付款后立即生效；降级在当前周期结束后生效。</p></div>
              <div className="flex gap-3"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-default-600" /><p><strong>付款时限：</strong>每个支付订单 5 分钟有效；关闭或刷新页面后可继续支付。</p></div>
            </div>
          )}
        </CardBody>
      </Card>

      {!team ? (
        <Card>
          <CardBody className="items-center px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-default-100 text-default-500">
              <UsersRound className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-xl font-semibold">尚未创建组织团队</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-default-500">
              创建后由你担任所有者。购买团队套餐并完成付款后，即可邀请已注册成员加入。
            </p>
            {canCreate ? (
              <Button className="mt-6" color="primary" startContent={<Crown className="h-4 w-4" />} onPress={() => openOrder('initial')}>
                创建团队
              </Button>
            ) : (
              <Chip className="mt-6" variant="flat">当前暂未开放新建团队</Chip>
            )}
          </CardBody>
        </Card>
      ) : (
        <>
          {team.status === 'pending' && (
            <Alert
              color="warning"
              variant="flat"
              title="团队尚未生效"
              description={pendingCheckout?.recoverable
                ? '首笔团队订单等待付款。付款成功后团队权益和成员管理功能会自动开放。'
                : '首笔支付订单不存在或已失效，请重新生成支付订单。'}
              startContent={<Clock3 className="h-5 w-5" />}
              endContent={team.is_owner && (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button size="sm" variant="light" onPress={cancelModal.onOpen}>取消创建</Button>
                  <Button size="sm" variant="flat" color="warning" onPress={replacePendingOrder}>更换订单</Button>
                  {pendingCheckout?.recoverable && <Button size="sm" color="warning" onPress={continuePayment}>继续支付</Button>}
                </div>
              )}
            />
          )}

          {team.status !== 'pending' && pendingCheckout && (
            <Alert
              color="warning"
              variant="flat"
              title={`有一笔待支付的${pendingCheckout.action === 'change' ? '套餐调整' : '续费'}订单`}
              description={`${pendingCheckout.package_name || `套餐 #${pendingCheckout.package_id}`} · ${pendingCheckout.seat_count} 席 · ¥${pendingCheckout.payable_amount || '--'}`}
              startContent={<CircleDollarSign className="h-5 w-5" />}
              endContent={<Button size="sm" color="warning" onPress={continuePayment}>{pendingCheckout.recoverable ? '继续支付' : '重新生成'}</Button>}
            />
          )}

          <Card>
            <CardBody className="gap-5 p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold">{team.team_name}</h2>
                    {team.is_owner && <Chip size="sm" variant="flat" color="primary">所有者</Chip>}
                  </div>
                  <p className="mt-1 text-sm text-default-500">团队编号 #{team.id}</p>
                </div>
                {team.is_owner ? (
                  <div className="flex flex-wrap gap-2">
                    {team.status === 'active' && !team.pending_package_id && (
                      <Button size="sm" variant="flat" startContent={<Settings2 className="h-4 w-4" />} onPress={() => openOrder('change')}>
                        调整订阅
                      </Button>
                    )}
                    {(team.status === 'active' || team.status === 'expired') && (
                      <Button size="sm" color="primary" startContent={<CalendarDays className="h-4 w-4" />} onPress={() => openOrder('renewal')}>
                        续费团队
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button size="sm" color="danger" variant="flat" startContent={<UserMinus className="h-4 w-4" />} onPress={() => void leaveTeam()}>
                    退出团队
                  </Button>
                )}
              </div>

              <Divider />

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-default-500">当前团队套餐</p>
                  <p className="mt-1 font-semibold">{team.package_name || `套餐 #${team.package_id}`}</p>
                  {team.package_level && <p className="mt-1 text-xs text-default-400">{team.package_level}</p>}
                </div>
                <div>
                  <p className="text-xs text-default-500">席位使用</p>
                  <p className="mt-1 font-semibold">{occupiedSeats} / {team.seat_count}</p>
                  <p className="mt-1 text-xs text-default-400">含 {outgoing.length} 个待接受邀请</p>
                </div>
                <div>
                  <p className="text-xs text-default-500">有效期至</p>
                  <p className="mt-1 font-semibold">{formatDate(team.expires_at)}</p>
                </div>
              </div>

              {team.pending_package_id && (
                <Alert
                  color="primary"
                  variant="flat"
                  title="下个周期已安排变更"
                  description={`${team.pending_package_name || `套餐 #${team.pending_package_id}`} · ${team.pending_seat_count || team.seat_count} 席，将于 ${formatDate(team.pending_effective_at)} 生效`}
                />
              )}
            </CardBody>
          </Card>

          {team.status === 'active' && (
            <>
              {team.is_owner && (
                <Card>
                  <CardBody className="gap-4 p-5 sm:p-6">
                    <div>
                      <h2 className="font-semibold">邀请成员</h2>
                      <p className="mt-1 text-sm text-default-500">填写已注册用户的邮箱；邀请 7 天内有效并预留一个席位</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        type="email"
                        label="成员邮箱"
                        placeholder="name@example.com"
                        value={email}
                        onValueChange={setEmail}
                        onKeyDown={(event) => event.key === 'Enter' && void sendInvite()}
                        startContent={<MailPlus className="h-4 w-4 text-default-400" />}
                        className="flex-1"
                      />
                      <Button
                        color="primary"
                        className="h-14 sm:self-start"
                        isLoading={inviting}
                        isDisabled={occupiedSeats >= team.seat_count}
                        onPress={() => void sendInvite()}
                      >
                        发送邀请
                      </Button>
                    </div>
                    {occupiedSeats >= team.seat_count && <p className="text-sm text-warning-600">当前没有可用席位，请先调整团队订阅。</p>}
                  </CardBody>
                </Card>
              )}

              <Card>
                <CardBody className="gap-3 p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold">团队成员</h2>
                      <p className="mt-1 text-sm text-default-500">{activeMembers.length} 名成员</p>
                    </div>
                    <Chip size="sm" variant="flat">剩余 {Math.max(0, team.seat_count - occupiedSeats)} 席</Chip>
                  </div>
                  <Divider />
                  {activeMembers.map((member) => (
                    <div key={member.id} className="flex flex-col gap-3 border-b border-divider py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium">{memberName(member)}</p>
                          <Chip size="sm" variant="flat" color={member.status === 'active' ? 'success' : 'warning'}>
                            {MEMBER_STATUS[member.status] || member.status}
                          </Chip>
                          {member.role === 'owner' && <Chip size="sm" color="primary" variant="flat">所有者</Chip>}
                        </div>
                        <p className="mt-1 text-xs text-default-400">加入时间 {formatDate(member.joined_at)}</p>
                      </div>
                      {team.is_owner && member.role !== 'owner' && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="flat"
                            isLoading={actionId === member.id}
                            onPress={() => void memberAction(member, member.status === 'suspended' ? 'resume' : 'suspend')}
                          >
                            {member.status === 'suspended' ? '恢复' : '暂停'}
                          </Button>
                          <Button size="sm" color="danger" variant="flat" isDisabled={actionId === member.id} onPress={() => void memberAction(member, 'remove')}>
                            移除
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </CardBody>
              </Card>
            </>
          )}
        </>
      )}

      {(incoming.length > 0 || outgoing.length > 0) && (
        <Card>
          <CardBody className="gap-4 p-5 sm:p-6">
            <div>
              <h2 className="font-semibold">待处理邀请</h2>
              <p className="mt-1 text-sm text-default-500">接受、拒绝或撤销尚未过期的邀请</p>
            </div>
            <Divider />
            {incoming.map((invitation) => (
              <InviteRow key={`incoming-${invitation.id}`} invitation={invitation} actionId={actionId} onAction={invitationAction} />
            ))}
            {outgoing.map((invitation) => (
              <InviteRow key={`outgoing-${invitation.id}`} invitation={invitation} owner actionId={actionId} onAction={invitationAction} />
            ))}
          </CardBody>
        </Card>
      )}

      <Modal isOpen={orderModal.isOpen} onClose={orderModal.onClose} size="lg" placement="center">
        <ModalContent>
          <ModalHeader>
            {orderAction === 'initial' ? (team?.status === 'pending' ? '重新生成支付订单' : '创建组织团队') : orderAction === 'renewal' ? '续费团队' : '调整团队订阅'}
          </ModalHeader>
          <ModalBody className="gap-4">
            {orderAction === 'initial' && (
              <Input
                label="团队名称"
                value={teamName}
                onValueChange={setTeamName}
                description="创建后可在团队概览中识别该组织"
                maxLength={120}
              />
            )}
            <Select
              label="团队套餐"
              selectedKeys={planId ? [planId] : []}
              isDisabled={orderAction === 'renewal' && team?.status === 'active'}
              onSelectionChange={(keys) => {
                const nextId = String(Array.from(keys)[0] || '');
                setPlanId(nextId);
                const plan = plans.find((item) => String(item.package_id) === nextId);
                if (plan) setSeats((current) => Math.max(plan.min_seats, Math.min(plan.max_seats, current)));
              }}
              renderValue={(items) => items.map((item) => {
                const plan = item.data as TeamPlan | undefined;
                return plan ? `${plan.package_name} · ${plan.level} · ${formatDiscount(plan.discount_rate)}` : item.textValue;
              })}
            >
              {plans.map((plan) => (
                <SelectItem key={String(plan.package_id)} textValue={plan.package_name}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{plan.package_name}</p>
                      <p className="text-xs text-default-500">{plan.level} · {plan.duration} 天 · {plan.min_seats}-{plan.max_seats} 个席位</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Chip size="sm" color="success" variant="flat">{formatDiscount(plan.discount_rate)}</Chip>
                      <p className="text-sm font-semibold">¥{plan.discounted_unit_price}/席</p>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </Select>
            <NumberInput
              label="席位数量"
              value={seats}
              onValueChange={(value) => setSeats(Math.max(selectedPlan?.min_seats || 2, Math.trunc(value || 0)))}
              minValue={selectedPlan?.min_seats || overview?.plan_config.min_seats || 2}
              maxValue={selectedPlan?.max_seats || overview?.plan_config.max_seats || 200}
              step={1}
              isDisabled={orderAction === 'renewal' && team?.status === 'active'}
              description={selectedPlan ? `${selectedPlan.min_seats}-${selectedPlan.max_seats} 个席位，包含团队所有者` : '请先选择套餐'}
            />
            {selectedPlan && (
              <div className="grid gap-3 rounded-lg bg-default-50 p-4 sm:grid-cols-3">
                <div><p className="text-xs text-default-500">套餐周期</p><p className="mt-1 font-semibold">{selectedPlan.duration} 天</p></div>
                <div><p className="text-xs text-default-500">团队单价（{formatDiscount(selectedPlan.discount_rate)}）</p><p className="mt-1 font-semibold">¥{selectedPlan.discounted_unit_price}/席</p></div>
                <div><p className="text-xs text-default-500">预计应付</p><p className="mt-1 font-semibold text-danger">¥{estimatedTotal.toFixed(2)}</p></div>
              </div>
            )}
            {invoiceOptionVisible && (
              <div className="space-y-3 rounded-lg border border-primary-200 bg-primary-50/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ReceiptText className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">申请开票</p>
                      <p className="text-xs text-default-500">未选择开票并完成支付后，无法补开</p>
                    </div>
                  </div>
                  <Switch
                    size="sm"
                    isSelected={invoiceRequested}
                    isDisabled={invoiceEligibilityLoading || !invoiceEligibility || invoiceEligibility.reason === 'below_threshold' || invoiceEligibility.reason === 'email_not_allowed'}
                    onValueChange={setInvoiceRequested}
                    aria-label="团队订单是否开票"
                  >
                    是否开票
                  </Switch>
                </div>
                {invoiceEligibilityLoading ? (
                  <div className="flex items-center gap-2 text-sm text-default-500"><Spinner size="sm" />正在检查开票资格...</div>
                ) : invoiceEligibility?.eligible ? (
                  invoiceRequested && <div className="grid gap-2 rounded-lg bg-background p-3 text-sm sm:grid-cols-2">
                    <p>团队折后金额：<strong>¥{invoiceEligibility.base_amount}</strong></p>
                    <p>开票加 {Number(invoiceRatePoints.toFixed(4))} 个点：<strong>¥{invoiceEligibility.surcharge_amount}</strong></p>
                    <p>开票应付金额：<strong className="text-primary">¥{invoiceEligibility.payable_amount}</strong></p>
                    <p>预计发送：支付后 {invoiceEligibility.delivery_workdays} 个工作日</p>
                    <p className="sm:col-span-2">抬头：{invoiceEligibility.billing_profile?.title} · 税号：{invoiceEligibility.billing_profile?.tax_number} · 邮箱：{invoiceEligibility.email}</p>
                  </div>
                ) : invoiceEligibility ? (
                  <div className="flex flex-col gap-2 rounded-lg bg-warning-50 p-3 text-sm text-warning-700 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2"><UserRoundCog className="mt-0.5 h-4 w-4 shrink-0" /><span>{INVOICE_REASON[invoiceEligibility.reason || ''] || '当前团队订单无法开票'}</span></div>
                    {invoiceRequested && invoiceEligibility.reason === 'email_unbound' && <Button size="sm" color="warning" variant="flat" onPress={() => goToInvoiceProfile('email')}>去绑定邮箱</Button>}
                    {invoiceRequested && invoiceEligibility.reason === 'billing_profile_missing' && <Button size="sm" color="warning" variant="flat" onPress={() => goToInvoiceProfile('billing_profile')}>去完善开票信息</Button>}
                  </div>
                ) : <p className="text-sm text-danger">开票资格查询失败，请稍后重试</p>}
              </div>
            )}
            {orderAction === 'change' && team?.status === 'active' && (
              <Alert color="primary" variant="flat" title="套餐变更规则" description="升级付款后立即生效并开启一个新周期；降级或降低席位将在当前周期结束后生效。" />
            )}
            <UserAgreementConsent isSelected={agreementAccepted} onValueChange={setAgreementAccepted} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={orderModal.onClose}>取消</Button>
            <Button color="primary" isLoading={creatingOrder} isDisabled={(isAgreementRequired && !agreementAccepted) || invoiceEligibilityLoading || (invoiceRequested && !invoiceEligibility?.eligible)} onPress={() => void createOrder()}>
              创建支付订单
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={cancelModal.isOpen} onClose={cancelModal.onClose} size="sm" placement="center">
        <ModalContent>
          <ModalHeader>取消创建团队</ModalHeader>
          <ModalBody>
            <p className="text-sm leading-6 text-default-600">取消后当前支付二维码会立即失效，团队不会生效。你可以随后重新创建并选择其他套餐或席位。</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={cancelModal.onClose}>返回</Button>
            <Button color="danger" isLoading={cancellingTeam} onPress={() => void cancelPendingTeam()}>确认取消</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <TeamPaymentModal
        isOpen={paymentOpen}
        checkout={checkout}
        onClose={() => {
          setPaymentOpen(false);
          void loadOverview(true);
        }}
        onSuccess={async () => { await loadOverview(true); }}
        onExpired={async () => { await loadOverview(true); }}
      />
    </div>
  );
};
