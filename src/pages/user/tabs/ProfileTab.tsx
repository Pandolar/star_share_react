import React, { useEffect, useState } from 'react';
import { Card, CardBody, Chip, Spinner, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react';
import { User, Mail, Calendar, Shield, AlertCircle, Package, Crown, MessageCircle, ArrowUpCircle, Gauge, Snowflake, Info, Gift, Wallet, ReceiptText, Trash2, ChevronDown, Settings2 } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { userInfoApi, compensationApi, CompensationItem } from '../../../services/userApi';
import { getCookie } from '../../../utils/cookies';
import { IdentityAvatar } from '../../../components/identity/IdentityAvatar';
import { toast } from '../../../utils/toast';
import { EditProfileModal } from './profile/EditProfileModal';
import { UsageSection } from './UsageTab';
import { useLimitUsage, summarizeQuotaRule } from '../../../hooks/useLimitUsage';
import { useWhiteLabel } from '../../../contexts/WhiteLabelContext';
import type { UserInfo, EditTabKey } from './profile/types';
import { DeleteAccountModal } from './profile/DeleteAccountModal';

const getStatusChip = (status: number) =>
  status === 1
    ? <Chip size="sm" color="success" variant="flat">活跃</Chip>
    : <Chip size="sm" color="danger" variant="flat">停用</Chip>;

const maskPaymentAccount = (account?: string) => {
  const value = (account || '').trim();
  if (/^1\d{10}$/.test(value)) return `${value.slice(0, 3)}****${value.slice(-4)}`;
  const at = value.indexOf('@');
  if (at > 0) return `${value.slice(0, 1)}***${value.slice(at)}`;
  return value.length > 6 ? `${value.slice(0, 3)}***${value.slice(-2)}` : value;
};
const maskRealName = (name?: string) => (name || '').trim() ? `${(name || '').trim().slice(0, 1)}*` : '';
const maskTaxNumber = (tax?: string) => {
  const value = (tax || '').trim();
  return value.length > 10 ? `${value.slice(0, 4)}****${value.slice(-4)}` : value;
};

// 账号管理列表行：名称 + 当前状态摘要 + 箭头；点击行为由各行按内容密度决定。
const ManageRow: React.FC<{ icon: React.ReactNode; label: string; status?: React.ReactNode; open?: boolean; danger?: boolean; onPress: () => void }> = ({ icon, label, status, open, danger, onPress }) => (
  <button type="button" onClick={onPress} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
    <span className={danger ? 'text-danger' : 'text-default-500'}>{icon}</span>
    <span className={`shrink-0 text-sm font-medium ${danger ? 'text-danger-700' : 'text-default-800'}`}>{label}</span>
    <span className="ml-auto min-w-0 truncate text-right text-xs text-default-400">{status}</span>
    <ChevronDown size={14} className={`shrink-0 text-default-400 transition-transform ${open ? '' : '-rotate-90'}`} />
  </button>
);

const getPackageLevelStyle = (level?: string) => {
  if (!level) return { icon: Package, color: 'default' as const, bgColor: 'bg-default/10' };
  switch (level.toLowerCase()) {
    case 'base':
      return { icon: Package, color: 'default' as const, bgColor: 'bg-default/10' };
    case 'plus':
      return { icon: Shield, color: 'primary' as const, bgColor: 'bg-primary/10' };
    case 'pro':
    case 'premium':
      return { icon: Crown, color: 'warning' as const, bgColor: 'bg-warning/10' };
    default:
      return { icon: Package, color: 'default' as const, bgColor: 'bg-default/10' };
  }
};

export const ProfileTab: React.FC = () => {
  const { features, loading: whiteLabelLoading } = useWhiteLabel();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // 冻结套餐Modal
  const { isOpen: isFrozenOpen, onOpen: onFrozenOpen, onClose: onFrozenClose } = useDisclosure();
  // 补偿领取成功Modal
  const { isOpen: isClaimSuccessOpen, onOpen: onClaimSuccessOpen, onClose: onClaimSuccessClose } = useDisclosure();
  const [claimResult, setClaimResult] = useState<{ title: string; days: number; level: string | null } | null>(null);

  // 额度详情：用于在套餐卡片展示当前套餐的配额规则，并共享给使用额度区块
  const { data: usageData, loading: usageLoading, error: usageError, refetch: refetchUsage } = useLimitUsage();
  const quotaRule = summarizeQuotaRule(usageData);

  const [editModal, setEditModal] = useState<{ open: boolean; tab: EditTabKey }>({ open: false, tab: 'username' });
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [accountManageOpen, setAccountManageOpen] = useState(false);
  const [manageRow, setManageRow] = useState<'payment' | 'billing' | 'delete' | null>(null);

  // 补偿活动
  const [compensations, setCompensations] = useState<CompensationItem[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchCompensations = async () => {
    try {
      const resp = await compensationApi.getAvailable();
      if (resp.code === 20000 && Array.isArray(resp.data)) {
        setCompensations(resp.data);
      } else {
        setCompensations([]);
      }
    } catch {
      setCompensations([]);
    }
  };

  const handleClaim = async (campaignId: string) => {
    setClaimingId(campaignId);
    // 领取前记录该活动信息（领取成功后列表会刷新）
    const campaign = compensations.find((c) => c.id === campaignId);
    try {
      const resp = await compensationApi.claim(campaignId);
      if (resp.code === 20000) {
        setClaimResult({
          title: campaign?.title || '补偿福利',
          days: campaign?.days || 0,
          level: campaign?.level || null,
        });
        onClaimSuccessOpen();
        await fetchUserInfo();
        await fetchCompensations();
      } else {
        toast.error(resp.msg || '领取失败');
      }
    } catch {
      toast.error('领取失败，请稍后重试');
    } finally {
      setClaimingId(null);
    }
  };

  useEffect(() => {
    if (whiteLabelLoading) return;

    const stateOpenEdit = (location.state as { openEdit?: string } | null)?.openEdit;
    const queryOpenEdit = searchParams.get('openEdit');
    const openEdit = stateOpenEdit || queryOpenEdit;
    const publicEditTabs: EditTabKey[] = ['email', 'username', 'password'];
    const selfSiteEditTabs: EditTabKey[] = ['payment_info', 'billing_profile'];
    const isSelfSiteEdit = selfSiteEditTabs.includes(openEdit as EditTabKey);
    const selfSiteFeatureEnabled = openEdit === 'payment_info' ? features.invite : features.invoice;
    const canOpen = publicEditTabs.includes(openEdit as EditTabKey)
      || (isSelfSiteEdit && selfSiteFeatureEnabled);

    if (openEdit && canOpen) {
      setEditModal({ open: true, tab: openEdit as EditTabKey });
    } else if (openEdit && isSelfSiteEdit) {
      setEditModal((current) => ({ ...current, open: false }));
    }

    if (stateOpenEdit || queryOpenEdit) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('openEdit');
      navigate({
        pathname: location.pathname,
        search: nextParams.toString() ? `?${nextParams.toString()}` : '',
      }, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate, searchParams, features.invite, features.invoice, whiteLabelLoading]);

  const fetchUserInfo = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await userInfoApi.getUserInfo();
      if (response.code === 20000) {
        setUserInfo(response.data);
      } else {
        setError(response.msg || '获取用户信息失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (whiteLabelLoading) return;
    fetchUserInfo();
    if (!features.activity) setCompensations([]);
    else void fetchCompensations();
  }, [features.activity, whiteLabelLoading]);

  const openEditModal = (tab: EditTabKey = 'username') => setEditModal({ open: true, tab });
  const closeEditModal = () => setEditModal((s) => ({ ...s, open: false }));

  if (whiteLabelLoading) {
    return <div className="flex min-h-64 items-center justify-center"><Spinner label="正在确认站点模式..." /></div>;
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <User size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-default-900">个人主页</h1>
          <p className="text-sm text-default-500 mt-1">查看您的个人信息和账户状态</p>
        </div>
      </div>

      {loading && (
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" color="primary" />
              <span className="ml-3 text-default-600">加载中...</span>
            </div>
          </CardBody>
        </Card>
      )}

      {error && (
        <Card>
          <CardBody className="p-6">
            <div className="flex items-start gap-4 p-6 bg-danger/10 rounded-lg">
              <AlertCircle size={20} className="text-danger flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-danger mb-2">加载失败</h3>
                <p className="text-default-600 text-sm">{error}</p>
                <Button size="sm" color="primary" className="mt-3" onPress={fetchUserInfo}>
                  重试
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {userInfo && (
        <>
          {/* 补偿活动卡片（有可见活动时才显示） */}
          {compensations.length > 0 && (
            <Card className="border-l-4 border-l-warning bg-warning-50/40">
              <CardBody className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Gift className="w-5 h-5 text-warning" />
                  <h3 className="text-lg font-bold text-default-900">补偿福利</h3>
                </div>
                <div className="space-y-3">
                  {compensations.map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-warning-200"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-default-900">{c.title}</div>
                        <div className="text-sm text-default-600 mt-1">
                          补偿 <span className="font-medium text-warning-700">{c.days} 天</span>
                          {c.level && <span className="ml-1">「{c.level}」会员</span>}
                          {c.level_mode === 'follow' && !c.level && <span className="ml-1">（跟随您的最高有效等级）</span>}
                        </div>
                        {!c.claimable && c.reason && (
                          <div className="text-xs text-danger mt-1">{c.reason}</div>
                        )}
                      </div>
                      <Button
                        color="warning"
                        size="sm"
                        isDisabled={!c.claimable}
                        isLoading={claimingId === c.id}
                        onPress={() => handleClaim(c.id)}
                      >
                        {c.claimable ? '立即领取' : '不可领取'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* 用户基本信息卡片 */}
          <Card className="overflow-visible">
            <CardBody className="p-6">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <IdentityAvatar
                  userId={getCookie('xuserid')}
                  name={userInfo.username}
                  size={80}
                  className="flex-shrink-0"
                />

                <div className="flex-1 space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <h2 className="text-xl font-bold text-default-900">{userInfo.username}</h2>
                    <div className="flex items-center gap-2">{getStatusChip(userInfo.status)}</div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-default-600">
                      <Mail size={16} />
                      {userInfo.email && userInfo.email.endsWith('@default.com') ? (
                        <>
                          <span className="text-danger">未绑定邮箱</span>
                          <Button
                            size="sm"
                            color="danger"
                            variant="flat"
                            className="ml-2 h-6 min-w-0 px-2 text-xs"
                            onPress={() => openEditModal('email')}
                          >
                            立即绑定
                          </Button>
                        </>
                      ) : (
                        <span>{userInfo.email}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-default-600">
                      <Calendar size={16} />
                      <span>注册时间：{userInfo.created_at}</span>
                    </div>
                    {features.invite && (
                      <div className="flex items-center gap-2 text-default-600"><User size={16} /><span>邀请人：{userInfo.inviter_user}</span></div>
                    )}
                    {features.wechat_login && userInfo.wechat_openid && (
                      <div className="flex items-center gap-2 text-default-600"><MessageCircle size={16} /><span>微信：<span className="text-success">已绑定微信</span></span></div>
                    )}
                  </div>

                </div>
              </div>

              {/* 账号管理：安全 / 财务资料 / 注销 折叠收纳，默认收起 */}
              <div className="mt-4 border-t border-divider pt-3">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 py-1 text-left"
                  aria-expanded={accountManageOpen}
                  onClick={() => setAccountManageOpen((value) => !value)}
                >
                  <Settings2 size={16} className="text-default-500" />
                  <span className="text-sm font-medium text-default-800">账号管理</span>
                  <span className="text-xs text-default-400">安全、财务资料与注销</span>
                  <ChevronDown size={14} className={`ml-auto text-default-400 transition-transform ${accountManageOpen ? '' : '-rotate-90'}`} />
                </button>
                {accountManageOpen && (() => {
                  const payment = userInfo.preferences?.payment_info;
                  const billing = userInfo.preferences?.billing_profile;
                  const emailBound = Boolean(userInfo.email) && !userInfo.email.endsWith('@default.com');
                  return (
                  <div className="mt-3 divide-y divide-default-100 rounded-lg border border-default-100">
                    <ManageRow icon={<User size={15} />} label="用户名" status={userInfo.username} onPress={() => openEditModal('username')} />
                    <ManageRow icon={<Mail size={15} />} label="登录邮箱" status={emailBound ? '已绑定' : <span className="text-warning">未绑定</span>} onPress={() => openEditModal('email')} />
                    <ManageRow icon={<Shield size={15} />} label="登录密码" status="修改或邮箱重置" onPress={() => openEditModal('password')} />
                    {features.invite && (
                      <div>
                        <ManageRow
                          icon={<Wallet size={15} />}
                          label="收款方式"
                          open={manageRow === 'payment'}
                          status={payment?.account ? `已设置 · ${maskRealName(payment.real_name)} ${maskPaymentAccount(payment.account)}` : <span className="text-warning">未设置</span>}
                          onPress={() => setManageRow((row) => (row === 'payment' ? null : 'payment'))}
                        />
                        {manageRow === 'payment' && (
                          <div className="mx-3 mb-2 rounded-lg bg-default-50 p-3 text-xs text-default-600">
                            {payment?.account ? (
                              <p>支付宝收款：{maskRealName(payment.real_name)} · {maskPaymentAccount(payment.account)}，用于邀请返利等收款；修改后即时生效。</p>
                            ) : (
                              <p>还未设置收款账号，返利到账前请先设置。</p>
                            )}
                            <Button size="sm" variant="bordered" className="mt-2" onPress={() => openEditModal('payment_info')}>{payment?.account ? '修改收款方式' : '设置收款方式'}</Button>
                          </div>
                        )}
                      </div>
                    )}
                    {features.invoice && (
                      <div>
                        <ManageRow
                          icon={<ReceiptText size={15} />}
                          label="开票主体"
                          open={manageRow === 'billing'}
                          status={billing?.title ? `已设置 · ${billing.title}` : <span className="text-warning">未设置</span>}
                          onPress={() => setManageRow((row) => (row === 'billing' ? null : 'billing'))}
                        />
                        {manageRow === 'billing' && (
                          <div className="mx-3 mb-2 rounded-lg bg-default-50 p-3 text-xs text-default-600">
                            {billing?.title ? (
                              <p>抬头：{billing.title}；税号：{maskTaxNumber(billing.tax_number)}。历史订单保留提交时的资料，修改只影响之后的新订单。</p>
                            ) : (
                              <p>设置后下单可直接申请开票，历史订单不受后续修改影响。</p>
                            )}
                            <Button size="sm" variant="bordered" className="mt-2" onPress={() => openEditModal('billing_profile')}>{billing?.title ? '修改开票主体' : '设置开票主体'}</Button>
                          </div>
                        )}
                      </div>
                    )}
                    <div>
                      <ManageRow icon={<Trash2 size={15} />} label="注销账号" danger open={manageRow === 'delete'} status="不可恢复" onPress={() => setManageRow((row) => (row === 'delete' ? null : 'delete'))} />
                      {manageRow === 'delete' && (
                        <div className="mx-3 mb-2 rounded-lg border border-danger-100 bg-danger-50/40 p-3">
                          <p className="text-xs text-danger-600/90">注销后账号不可恢复，已购权益失效且不退款，所有数据均已物理销毁；同邮箱/微信重新注册为全新账号。</p>
                          <Button size="sm" color="danger" variant="flat" className="mt-2" onPress={() => setDeleteAccountOpen(true)}>注销账号</Button>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })()}
              </div>
            </CardBody>
          </Card>

          {/* 当前套餐信息 */}
          {(() => {
            const hasPackage = userInfo.user_active_packages && userInfo.user_active_packages.package_id;
            const hasFrozenPackages = userInfo.frozen_packages && userInfo.frozen_packages.length > 0;
            const levelStyle = hasPackage
              ? getPackageLevelStyle(userInfo.user_active_packages!.level)
              : { icon: Package, color: 'default' as const, bgColor: 'bg-default/10' };

            return (
              <Card shadow={hasPackage ? 'md' : 'sm'}>
                <CardBody className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${levelStyle.bgColor}`}>
                      {hasPackage ? (
                        <span className="text-2xl leading-none" role="img" aria-label="生效套餐">⭐</span>
                      ) : React.createElement(levelStyle.icon, {
                        size: 24,
                        className: `text-${levelStyle.color}`,
                      })}
                    </div>
                    <div className="flex-1">
                      {hasPackage ? (
                        <>
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-bold text-default-900">当前套餐</h3>
                            <Chip
                              size="sm"
                              color={userInfo.user_active_packages!.status === 'frozen' ? 'warning' : levelStyle.color}
                              variant="solid"
                            >
                              {userInfo.user_active_packages!.status_text || userInfo.user_active_packages!.level}
                            </Chip>
                            {hasFrozenPackages && (
                              <Button
                                size="sm"
                                variant="flat"
                                color="warning"
                                startContent={<Snowflake size={14} />}
                                onPress={onFrozenOpen}
                                className="ml-auto"
                              >
                                查看已冻结套餐
                              </Button>
                            )}
                          </div>
                          <p className="text-xl font-semibold text-default-900 mb-4">{userInfo.user_active_packages!.package_name}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-default-600">
                              <Calendar size={16} />
                              <span>
                                {userInfo.user_active_packages!.status === 'frozen'
                                  ? `冻结剩余：${userInfo.user_active_packages!.remaining_text || '-'}`
                                  : `到期时间：${userInfo.user_active_packages!.expiry_date || '-'}`}
                              </span>
                            </div>
                            {quotaRule && (
                              <div className="flex items-center gap-2 text-default-600">
                                <Gauge size={16} />
                                <span>配额规则：{quotaRule}</span>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-default-900">当前套餐</h3>
                            <Chip size="sm" color="default" variant="flat">免费版</Chip>
                          </div>
                          <p className="text-default-500 mb-4">您当前为免费用户，升级套餐可享受更多功能</p>
                          {quotaRule && (
                            <div className="flex items-center gap-2 text-sm text-default-600 mb-4">
                              <Gauge size={16} />
                              <span>配额规则：{quotaRule}</span>
                            </div>
                          )}
                          <Button
                            size="sm"
                            color="primary"
                            startContent={<ArrowUpCircle size={14} />}
                            onPress={() => setSearchParams({ tab: 'subscription' })}
                          >
                            升级套餐
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })()}

          {/* 使用额度：紧跟当前套餐 */}
          <UsageSection usage={usageData} loading={usageLoading} error={usageError} onRefresh={refetchUsage} />

          {/* 账户统计 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardBody className="p-4 text-center">
                <div className="text-2xl font-bold text-primary mb-1">
                  {userInfo.user_active_packages?.level || 'Free'}
                </div>
                <div className="text-sm text-default-500">会员等级</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4 text-center">
                <div className="text-2xl font-bold text-success mb-1">{userInfo.status === 1 ? '正常' : '停用'}</div>
                <div className="text-sm text-default-500">账户状态</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4 text-center">
                <div className="text-2xl font-bold text-default-900 mb-1">
                  {Math.floor((Date.now() - new Date(userInfo.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                </div>
                <div className="text-sm text-default-500">已注册天数</div>
              </CardBody>
            </Card>
          </div>
        </>
      )}

      <EditProfileModal
        isOpen={editModal.open}
        initialTab={editModal.tab}
        userInfo={userInfo}
        showPaymentTab={!whiteLabelLoading && features.invite}
        showBillingTab={!whiteLabelLoading && features.invoice}
        onClose={closeEditModal}
        onUserInfoChange={(next) => setUserInfo((prev) => (prev ? { ...prev, ...next } : prev))}
      />
      <DeleteAccountModal
        isOpen={deleteAccountOpen}
        onClose={() => setDeleteAccountOpen(false)}
        onDeleted={() => navigate('/login', { replace: true, state: { message: '账号已注销' } })}
      />

      {/* 冻结套餐Modal */}
      <Modal isOpen={isFrozenOpen} onClose={onFrozenClose} size="2xl">
        <ModalContent>
          <ModalHeader className="flex gap-2 items-center">
            <Snowflake className="w-5 h-5 text-warning" />
            已冻结套餐
          </ModalHeader>
          <ModalBody>
            {/* 说明文字 */}
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2 mb-2">
                <Info className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                <h4 className="font-semibold text-warning-900">什么是冻结套餐？</h4>
              </div>
              <div className="text-sm text-warning-800 space-y-2 ml-7">
                <p>1. 冻结套餐不会失效或者消失，它会在高等级套餐或者其他同等级套餐消耗完毕后自动解冻，优先自动使用高等级套餐；</p>
                <p>2. 低等级套餐使用过程中购买高等级套餐后，剩余的低等级套餐会被冻结；</p>
                <p>3. 在某些情况下奖励的额度也存在于冻结套餐中。</p>
              </div>
            </div>

            {/* 冻结套餐列表 */}
            {userInfo?.frozen_packages && userInfo.frozen_packages.length > 0 ? (
              <div className="space-y-3">
                {userInfo.frozen_packages.map((pkg: any, index: number) => {
                  const levelStyle = getPackageLevelStyle(pkg.level);
                  return (
                    <Card key={index} className="border-l-4 border-l-warning">
                      <CardBody className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${levelStyle.bgColor}`}>
                            {React.createElement(levelStyle.icon, {
                              size: 20,
                              className: `text-${levelStyle.color}`,
                            })}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-default-900">{pkg.package_name}</h4>
                              <Chip size="sm" color={levelStyle.color} variant="flat">
                                {pkg.level}
                              </Chip>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-default-600">
                              <div>
                                <span className="text-default-500">剩余时长：</span>
                                <span className="font-medium">{pkg.remaining_text}</span>
                              </div>
                              <div>
                                <span className="text-default-500">冻结时间：</span>
                                <span className="font-medium">{pkg.frozen_at || '-'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-default-400">
                暂无冻结套餐
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onPress={onFrozenClose}>
              关闭
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 补偿领取成功 Modal */}
      <Modal isOpen={isClaimSuccessOpen} onClose={onClaimSuccessClose} size="sm">
        <ModalContent>
          <ModalBody className="py-8">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                <Gift className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-xl font-bold text-default-900">领取成功</h3>
              {claimResult && (
                <p className="text-default-600">
                  「{claimResult.title}」已为您增加
                  <span className="font-bold text-success mx-1">{claimResult.days} 天</span>
                  {claimResult.level ? `「${claimResult.level}」` : ''}会员时长
                </p>
              )}
              <p className="text-xs text-default-400">
                补偿时长已追加到您的套餐，可在「当前套餐」处查看更新后的到期时间
              </p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" className="w-full" onPress={onClaimSuccessClose}>
              我知道了
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
