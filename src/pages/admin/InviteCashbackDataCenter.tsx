import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardBody, Chip, Input, Pagination, Select, SelectItem, Spinner, Switch, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react';
import { BarChart3, RefreshCw, Search, Users, Wallet } from 'lucide-react';
import dayjs from 'dayjs';
import adminApiService from '../../services/adminApi';
import { InviteCashbackCampaign, InviteCashbackOverviewData, InviteCashbackUserRecord } from '../../types/admin';
import { showToast } from '../../components/Toast';

interface Props { campaigns: InviteCashbackCampaign[] }
const PAGE_SIZE = 20;

export const InviteCashbackDataCenter: React.FC<Props> = ({ campaigns }) => {
  const [campaignId, setCampaignId] = useState('');
  const [overview, setOverview] = useState<InviteCashbackOverviewData | null>(null);
  const [users, setUsers] = useState<InviteCashbackUserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [rewardedOnly, setRewardedOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (campaignId && campaigns.some(item => item.id === campaignId)) return;
    const active = campaigns.find(item => item.enabled && dayjs().isAfter(dayjs(item.starts_at)) && dayjs().isBefore(dayjs(item.ends_at)));
    setCampaignId((active || campaigns[0])?.id || '');
  }, [campaignId, campaigns]);

  const load = useCallback(async () => {
    if (!campaignId) { setOverview(null); setUsers([]); setTotal(0); return; }
    setLoading(true);
    try {
      const [overviewResponse, usersResponse] = await Promise.all([
        adminApiService.getInviteCashbackOverview(campaignId),
        adminApiService.getInviteCashbackUsers({ campaign_id: campaignId, querystring: query || undefined, rewarded_only: rewardedOnly, current_page: page, page_size: PAGE_SIZE }),
      ]);
      if (overviewResponse.code !== 20000) throw new Error(overviewResponse.msg || '获取活动总览失败');
      if (usersResponse.code !== 20000) throw new Error(usersResponse.msg || '获取返现用户失败');
      setOverview(overviewResponse.data || null);
      setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
      setTotal(Number(usersResponse.total) || 0);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取返现数据失败', 'error');
      setOverview(null); setUsers([]); setTotal(0);
    } finally { setLoading(false); }
  }, [campaignId, page, query, rewardedOnly]);

  useEffect(() => { void load(); }, [load]);
  const summary = overview?.summary;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return <Card><CardBody className="space-y-5">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div><div className="flex items-center gap-2 font-semibold"><BarChart3 className="h-5 w-5 text-primary" />返现活动数据中心</div><p className="mt-1 text-sm text-default-500">查看某场活动的参与、返现、余额和具体获利用户。</p></div>
      <div className="flex flex-wrap items-end gap-2"><Select label="选择活动" className="w-64" selectedKeys={campaignId ? [campaignId] : []} onSelectionChange={keys => { setCampaignId(String(Array.from(keys)[0] || '')); setPage(1); }}>{campaigns.map(campaign => <SelectItem key={campaign.id}>{campaign.name}</SelectItem>)}</Select><Button isIconOnly variant="flat" aria-label="刷新返现活动数据" onPress={load}><RefreshCw className="h-4 w-4" /></Button></div>
    </div>
    {!campaignId ? <div className="py-8 text-center text-default-500">请先创建返现活动</div> : loading && !overview ? <div className="py-8 text-center"><Spinner label="加载活动数据..." /></div> : <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="自动参与用户" value={summary?.enrolled_users || 0} icon={<Users className="h-4 w-4" />} />
        <Metric label="有返现邀请人" value={summary?.rewarded_inviters || 0} />
        <Metric label="产生返现下级" value={summary?.rewarded_invitees || 0} />
        <Metric label="返现订单" value={summary?.reward_orders || 0} />
        <Metric label="返现基数" value={`¥${Number(summary?.cashback_basis_amount || 0).toFixed(2)}`} />
        <Metric label="累计返现" value={`¥${Number(summary?.reward_amount || 0).toFixed(2)}`} icon={<Wallet className="h-4 w-4" />} />
        <Metric label="可提现 / 提现中" value={`¥${Number(summary?.available_amount || 0).toFixed(2)} / ¥${Number(summary?.withdraw_pending_amount || 0).toFixed(2)}`} />
        <Metric label="已提现" value={`¥${Number(summary?.withdraw_done_amount || 0).toFixed(2)}`} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end"><Input label="搜索返现用户" placeholder="用户ID、用户名或邮箱" value={queryInput} onValueChange={setQueryInput} onKeyDown={event => event.key === 'Enter' && (() => { setQuery(queryInput.trim()); setPage(1); })()} /><Button color="primary" variant="flat" startContent={<Search className="h-4 w-4" />} onPress={() => { setQuery(queryInput.trim()); setPage(1); }}>搜索</Button><Switch isSelected={rewardedOnly} onValueChange={value => { setRewardedOnly(value); setPage(1); }}>只看已有返现</Switch></div>
      <Table aria-label="返现用户榜单"><TableHeader><TableColumn>用户</TableColumn><TableColumn>参与时间</TableColumn><TableColumn>返现下级/订单</TableColumn><TableColumn>返现基数</TableColumn><TableColumn>累计返现</TableColumn><TableColumn>余额状态</TableColumn></TableHeader><TableBody isLoading={loading} loadingContent={<Spinner label="加载中..." />} emptyContent="暂无返现用户">{users.map(user => <TableRow key={user.user_id}><TableCell><div><div className="font-medium">#{user.user_id} · {user.username || '未设置用户名'}</div><div className="text-xs text-default-500">{user.email}</div></div></TableCell><TableCell>{user.activated_at ? dayjs(user.activated_at).format('YYYY-MM-DD HH:mm') : '-'}</TableCell><TableCell>{user.rewarded_invitees} 人 / {user.reward_orders} 单</TableCell><TableCell>¥{user.cashback_basis_amount.toFixed(2)}</TableCell><TableCell><Chip color="warning" variant="flat">¥{user.reward_amount.toFixed(2)}</Chip></TableCell><TableCell><div className="text-xs leading-5"><div>可提 ¥{user.available_amount.toFixed(2)}</div><div>处理中 ¥{user.withdraw_pending_amount.toFixed(2)}</div><div>已提 ¥{user.withdraw_done_amount.toFixed(2)}</div></div></TableCell></TableRow>)}</TableBody></Table>
      <div className="flex items-center justify-between text-sm text-default-500"><span>共 {total} 人</span><Pagination total={pages} page={page} onChange={setPage} showControls /></div>
    </>}
  </CardBody></Card>;
};

const Metric: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> = ({ label, value, icon }) => <div className="rounded-xl bg-default-50 p-4"><div className="flex items-center gap-2 text-sm text-default-500">{icon}{label}</div><div className="mt-1 text-xl font-bold text-default-900">{value}</div></div>;
