import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardBody, Chip, Divider, Input, Spinner } from '@heroui/react';
import { motion } from 'framer-motion';
import {
  Copy,
  Gift,
  Link as LinkIcon,
  Users,
  Calendar,
  Sparkles,
  RefreshCw,
  Info,
  Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { inviteCashbackApi, inviteUserApi, type InviteCashbackOverview } from '../../../services/userApi';
import { useWhiteLabel } from '../../../contexts/WhiteLabelContext';
import { toast } from '../../../utils/toast';

interface InviteOverviewData {
  inviter_id: number;
  inviter_code: string;
  invite_link: string;
  invite_eligible: boolean;
  history_package_value: number;
  min_history_package_value: number;
  invite_ineligible_reason: string;
  invitees_count: number;
  granted_orders_count: number;
  total_duration_days: number;
  reward_policy_summary?: {
    reward_mode: 'duration' | 'cash';
    reward_ratio: number;
    reward_ratio_percent: number;
    invitee_reward_ratio?: number;
    invitee_reward_ratio_percent?: number;
    has_package_specific_rules: boolean;
    min_reward_duration_days: number;
  };
}

interface InviteOrderRecord {
  order_id: string;
  package_id: number;
  package_name: string;
  package_price: number;
  reward_mode?: string;
  reward_status?: string;
  reward_ratio?: number | null;
  reward_amount?: number;
  reward_days?: number;
  reward_order_index?: number | null;
  created_at: string;
}

interface InviteeRecord {
  user_id: number;
  masked: string;
  created_at: string;
  orders_by_package: Array<{ package_name: string; count: number }>;
  orders: InviteOrderRecord[];
  total_reward_days?: number;
  total_reward_amount?: number;
}

const copyText = async (text: string, successMessage: string) => {
  if (!text) {
    toast.warning('暂无可复制内容');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch (error) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (copied) {
      toast.success(successMessage);
      return;
    }
    toast.error('复制失败，请手动复制');
  }
};

export const InviteTab: React.FC = () => {
  const [overview, setOverview] = useState<InviteOverviewData | null>(null);
  const [cashbackOverview, setCashbackOverview] = useState<InviteCashbackOverview | null>(null);
  const [invitees, setInvitees] = useState<InviteeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingCashback, setActivatingCashback] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { isWhiteLabel, loading: whiteLabelLoading } = useWhiteLabel();
  const navigate = useNavigate();
  const fetchInviteData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      const requests = [
        inviteUserApi.getOverview(),
        inviteUserApi.getRecords(),
        !whiteLabelLoading && !isWhiteLabel ? inviteCashbackApi.getOverview() : Promise.resolve(null),
      ] as const;
      const [overviewResponse, recordsResponse, cashbackResponse] = await Promise.all(requests);

      if (overviewResponse.code !== 20000) {
        throw new Error(overviewResponse.msg || '获取邀请总览失败');
      }
      if (recordsResponse.code !== 20000) {
        throw new Error(recordsResponse.msg || '获取邀请记录失败');
      }

      setOverview(overviewResponse.data || null);
      setInvitees(Array.isArray(recordsResponse.data?.invitees) ? recordsResponse.data.invitees : []);
      // Cashback is self-site-only. Do not retain a prior response after the site mode changes.
      if (isWhiteLabel || whiteLabelLoading) {
        setCashbackOverview(null);
      } else if (cashbackResponse?.code === 20000) {
        setCashbackOverview(cashbackResponse.data || null);
      } else {
        setCashbackOverview(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取邀请信息失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchInviteData();
    // Site-mode changes must discard any prior self-site cashback response.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWhiteLabel, whiteLabelLoading]);

  const filteredInvitees = useMemo(() => {
    if (!searchTerm.trim()) {
      return invitees;
    }
    const keyword = searchTerm.trim().toLowerCase();
    return invitees.filter((invitee) => {
      const packageNames = invitee.orders_by_package.map((item) => item.package_name).join(' ');
      return invitee.masked.toLowerCase().includes(keyword) || packageNames.toLowerCase().includes(keyword);
    });
  }, [invitees, searchTerm]);

  const refreshCashback = async () => {
    if (isWhiteLabel) return;
    const response = await inviteCashbackApi.getOverview();
    if (response.code === 20000) {
      setCashbackOverview(response.data || null);
    }
  };


  const activateCashback = async () => {
    try {
      setActivatingCashback(true);
      const response = await inviteCashbackApi.activate();
      if (response.code !== 20000) throw new Error(response.msg || '开启返现活动失败');
      setCashbackOverview(response.data || null);
      toast.success(response.msg || '返现活动已开启');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '开启返现活动失败');
    } finally {
      setActivatingCashback(false);
    }
  };

  const withdrawCashback = async () => {
    try {
      const response = await inviteCashbackApi.withdraw();
      if (response.code !== 20000) throw new Error(response.msg || '提现申请失败');
      toast.success(response.msg || '提现申请已提交');
      await refreshCashback();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '提现申请失败');
    }
  };

  const activeCashbackCampaign = cashbackOverview?.active_campaign;
  const cashbackEligibility = cashbackOverview?.eligibility;
  const cashbackSummary = cashbackOverview?.cashback_summary;
  const cashbackWithdrawal = cashbackOverview?.withdrawal;
  const cashbackAvailable = cashbackSummary?.available_amount ?? 0;
  const canWithdraw = Boolean(cashbackWithdrawal?.enabled && cashbackAvailable >= (cashbackWithdrawal?.min_amount ?? 0));
  const cashbackActiveForUser = Boolean(activeCashbackCampaign && cashbackOverview?.enrollment);

  if (loading) {

    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Spinner size="lg" label="正在加载邀请数据..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="text-danger text-lg font-semibold">邀请信息加载失败</div>
          <div className="text-default-500 text-sm">{error}</div>
          <Button color="primary" onPress={() => fetchInviteData()} startContent={<RefreshCw className="w-4 h-4" />}>
            重试
          </Button>
        </CardBody>
      </Card>
    );
  }

  const inviteLink = overview?.invite_link || '';
  const inviterCode = overview?.inviter_code || '';
  const rewardModeText = overview?.reward_policy_summary?.reward_mode === 'cash' ? '返现' : '返时长';
  const rewardRatioPercent = overview?.reward_policy_summary?.reward_ratio_percent ?? 0;
  const inviteeRewardRatioPercent = overview?.reward_policy_summary?.invitee_reward_ratio_percent ?? 5;
  const hasPackageSpecificRules = Boolean(overview?.reward_policy_summary?.has_package_specific_rules);
  const inviteEligible = Boolean(overview?.invite_eligible);
  const historyPackageValue = overview?.history_package_value ?? 0;
  const minHistoryPackageValue = overview?.min_history_package_value ?? 45;

  return (
    <motion.div initial={false} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Gift className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-default-900">邀请好友</h1>
            <p className="text-sm text-default-500 mt-1">复制您的邀请链接或邀请码，好友注册并成功支付后，您将获得平台奖励。</p>
          </div>
        </div>
        <Button
          color="primary"
          variant="flat"
          isLoading={refreshing}
          startContent={!refreshing ? <RefreshCw className="w-4 h-4" /> : undefined}
          onPress={() => fetchInviteData(true)}
        >
          刷新数据
        </Button>
      </div>

      {!isWhiteLabel && cashbackOverview?.config_enabled && (
        <Card className="border border-success/20">
          <CardBody className="p-6 space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-success font-semibold"><Wallet className="w-4 h-4" />邀请返现活动</div>
                <h2 className="mt-2 text-xl font-bold text-default-900">{activeCashbackCampaign?.copywriting.headline || cashbackOverview.ended_campaign?.name || '邀请返现'}</h2>
                {activeCashbackCampaign && <p className="mt-1 text-sm text-default-500">活动截止至：{activeCashbackCampaign.ends_at}</p>}
              </div>
            </div>
            {activeCashbackCampaign ? <>
              {cashbackOverview.enrollment ? (
                <div className="rounded-xl bg-success/10 border border-success/20 p-4 text-sm text-success-700">您已{activeCashbackCampaign.auto_enroll_eligible ? '自动' : ''}参加本期活动，好友完成符合条件的个人现金订阅后，返现将自动计入可提现余额。</div>
              ) : (
                <div className="rounded-xl bg-warning/10 border border-warning/20 p-4 text-sm text-default-700 space-y-3"><div className="font-medium text-default-900">{activeCashbackCampaign.auto_enroll_eligible ? '本期活动已自动开放，达到资格后立即生效' : '达到资格后可手动开启本期返现'}</div><div>账号注册：{cashbackEligibility?.account_age_days ?? 0} / {cashbackEligibility?.account_age_required ?? 0} 天</div><div>累计实付：¥{(cashbackEligibility?.cash_paid_amount ?? 0).toFixed(2)} / ¥{(cashbackEligibility?.cash_paid_required ?? 0).toFixed(2)}，或累计套餐：{cashbackEligibility?.package_duration_days ?? 0} / {cashbackEligibility?.package_duration_required ?? 0} 天</div>{cashbackEligibility?.eligible && !activeCashbackCampaign.auto_enroll_eligible && <Button color="success" isLoading={activatingCashback} onPress={activateCashback}>开启本期返现</Button>}</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div className="rounded-xl bg-default-50 p-4"><div className="text-sm text-default-500">可提现返现</div><div className="mt-1 text-xl font-bold">¥{cashbackAvailable.toFixed(2)}</div></div><div className="rounded-xl bg-default-50 p-4"><div className="text-sm text-default-500">提现处理中</div><div className="mt-1 text-xl font-bold">¥{(cashbackSummary?.withdraw_pending_amount ?? 0).toFixed(2)}</div></div><div className="rounded-xl bg-default-50 p-4"><div className="text-sm text-default-500">已提现</div><div className="mt-1 text-xl font-bold">¥{(cashbackSummary?.withdraw_done_amount ?? 0).toFixed(2)}</div></div></div>
              {cashbackOverview.enrollment && <Button variant="flat" color="primary" startContent={<Copy className="w-4 h-4" />} onPress={() => copyText(cashbackOverview.share_copy, '活动分享文案已复制')}>复制活动分享文案</Button>}
              <div className="flex flex-col gap-3 rounded-xl border border-default-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="text-sm text-default-600"><div className="font-medium text-default-900">返现提现</div><div className="mt-1">{cashbackWithdrawal?.notice || '请先在个人中心填写支付宝收款信息。'} 最低提现 ¥{(cashbackWithdrawal?.min_amount ?? 0).toFixed(2)}。</div></div><div className="flex gap-2 shrink-0"><Button variant="flat" onPress={() => navigate('/user-center?tab=profile', { state: { openEdit: 'payment_info' } })}>设置收款信息</Button><Button color="success" isDisabled={!canWithdraw} onPress={withdrawCashback}>申请提现</Button></div></div>
            </> : cashbackOverview.ended_campaign ? <div className="rounded-xl bg-default-100 p-4 text-sm text-default-600">{cashbackOverview.ended_campaign.ended_message}</div> : <div className="rounded-xl bg-default-100 p-4 text-sm text-default-600">当前暂无进行中的返现活动。</div>}
          </CardBody>
        </Card>
      )}

      {!cashbackActiveForUser && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardBody className="p-5"><div className="flex items-center gap-3"><Users className="w-5 h-5 text-primary" /><div><div className="text-sm text-default-500">邀请人数</div><div className="text-2xl font-bold text-default-900">{overview?.invitees_count ?? 0}</div></div></div></CardBody></Card>
          <Card><CardBody className="p-5"><div className="flex items-center gap-3"><Sparkles className="w-5 h-5 text-success" /><div><div className="text-sm text-default-500">奖励订单数</div><div className="text-2xl font-bold text-default-900">{overview?.granted_orders_count ?? 0}</div></div></div></CardBody></Card>
          <Card><CardBody className="p-5"><div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-warning" /><div><div className="text-sm text-default-500">累计返时长</div><div className="text-2xl font-bold text-default-900">{overview?.total_duration_days ?? 0} 天</div></div></div></CardBody></Card>
        </div>
      )}

      <Card>
        <CardBody className="p-6 space-y-5">
          <div className="flex items-center gap-2 text-default-800 font-semibold">
            <LinkIcon className="w-4 h-4 text-primary" />
            分享给好友
          </div>

          {!inviteEligible ? (
            <div className="rounded-xl bg-warning/10 border border-warning/20 p-4 text-sm text-default-700 leading-7">
              <div className="font-semibold text-default-900 mb-1">暂未开启邀请功能</div>
              <div>{overview?.invite_ineligible_reason || `历史套餐价值满 ${minHistoryPackageValue} 元后才可邀请好友。`}</div>
              <div>当前历史套餐价值：<span className="font-medium text-default-900">{historyPackageValue}</span> 元 / <span className="font-medium text-default-900">{minHistoryPackageValue}</span> 元</div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex-1">
                  <Input
                    label="邀请链接"
                    value={inviteLink}
                    isReadOnly
                    description="推荐直接分享注册链接，好友打开后会自动带上您的邀请码。"
                  />
                </div>
                <div className="flex items-center h-14 shrink-0">
                  <Button
                    color="primary"
                    variant="solid"
                    className="h-10 min-w-[112px]"
                    onPress={() => copyText(inviteLink, '邀请链接已复制')}
                    startContent={<Copy className="w-4 h-4" />}
                  >
                    复制链接
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex-1">
                  <Input
                    label="邀请码"
                    value={inviterCode}
                    isReadOnly
                    description="也可以单独复制邀请码，好友注册时展开邀请码输入框填写即可。"
                  />
                </div>
                <div className="flex items-center h-14 shrink-0">
                  <Button
                    color="primary"
                    variant="solid"
                    className="h-10 min-w-[112px]"
                    onPress={() => copyText(inviterCode, '邀请码已复制')}
                    startContent={<Copy className="w-4 h-4" />}
                  >
                    复制邀请码
                  </Button>
                </div>
              </div>
            </>
          )}

          {!cashbackActiveForUser && <>
            <Divider />
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 text-sm text-default-700 leading-7 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-default-900 mb-2"><Info className="w-4 h-4 text-primary" />邀请说明</div>
              <div>1. 历史套餐价值满 <span className="font-medium text-default-900">{minHistoryPackageValue} 元</span> 后，可通过专属链接或邀请码邀请好友。</div>
              <div>2. 当前默认邀请奖励类型：<span className="font-medium text-default-900">{rewardModeText}</span>，邀请人奖励比例约为 <span className="font-medium text-default-900">{rewardRatioPercent}%</span>，被邀请人默认加赠 <span className="font-medium text-default-900">{inviteeRewardRatioPercent}%</span> 时长。</div>
              <div>3. 返时长奖励按您当前可享受的最高套餐等级计算，且不会超过被邀请人本次实际订阅等级。</div>
              <div>4. 好友支付或使用 CDK 激活成功后，系统会按实际订单结算。</div>
              {hasPackageSpecificRules && <div className="text-xs text-primary-700 bg-primary/8 rounded-lg px-3 py-2">您当前存在套餐级单独邀请规则，不同套餐的实际奖励比例可能不同。</div>}
            </div>
          </>}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-default-900">我邀请的好友</h2>
              <p className="text-sm text-default-500 mt-1">仅展示脱敏后的好友标识、套餐和{cashbackActiveForUser ? '返现' : '返时长'}明细。</p>
            </div>
            <Input
              className="w-full md:w-72"
              placeholder="搜索好友标识或套餐名称"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {filteredInvitees.length === 0 ? (
            <div className="py-12 text-center text-default-500 text-sm">暂无邀请记录，快去复制邀请链接分享给好友吧。</div>
          ) : (
            <div className="space-y-4">
              {filteredInvitees.map((invitee) => {
                const durationOrders = (invitee.orders || []).filter((order) => Number(order.reward_days || 0) > 0);
                const cashbackOrders = (invitee.orders || []).filter((order) => order.reward_mode === 'cash' && Number(order.reward_amount || 0) > 0);
                const cashbackTotal = Number(invitee.total_reward_amount || 0);
                return (
                  <Card key={invitee.user_id} className="border border-default-100 shadow-sm">
                    <CardBody className="p-5 space-y-4">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-default-900">{invitee.masked}</div>
                          <div className="text-sm text-default-500 mt-1">注册时间：{invitee.created_at || '-'}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Chip color="primary" variant="flat">已购套餐 {invitee.orders_by_package?.reduce((sum, item) => sum + item.count, 0) || 0} 笔</Chip>
                          {cashbackActiveForUser ? <Chip color="warning" variant="flat">累计返现 ¥{cashbackTotal.toFixed(2)}</Chip> : <Chip color="success" variant="flat">累计返时长 {invitee.total_reward_days || 0} 天</Chip>}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(invitee.orders_by_package || []).map((item) => (
                          <Chip key={`${invitee.user_id}-${item.package_name}`} variant="bordered" size="sm">
                            {item.package_name} × {item.count}
                          </Chip>
                        ))}
                      </div>

                      {cashbackActiveForUser ? (
                        cashbackOrders.length > 0 ? <div className="space-y-2"><div className="text-sm font-medium text-default-700">返现明细</div>{cashbackOrders.map((order) => <div key={order.order_id} className="rounded-lg bg-warning/10 px-4 py-3 text-sm text-default-700 flex flex-col md:flex-row md:items-center md:justify-between gap-2"><div><div className="font-medium text-default-900">{order.package_name}</div><div className="text-default-500">订单时间：{order.created_at || '-'}{order.reward_ratio != null ? ` · 返现比例 ${(Number(order.reward_ratio) * 100).toFixed(2)}%` : ''}</div></div><Chip color="warning" variant="flat">返现 ¥{Number(order.reward_amount || 0).toFixed(2)}</Chip></div>)}</div> : <div className="rounded-lg bg-default-50 px-4 py-3 text-sm text-default-500">该好友暂未产生返现。</div>
                      ) : durationOrders.length > 0 ? (
                        <div className="space-y-2"><div className="text-sm font-medium text-default-700">返时长明细</div><div className="space-y-2">{durationOrders.map((order) => <div key={order.order_id} className="rounded-lg bg-default-50 px-4 py-3 text-sm text-default-700 flex flex-col md:flex-row md:items-center md:justify-between gap-2"><div><div className="font-medium text-default-900">{order.package_name}</div><div className="text-default-500">订单时间：{order.created_at || '-'} · 第 {order.reward_order_index || '-'} 单</div></div><Chip color="success" variant="flat">返时长 {order.reward_days || 0} 天</Chip></div>)}</div></div>
                      ) : (
                        <div className="rounded-lg bg-default-50 px-4 py-3 text-sm text-default-500 leading-6">该好友暂未产生返时长奖励。</div>
                      )}
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </motion.div>
  );
};
