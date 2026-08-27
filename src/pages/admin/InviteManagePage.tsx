import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  NumberInput,
  Pagination,
  Select,
  SelectItem,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea,
  useDisclosure,
} from '@heroui/react';
import { Filter, Gift, RefreshCw, Save, Search, Settings2, Ticket, Users, Wallet } from 'lucide-react';
import dayjs from 'dayjs';
import adminApiService from '../../services/adminApi';
import { InviteCashbackConfig, InvitePolicyConfig, InviteRewardRecord, User, WorkOrder } from '../../types/admin';
import { showToast } from '../../components/Toast';
import InviteCashbackConfigEditor from './InviteCashbackConfigEditor';
import { InviteCashbackDataCenter } from './InviteCashbackDataCenter';

interface InvitePolicyFormState {
  enabled: boolean;
  reward_mode: 'duration';
  reward_ratio: string;
  max_reward_order_count: string;
  package_rules: string;
}

const createDefaultPolicyForm = (): InvitePolicyFormState => ({
  enabled: true,
  reward_mode: 'duration',
  reward_ratio: '0.10',
  max_reward_order_count: '3',
  package_rules: '{}',
});

const createDefaultCashbackConfig = (): InviteCashbackConfig => ({
  enabled: false,
  withdrawal: { enabled: false, min_amount: 100, notice: '提现暂未开放' },
  campaigns: [],
});

const INVITER_PAGE_SIZE = 10;

const buildPolicyPayload = (form: InvitePolicyFormState) => ({
  enabled: form.enabled,
  reward_mode: form.reward_mode,
  reward_ratio: Number(form.reward_ratio || 0),
  max_reward_order_count: Number(form.max_reward_order_count || 0),
  package_rules: form.package_rules.trim() ? JSON.parse(form.package_rules) : {},
});

const mapPolicyToForm = (policy?: any): InvitePolicyFormState => ({
  enabled: policy?.enabled !== false,
  reward_mode: 'duration',
  reward_ratio: String(policy?.reward_ratio ?? '0.10'),
  max_reward_order_count: String(policy?.max_reward_order_count ?? 3),
  package_rules: JSON.stringify(policy?.package_rules || {}, null, 2),
});

const formatInviterRuleSummary = (user: User) => {
  const override = user.preferences?.invite_policy_override;
  if (!override || typeof override !== 'object' || Object.keys(override).length === 0) {
    return '默认规则';
  }
  const modeText = '返时长';
  const ratioText = override.reward_ratio ? `${Number(override.reward_ratio) * 100}%` : '-';
  const countText = override.max_reward_order_count ? `前${override.max_reward_order_count}单` : '未设置';
  return `${modeText} / ${ratioText} / ${countText}`;

};

const InviteManagePage: React.FC = () => {
  const [policyLoading, setPolicyLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [globalPolicyForm, setGlobalPolicyForm] = useState<InvitePolicyFormState>(createDefaultPolicyForm());
  const [cashbackLoading, setCashbackLoading] = useState(true);
  const [savingCashback, setSavingCashback] = useState(false);
  const [cashbackConfig, setCashbackConfig] = useState<InviteCashbackConfig>(createDefaultCashbackConfig());

  const [rewardModeFilter, setRewardModeFilter] = useState<'all' | 'duration' | 'cash'>('all');
  const [rewardStatusFilter, setRewardStatusFilter] = useState<string>('all');
  const [rewardSearchInput, setRewardSearchInput] = useState('');
  const [rewardSearch, setRewardSearch] = useState('');
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [inviteRewards, setInviteRewards] = useState<InviteRewardRecord[]>([]);
  const [rewardsPage, setRewardsPage] = useState(1);
  const [rewardsPageSize, setRewardsPageSize] = useState(20);
  const [rewardsTotal, setRewardsTotal] = useState(0);
  const [rewardsTotalPages, setRewardsTotalPages] = useState(1);

  const [workordersLoading, setWorkordersLoading] = useState(true);
  const [workorders, setWorkorders] = useState<WorkOrder[]>([]);
  const [selectedWorkorder, setSelectedWorkorder] = useState<WorkOrder | null>(null);
  const [workorderStatus, setWorkorderStatus] = useState('pending');
  const [workorderRemark, setWorkorderRemark] = useState('');
  const [updatingWorkorder, setUpdatingWorkorder] = useState(false);
  const { isOpen: isWorkorderOpen, onOpen: onWorkorderOpen, onClose: onWorkorderClose } = useDisclosure();

  const [usersLoading, setUsersLoading] = useState(true);
  const [usersSearchInput, setUsersSearchInput] = useState('');
  const [usersSearch, setUsersSearch] = useState('');
  const [inviterUsers, setInviterUsers] = useState<User[]>([]);
  const [inviterUsersPage, setInviterUsersPage] = useState(1);
  const [inviterUsersTotal, setInviterUsersTotal] = useState(0);
  const [inviterUsersTotalPages, setInviterUsersTotalPages] = useState(1);
  const [selectedInviter, setSelectedInviter] = useState<User | null>(null);
  const [inviterPolicyForm, setInviterPolicyForm] = useState<InvitePolicyFormState>(createDefaultPolicyForm());
  const [savingInviterPolicy, setSavingInviterPolicy] = useState(false);
  const { isOpen: isInviterOpen, onOpen: onInviterOpen, onClose: onInviterClose } = useDisclosure();

  const loadPolicy = useCallback(async () => {
    setPolicyLoading(true);
    try {
      const response = await adminApiService.getInvitePolicy();
      if (response.code !== 20000) {
        throw new Error(response.msg || '获取邀请规则失败');
      }
      const policy: InvitePolicyConfig = response.data?.policy || response.data;
      setGlobalPolicyForm({
        enabled: Boolean(policy?.enabled),
        reward_mode: 'duration',
        reward_ratio: String(policy?.default_policy?.reward_ratio ?? '0.10'),
        max_reward_order_count: String(policy?.default_policy?.max_reward_order_count ?? 3),
        package_rules: JSON.stringify(policy?.package_rules || {}, null, 2),
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取邀请规则失败', 'error');
    } finally {
      setPolicyLoading(false);
    }
  }, []);

  const loadCashbackConfig = useCallback(async () => {
    setCashbackLoading(true);
    try {
      const response = await adminApiService.getInviteCashback();
      if (response.code !== 20000) throw new Error(response.msg || '获取返现活动配置失败');
      const data = response.data;
      setCashbackConfig(data?.config || {
        enabled: data?.enabled ?? false,
        withdrawal: data?.withdrawal || createDefaultCashbackConfig().withdrawal,
        campaigns: data?.campaigns || [],
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取返现活动配置失败', 'error');
    } finally {
      setCashbackLoading(false);
    }
  }, []);

  const loadRewards = useCallback(async () => {
    setRewardsLoading(true);
    try {
      const params: Record<string, any> = {
        current_page: rewardsPage,
        page_size: rewardsPageSize,
      };
      if (rewardModeFilter !== 'all') params.invite_reward_mode = rewardModeFilter;
      if (rewardStatusFilter !== 'all') params.invite_reward_status = rewardStatusFilter;
      if (rewardSearch.trim()) {
        const numeric = Number(rewardSearch.trim());
        if (!Number.isNaN(numeric)) {
          params.inviter_id = numeric;
        }
      }
      const response = await adminApiService.getInviteRewards(params);
      if (response.code !== 20000) {
        throw new Error(response.msg || '获取邀请奖励流水失败');
      }
      setInviteRewards(Array.isArray(response.data) ? response.data : []);
      const t = Number(response.total) || 0;
      const nextTotalPages = Math.max(1, Math.ceil(t / rewardsPageSize));
      setRewardsTotal(t);
      setRewardsTotalPages(nextTotalPages);
      if (rewardsPage > nextTotalPages) setRewardsPage(nextTotalPages);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取邀请奖励流水失败', 'error');
      setInviteRewards([]);
      setRewardsTotal(0);
      setRewardsTotalPages(1);
    } finally {
      setRewardsLoading(false);
    }
  }, [rewardModeFilter, rewardSearch, rewardStatusFilter, rewardsPage, rewardsPageSize]);

  const loadWorkorders = useCallback(async () => {
    setWorkordersLoading(true);
    try {
      const response = await adminApiService.getWorkorders({ ticket_type: 'invite_withdraw' });
      if (response.code !== 20000) {
        throw new Error(response.msg || '获取提现工单失败');
      }
      setWorkorders(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取提现工单失败', 'error');
      setWorkorders([]);
    } finally {
      setWorkordersLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const response = await adminApiService.getUsers({
        current_page: inviterUsersPage,
        page_size: INVITER_PAGE_SIZE,
        querystring: usersSearch.trim() || undefined,
      });
      if (response.code !== 20000) {
        throw new Error(response.msg || '获取用户列表失败');
      }
      const list = Array.isArray(response.data) ? response.data : [];
      const total = Number(response.total) || 0;
      const nextTotalPages = Math.max(1, Math.ceil(total / INVITER_PAGE_SIZE));
      setInviterUsers(list);
      setInviterUsersTotal(total);
      setInviterUsersTotalPages(nextTotalPages);
      if (inviterUsersPage > nextTotalPages) setInviterUsersPage(nextTotalPages);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取用户列表失败', 'error');
      setInviterUsers([]);
      setInviterUsersTotal(0);
      setInviterUsersTotalPages(1);
    } finally {
      setUsersLoading(false);
    }
  }, [inviterUsersPage, usersSearch]);
  useEffect(() => { loadCashbackConfig(); }, [loadCashbackConfig]);

  useEffect(() => { loadPolicy(); }, [loadPolicy]);
  useEffect(() => { loadRewards(); }, [loadRewards]);
  useEffect(() => { loadWorkorders(); }, [loadWorkorders]);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  const applyUsersSearch = () => {
    const nextSearch = usersSearchInput.trim();
    if (inviterUsersPage === 1 && usersSearch === nextSearch) {
      loadUsers();
      return;
    }
    setInviterUsersPage(1);
    setUsersSearch(nextSearch);
  };

  const applyRewardFilters = () => {
    const nextSearch = rewardSearchInput.trim();
    if (rewardsPage === 1 && rewardSearch === nextSearch) {
      loadRewards();
      return;
    }
    setRewardsPage(1);
    setRewardSearch(nextSearch);
  };

  const handleSaveGlobalPolicy = async () => {
    setSavingPolicy(true);
    try {
      const payload = buildPolicyPayload(globalPolicyForm);
      const policy = {
        enabled: globalPolicyForm.enabled,
        bind_only_on_register: true,
        reward_only_paid_purchase: true,
        exclude_exchange_orders: true,
        default_policy: {
          reward_mode: 'duration',
          reward_ratio: payload.reward_ratio,
          max_reward_order_count: payload.max_reward_order_count,
        },
        package_rules: payload.package_rules,
      };
      const response = await adminApiService.updateInvitePolicy(policy);
      if (response.code !== 20000) throw new Error(response.msg || '保存邀请规则失败');
      showToast('全局邀请规则已保存', 'success');
      loadPolicy();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存邀请规则失败', 'error');
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleSaveCashbackConfig = async () => {
    setSavingCashback(true);
    try {
      const response = await adminApiService.updateInviteCashback(cashbackConfig);
      if (response.code !== 20000) throw new Error(response.msg || '保存返现活动配置失败');
      showToast('返现活动配置已保存', 'success');
      loadCashbackConfig();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存返现活动配置失败', 'error');
    } finally {
      setSavingCashback(false);
    }
  };

  const openInviterModal = (user: User) => {
    setSelectedInviter(user);
    setInviterPolicyForm(mapPolicyToForm(user.preferences?.invite_policy_override));
    onInviterOpen();
  };

  const handleSaveInviterPolicy = async () => {
    if (!selectedInviter) return;
    setSavingInviterPolicy(true);
    try {
      const payload = buildPolicyPayload(inviterPolicyForm);
      const response = await adminApiService.updateUser({
        id: selectedInviter.id,
        invite_policy_override: payload,
      });
      if (response.code !== 20000) {
        throw new Error(response.msg || '保存邀请人规则失败');
      }
      showToast('邀请人专属规则已保存', 'success');
      onInviterClose();
      loadUsers();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存邀请人规则失败', 'error');
    } finally {
      setSavingInviterPolicy(false);
    }
  };

  const handleResetInviterPolicy = async () => {
    if (!selectedInviter) return;
    setSavingInviterPolicy(true);
    try {
      const response = await adminApiService.updateUser({
        id: selectedInviter.id,
        invite_policy_override: {},
      });
      if (response.code !== 20000) {
        throw new Error(response.msg || '恢复默认规则失败');
      }
      showToast('已恢复为全局默认规则', 'success');
      onInviterClose();
      loadUsers();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '恢复默认规则失败', 'error');
    } finally {
      setSavingInviterPolicy(false);
    }
  };

  const openWorkorderModal = (workorder: WorkOrder) => {
    setSelectedWorkorder(workorder);
    setWorkorderStatus(workorder.status || 'pending');
    setWorkorderRemark(workorder.admin_remark || '');
    onWorkorderOpen();
  };

  const handleUpdateWorkorder = async () => {
    if (!selectedWorkorder) return;
    setUpdatingWorkorder(true);
    try {
      const response = await adminApiService.updateWorkorder({
        id: selectedWorkorder.id,
        status: workorderStatus,
        admin_remark: workorderRemark,
      });
      if (response.code !== 20000) {
        throw new Error(response.msg || '更新工单失败');
      }
      showToast('工单状态已更新', 'success');
      onWorkorderClose();
      loadWorkorders();
      loadRewards();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '更新工单失败', 'error');
    } finally {
      setUpdatingWorkorder(false);
    }
  };

  const renderRewardMode = (mode?: string) => {
    if (mode === 'cash') return <Chip color="warning" variant="flat">返现</Chip>;
    if (mode === 'duration') return <Chip color="success" variant="flat">返时长</Chip>;
    return <Chip variant="flat">-</Chip>;
  };

  const renderStatusChip = (status?: string) => {
    const mapping: Record<string, { color: 'default' | 'primary' | 'success' | 'warning' | 'danger'; text: string }> = {
      granted: { color: 'success', text: '已发放' },
      withdraw_pending: { color: 'warning', text: '提现处理中' },
      withdraw_done: { color: 'primary', text: '已提现' },
      skipped: { color: 'default', text: '已跳过' },
      pending: { color: 'warning', text: '待处理' },
      processing: { color: 'primary', text: '处理中' },
      paid: { color: 'success', text: '已打款' },
      rejected: { color: 'danger', text: '已拒绝' },
      cancelled: { color: 'default', text: '已取消' },
    };
    const item = mapping[status || ''] || { color: 'default' as const, text: status || '-' };
    return <Chip color={item.color} variant="flat">{item.text}</Chip>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Gift className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-default-800">邀请管理</h1>
      </div>

      <InviteCashbackDataCenter campaigns={cashbackConfig.campaigns} />
      <InviteCashbackConfigEditor
        config={cashbackConfig}
        isLoading={cashbackLoading}
        isSaving={savingCashback}
        onChange={setCashbackConfig}
        onSave={handleSaveCashbackConfig}
      />

      <Card>
        <CardHeader className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2"><Wallet className="w-4 h-4" /><span className="font-medium">邀请奖励流水</span></div>
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="筛选邀请人ID" value={rewardSearchInput} onValueChange={setRewardSearchInput} onKeyDown={(event) => event.key === 'Enter' && applyRewardFilters()} className="w-40" />
            <Select
              selectedKeys={[rewardModeFilter]}
              onSelectionChange={(keys) => {
                setRewardModeFilter(String(Array.from(keys)[0] || 'all') as 'all' | 'duration' | 'cash');
                setRewardsPage(1);
              }}
              className="w-36"
              aria-label="奖励模式筛选"
            >
              <SelectItem key="all">全部模式</SelectItem>
              <SelectItem key="duration">返时长</SelectItem>
              <SelectItem key="cash">返现</SelectItem>
            </Select>
            <Select
              selectedKeys={[rewardStatusFilter]}
              onSelectionChange={(keys) => {
                setRewardStatusFilter(String(Array.from(keys)[0] || 'all'));
                setRewardsPage(1);
              }}
              className="w-40"
              aria-label="奖励状态筛选"
            >
              <SelectItem key="all">全部状态</SelectItem>
              <SelectItem key="granted">已发放</SelectItem>
              <SelectItem key="withdraw_pending">提现处理中</SelectItem>
              <SelectItem key="withdraw_done">已提现</SelectItem>
              <SelectItem key="skipped">已跳过</SelectItem>
            </Select>
            <Button variant="flat" color="primary" startContent={<Filter className="w-4 h-4" />} onPress={applyRewardFilters}>筛选</Button>
          </div>
        </CardHeader>
        <CardBody>
          <Table aria-label="邀请奖励流水表格">
            <TableHeader>
              <TableColumn>订单号</TableColumn>
              <TableColumn>邀请人</TableColumn>
              <TableColumn>被邀请人</TableColumn>
              <TableColumn>套餐</TableColumn>
              <TableColumn>奖励模式</TableColumn>
              <TableColumn>奖励结果</TableColumn>
              <TableColumn>状态</TableColumn>
              <TableColumn>时间</TableColumn>
            </TableHeader>
            <TableBody isLoading={rewardsLoading} loadingContent={<Spinner label="加载中..." />} emptyContent="暂无邀请奖励流水">
              {inviteRewards.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.order_id}</TableCell>
                  <TableCell>{item.inviter_id}</TableCell>
                  <TableCell>{item.user_id}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.package_name}</div>
                      <div className="text-xs text-default-500">¥{item.package_price}</div>
                    </div>
                  </TableCell>
                  <TableCell>{renderRewardMode(item.invite_reward_mode)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{item.invite_reward_mode === 'cash' ? `¥${Number(item.invite_reward_amount || 0).toFixed(2)}` : `${Number(item.invite_reward_days || 0).toFixed(2)} 天`}</div>
                      {item.invite_cashback_campaign_id && <div className="text-xs text-default-500">活动：{item.invite_cashback_campaign_id}</div>}
                      {item.invite_reward_mode === 'cash' && <div className="text-xs text-default-500">返现基数：¥{Number(item.invite_cashback_basis_amount || 0).toFixed(2)}</div>}
                    </div>
                  </TableCell>
                  <TableCell>{renderStatusChip(item.invite_reward_status)}</TableCell>
                  <TableCell>
                    <div className="text-xs text-default-600 space-y-1 min-w-[160px]">
                      <div>创建：{item.created_at ? dayjs(item.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}</div>
                      <div>处理：{item.invite_reward_processed_at ? dayjs(item.invite_reward_processed_at).format('YYYY-MM-DD HH:mm:ss') : '-'}</div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-default-600">
              <span>每页</span>
              <Select
                aria-label="每页数量"
                selectedKeys={[String(rewardsPageSize)]}
                onSelectionChange={(keys) => {
                  setRewardsPageSize(Number(Array.from(keys)[0] || 20));
                  setRewardsPage(1);
                }}
                className="w-24"
              >
                <SelectItem key="20">20</SelectItem>
                <SelectItem key="50">50</SelectItem>
                <SelectItem key="100">100</SelectItem>
              </Select>
              <span>条，共 {rewardsTotal} 条</span>
            </div>
            <Pagination
              total={rewardsTotalPages}
              page={rewardsPage}
              onChange={setRewardsPage}
              showControls
              color="primary"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Ticket className="w-4 h-4" /><span className="font-medium">提现工单</span></div>
          <Button variant="flat" color="primary" startContent={<RefreshCw className="w-4 h-4" />} onPress={loadWorkorders}>刷新工单</Button>
        </CardHeader>
        <CardBody>
          <Table aria-label="提现工单表格">
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>用户</TableColumn>
              <TableColumn>金额</TableColumn>
              <TableColumn>状态</TableColumn>
              <TableColumn>收款信息</TableColumn>
              <TableColumn>操作</TableColumn>
            </TableHeader>
            <TableBody isLoading={workordersLoading} loadingContent={<Spinner label="加载中..." />} emptyContent="暂无提现工单">
              {workorders.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.user_id}</TableCell>
                  <TableCell>¥{Number(item.amount || 0).toFixed(2)}</TableCell>
                  <TableCell>{renderStatusChip(item.status)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>支付宝 · {item.extra_data?.withdraw_account?.real_name || '-'}</div>
                      <div className="text-xs text-default-500 truncate max-w-48">{item.extra_data?.withdraw_account?.account || '-'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" color="primary" variant="flat" onPress={() => openWorkorderModal(item)}>处理</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2"><Users className="w-4 h-4" /><span className="font-medium">邀请人专属规则</span></div>
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="搜索用户邮箱/用户名"
              value={usersSearchInput}
              onValueChange={setUsersSearchInput}
              onKeyDown={(event) => event.key === 'Enter' && applyUsersSearch()}
              className="w-56"
            />
            <Button variant="flat" color="primary" startContent={<Search className="w-4 h-4" />} onPress={applyUsersSearch}>查询</Button>
          </div>
        </CardHeader>
        <CardBody>
          <Table aria-label="邀请人专属规则表格">
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>用户</TableColumn>
              <TableColumn>邀请码</TableColumn>
              <TableColumn>当前规则</TableColumn>
              <TableColumn>操作</TableColumn>
            </TableHeader>
            <TableBody isLoading={usersLoading} loadingContent={<Spinner label="加载中..." />} emptyContent="暂无用户数据">
              {inviterUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.username || '未设置用户名'}</div>
                      <div className="text-xs text-default-500">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{user.inviter_code || '-'}</TableCell>
                  <TableCell>{formatInviterRuleSummary(user)}</TableCell>
                  <TableCell>
                    <Button size="sm" color="primary" variant="flat" onPress={() => openInviterModal(user)}>编辑规则</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-default-600">
              共 {inviterUsersTotal} 条，默认每页 {INVITER_PAGE_SIZE} 条
            </div>
            <Pagination
              total={inviterUsersTotalPages}
              page={inviterUsersPage}
              onChange={setInviterUsersPage}
              showControls
              color="primary"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Settings2 className="w-4 h-4" /><span className="font-medium">全局邀请规则</span></div>
          <Button color="primary" startContent={<Save className="w-4 h-4" />} isLoading={savingPolicy} onPress={handleSaveGlobalPolicy}>保存规则</Button>
        </CardHeader>
        <CardBody>
          {policyLoading ? (
            <div className="py-8 flex justify-center"><Spinner label="加载规则中..." /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Switch isSelected={globalPolicyForm.enabled} onValueChange={(checked) => setGlobalPolicyForm((prev) => ({ ...prev, enabled: checked }))}>
                  启用邀请返时长奖励
                </Switch>
              </div>
              <NumberInput label="默认奖励比例" value={globalPolicyForm.reward_ratio === '' ? undefined : Number(globalPolicyForm.reward_ratio)} onValueChange={(reward_ratio) => setGlobalPolicyForm((prev) => ({ ...prev, reward_ratio: Number.isNaN(reward_ratio) ? '' : String(reward_ratio) }))} minValue={0} maxValue={1} step={0.01} description="0.15 表示 15%" />
              <NumberInput label="默认奖励前 N 单" value={globalPolicyForm.max_reward_order_count === '' ? undefined : Number(globalPolicyForm.max_reward_order_count)} onValueChange={(max_reward_order_count) => setGlobalPolicyForm((prev) => ({ ...prev, max_reward_order_count: Number.isNaN(max_reward_order_count) ? '' : String(max_reward_order_count) }))} minValue={0} step={1} />
              <div className="md:col-span-2">
                <Textarea label="套餐覆盖规则 JSON（可选）" value={globalPolicyForm.package_rules} onValueChange={(package_rules) => setGlobalPolicyForm((prev) => ({ ...prev, package_rules }))} minRows={6} placeholder={'例如：{\n  "5": { "reward_ratio": 0.15 }\n}'} />
              </div>
            </div>
          )}
        </CardBody>
      </Card>
      <Modal isOpen={isInviterOpen} onClose={onInviterClose} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>编辑邀请人专属规则</ModalHeader>
          <ModalBody>
            {selectedInviter && (
              <div className="space-y-4">
                <Alert isVisible color="default" variant="flat" title={selectedInviter.username || selectedInviter.email} description={`邀请码：${selectedInviter.inviter_code || '-'}`} />
                <Switch isSelected={inviterPolicyForm.enabled} onValueChange={(checked) => setInviterPolicyForm((prev) => ({ ...prev, enabled: checked }))}>启用该邀请人的返时长规则</Switch>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NumberInput label="奖励比例" value={inviterPolicyForm.reward_ratio === '' ? undefined : Number(inviterPolicyForm.reward_ratio)} onValueChange={(reward_ratio) => setInviterPolicyForm((prev) => ({ ...prev, reward_ratio: Number.isNaN(reward_ratio) ? '' : String(reward_ratio) }))} minValue={0} maxValue={1} step={0.01} description="0.15 表示 15%" />
                  <NumberInput label="奖励前 N 单" value={inviterPolicyForm.max_reward_order_count === '' ? undefined : Number(inviterPolicyForm.max_reward_order_count)} onValueChange={(max_reward_order_count) => setInviterPolicyForm((prev) => ({ ...prev, max_reward_order_count: Number.isNaN(max_reward_order_count) ? '' : String(max_reward_order_count) }))} minValue={0} step={1} />
                </div>
                <Textarea label="套餐覆盖规则 JSON（可选）" value={inviterPolicyForm.package_rules} onValueChange={(package_rules) => setInviterPolicyForm((prev) => ({ ...prev, package_rules }))} minRows={6} placeholder={'例如：{\n  "5": { "reward_ratio": 0.2 }\n}'} />
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" color="danger" onPress={handleResetInviterPolicy} isLoading={savingInviterPolicy}>恢复默认</Button>
            <Button variant="light" onPress={onInviterClose}>取消</Button>
            <Button color="primary" onPress={handleSaveInviterPolicy} isLoading={savingInviterPolicy}>保存</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>


      <Modal isOpen={isWorkorderOpen} onClose={onWorkorderClose} size="lg">
        <ModalContent>
          <ModalHeader>处理提现工单</ModalHeader>
          <ModalBody>
            {selectedWorkorder && (
              <div className="space-y-4">
                <div className="text-sm text-default-600">工单 #{selectedWorkorder.id} · 用户 {selectedWorkorder.user_id}</div>
                <div className="text-sm text-default-600">申请金额：¥{Number(selectedWorkorder.amount || 0).toFixed(2)}</div>
                <Select label="工单状态" selectedKeys={[workorderStatus]} onSelectionChange={(keys) => setWorkorderStatus(String(Array.from(keys)[0] || 'pending'))}>
                  <SelectItem key="pending">待处理</SelectItem>
                  <SelectItem key="processing">处理中</SelectItem>
                  <SelectItem key="paid">已打款</SelectItem>
                  <SelectItem key="rejected">已拒绝</SelectItem>
                  <SelectItem key="cancelled">已取消</SelectItem>
                </Select>
                <Textarea label="管理员备注" value={workorderRemark} onValueChange={setWorkorderRemark} minRows={4} />
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onWorkorderClose}>取消</Button>
            <Button color="primary" isLoading={updatingWorkorder} onPress={handleUpdateWorkorder}>保存</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default InviteManagePage;
