import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tab,
  Tabs,
  useDisclosure,
} from '@heroui/react';
import {
  Eye,
  Filter,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  UserMinus,
  UsersRound,
  XCircle,
} from 'lucide-react';
import dayjs from 'dayjs';
import adminApiService from '../../services/adminApi';
import type {
  AdminTeamDetailData,
  AdminTeamMember,
  AdminTeamQueryParams,
  AdminTeamRecord,
  AdminTeamStatus,
  Package,
} from '../../types/admin';
import { showToast } from '../../components/Toast';

type MemberAction = 'suspend' | 'resume' | 'remove' | 'revoke';
type PendingAction =
  | { kind: 'member'; action: MemberAction; member: AdminTeamMember }
  | { kind: 'cancel-team'; team: AdminTeamRecord };

const TEAM_STATUS = {
  pending: { label: '待支付', color: 'warning' },
  active: { label: '生效中', color: 'success' },
  expired: { label: '已到期', color: 'default' },
  cancelled: { label: '已取消', color: 'danger' },
} as const;

const MEMBER_STATUS = {
  invited: { label: '待接受', color: 'warning' },
  active: { label: '正常', color: 'success' },
  suspended: { label: '已暂停', color: 'warning' },
  removed: { label: '已移除', color: 'danger' },
  left: { label: '已退出', color: 'default' },
} as const;

const ORDER_STATUS = {
  pending: { label: '待支付', color: 'warning' },
  paid: { label: '已支付', color: 'success' },
  failed: { label: '失败', color: 'danger' },
} as const;

const ORDER_TYPE = {
  team_initial: '首次购买',
  team_change: '套餐调整',
  team_renewal: '团队续费',
} as const;

const ACTION_TEXT: Record<MemberAction, { title: string; button: string; description: string; color: 'warning' | 'success' | 'danger' }> = {
  suspend: { title: '暂停团队成员', button: '确认暂停', description: '暂停后该成员将立即失去团队套餐权益，恢复后可重新使用。', color: 'warning' },
  resume: { title: '恢复团队成员', button: '确认恢复', description: '恢复后该成员将重新占用席位并获得团队套餐权益。', color: 'success' },
  remove: { title: '移除团队成员', button: '确认移除', description: '移除后该成员退出团队并释放席位，此操作不会删除用户账号。', color: 'danger' },
  revoke: { title: '撤销团队邀请', button: '确认撤销', description: '撤销后邀请立即失效并释放预留席位。', color: 'danger' },
};

const formatDate = (value?: string | null) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-';
const memberName = (member: AdminTeamMember) => member.username || member.email || `用户 #${member.user_id}`;

const TeamsManagePage: React.FC = () => {
  const [teams, setTeams] = useState<AdminTeamRecord[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | AdminTeamStatus>('all');
  const [packageId, setPackageId] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const detailModal = useDisclosure();
  const confirmModal = useDisclosure();
  const [selectedTeam, setSelectedTeam] = useState<AdminTeamRecord | null>(null);
  const [detail, setDetail] = useState<AdminTeamDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageSummary = useMemo(() => ({
    active: teams.filter((team) => team.status === 'active').length,
    pending: teams.filter((team) => team.status === 'pending').length,
    occupied: teams.reduce((sum, team) => sum + team.member_counts.active + team.member_counts.suspended, 0),
  }), [teams]);

  const packageOptions = useMemo(() => [
    { key: 'all', label: '全部套餐' },
    ...packages.map((item) => ({ key: String(item.id), label: `${item.package_name} · ${item.level}` })),
  ], [packages]);
  const loadTeams = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params: AdminTeamQueryParams = {
        current_page: page,
        page_size: pageSize,
        ...(query ? { querystring: query } : {}),
        ...(status !== 'all' ? { status } : {}),
        ...(packageId !== 'all' ? { package_id: Number(packageId) } : {}),
      };
      const response = await adminApiService.getTeams(params);
      if (response.code !== 20000) throw new Error(response.msg || '获取团队列表失败');
      const rows = Array.isArray(response.data) ? response.data : [];
      const nextTotal = Number(response.total) || 0;
      const nextPages = Math.max(1, Math.ceil(nextTotal / pageSize));
      setTeams(rows);
      setTotal(nextTotal);
      if (page > nextPages) setPage(nextPages);
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取团队列表失败';
      setTeams([]);
      setTotal(0);
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [packageId, page, pageSize, query, status]);

  const loadDetail = useCallback(async (teamId: number) => {
    setDetailLoading(true);
    try {
      const response = await adminApiService.getTeamDetail(teamId);
      if (response.code !== 20000 || !response.data) throw new Error(response.msg || '获取团队详情失败');
      setDetail(response.data);
      setSelectedTeam(response.data.team);
    } catch (error) {
      setDetail(null);
      showToast(error instanceof Error ? error.message : '获取团队详情失败', 'error');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { void loadTeams(); }, [loadTeams]);
  useEffect(() => {
    void adminApiService.getPackages({ current_page: 1, page_size: 100 }).then((response) => {
      if (response.code === 20000 && Array.isArray(response.data)) setPackages(response.data);
    }).catch(() => undefined);
  }, []);

  const applySearch = () => {
    const next = searchInput.trim();
    if (page === 1 && query === next) void loadTeams();
    else { setPage(1); setQuery(next); }
  };

  const resetFilters = () => {
    setSearchInput('');
    setQuery('');
    setStatus('all');
    setPackageId('all');
    setPage(1);
  };

  const openDetail = (team: AdminTeamRecord) => {
    setSelectedTeam(team);
    setDetail(null);
    detailModal.onOpen();
    void loadDetail(team.id);
  };

  const requestMemberAction = (action: MemberAction, member: AdminTeamMember) => {
    setPendingAction({ kind: 'member', action, member });
    confirmModal.onOpen();
  };

  const requestCancelTeam = (team: AdminTeamRecord) => {
    setPendingAction({ kind: 'cancel-team', team });
    confirmModal.onOpen();
  };

  const executeAction = async () => {
    if (!pendingAction || !selectedTeam) return;
    setActionLoading(true);
    try {
      const response = pendingAction.kind === 'cancel-team'
        ? await adminApiService.cancelPendingTeam(pendingAction.team.id)
        : await adminApiService.manageTeamMember(selectedTeam.id, pendingAction.member.id, pendingAction.action);
      if (response.code !== 20000) throw new Error(response.msg || '操作失败');
      showToast(response.msg || '操作成功', 'success');
      confirmModal.onClose();
      setPendingAction(null);
      await Promise.all([loadTeams(), loadDetail(selectedTeam.id)]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '操作失败', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const renderTeamStatus = (value: AdminTeamStatus) => {
    const config = TEAM_STATUS[value];
    return <Chip size="sm" variant="flat" color={config.color}>{config.label}</Chip>;
  };

  const renderMemberActions = (member: AdminTeamMember) => {
    if (member.role === 'owner' || selectedTeam?.status !== 'active') return <span className="text-xs text-default-400">-</span>;
    return (
      <div className="flex flex-wrap justify-end gap-2">
        {member.status === 'active' && <Button size="sm" variant="flat" color="warning" startContent={<PauseCircle className="h-3.5 w-3.5" />} onPress={() => requestMemberAction('suspend', member)}>暂停</Button>}
        {member.status === 'suspended' && <Button size="sm" variant="flat" color="success" startContent={<PlayCircle className="h-3.5 w-3.5" />} onPress={() => requestMemberAction('resume', member)}>恢复</Button>}
        {(member.status === 'active' || member.status === 'suspended') && <Button size="sm" variant="flat" color="danger" startContent={<UserMinus className="h-3.5 w-3.5" />} onPress={() => requestMemberAction('remove', member)}>移除</Button>}
        {member.status === 'invited' && <Button size="sm" variant="flat" color="danger" startContent={<XCircle className="h-3.5 w-3.5" />} onPress={() => requestMemberAction('revoke', member)}>撤销邀请</Button>}
        {!['active', 'suspended', 'invited'].includes(member.status) && <span className="text-xs text-default-400">历史记录</span>}
      </div>
    );
  };

  const confirmation = pendingAction?.kind === 'member' ? ACTION_TEXT[pendingAction.action] : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <UsersRound className="h-7 w-7 text-primary" />
          <div><h1 className="text-2xl font-bold text-default-800">团队管理</h1><p className="mt-1 text-sm text-default-500">查看全部团队、成员、邀请和团队订单</p></div>
        </div>
        <Button variant="flat" startContent={<RefreshCw className="h-4 w-4" />} isLoading={loading} onPress={() => void loadTeams()}>刷新</Button>
      </div>

      {loadError && <Alert color="danger" variant="flat" title="团队数据加载失败" description={loadError} />}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card shadow="sm"><CardBody><p className="text-sm text-default-500">团队总数</p><p className="mt-1 text-2xl font-bold">{total}</p></CardBody></Card>
        <Card shadow="sm"><CardBody><p className="text-sm text-default-500">本页生效团队</p><p className="mt-1 text-2xl font-bold text-success">{pageSummary.active}</p></CardBody></Card>
        <Card shadow="sm"><CardBody><p className="text-sm text-default-500">本页待支付</p><p className="mt-1 text-2xl font-bold text-warning">{pageSummary.pending}</p></CardBody></Card>
        <Card shadow="sm"><CardBody><p className="text-sm text-default-500">本页占用席位</p><p className="mt-1 text-2xl font-bold text-primary">{pageSummary.occupied}</p></CardBody></Card>
      </div>

      <Card>
        <CardHeader className="flex items-center gap-2"><Filter className="h-4 w-4" /><span className="font-medium">筛选团队</span></CardHeader>
        <CardBody className="gap-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_220px_auto]">
            <Input placeholder="团队名称、编号、所有者邮箱或用户名" value={searchInput} onValueChange={setSearchInput} onKeyDown={(event) => event.key === 'Enter' && applySearch()} startContent={<Search className="h-4 w-4 text-default-400" />} />
            <Select aria-label="团队状态" selectedKeys={[status]} onSelectionChange={(keys) => { setStatus(String(Array.from(keys)[0] || 'all') as 'all' | AdminTeamStatus); setPage(1); }}>
              <SelectItem key="all">全部状态</SelectItem><SelectItem key="pending">待支付</SelectItem><SelectItem key="active">生效中</SelectItem><SelectItem key="expired">已到期</SelectItem><SelectItem key="cancelled">已取消</SelectItem>
            </Select>
            <Select aria-label="团队套餐" selectedKeys={[packageId]} onSelectionChange={(keys) => { setPackageId(String(Array.from(keys)[0] || 'all')); setPage(1); }}>
              {packageOptions.map((item) => <SelectItem key={item.key}>{item.label}</SelectItem>)}
            </Select>
            <div className="flex gap-2"><Button color="primary" startContent={<Search className="h-4 w-4" />} onPress={applySearch}>搜索</Button><Button variant="bordered" onPress={resetFilters}>重置</Button></div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-default-500">
            <span>共 {total} 个团队</span>
            <Select aria-label="每页数量" size="sm" selectedKeys={[String(pageSize)]} onSelectionChange={(keys) => { setPageSize(Number(Array.from(keys)[0] || 20)); setPage(1); }} className="w-28"><SelectItem key="10">10 条/页</SelectItem><SelectItem key="20">20 条/页</SelectItem><SelectItem key="50">50 条/页</SelectItem></Select>
          </div>
        </CardBody>
      </Card>

      <Card><CardBody className="p-0">
        <Table aria-label="团队列表" isHeaderSticky classNames={{ wrapper: 'max-h-[680px] overflow-x-auto', table: 'min-w-[1180px]' }}>
          <TableHeader><TableColumn>团队</TableColumn><TableColumn>所有者</TableColumn><TableColumn>套餐</TableColumn><TableColumn>状态</TableColumn><TableColumn>席位</TableColumn><TableColumn>成员</TableColumn><TableColumn>有效期</TableColumn><TableColumn>创建时间</TableColumn><TableColumn align="end">操作</TableColumn></TableHeader>
          <TableBody items={teams} isLoading={loading} loadingContent={<Spinner label="加载团队中..." />} emptyContent={loadError ? '团队数据加载失败' : '暂无符合条件的团队'}>
            {(team) => <TableRow key={team.id}>
              <TableCell><div><p className="font-medium">{team.team_name}</p><p className="mt-1 text-xs text-default-400">团队 #{team.id}</p></div></TableCell>
              <TableCell><div><p className="text-sm">{team.owner?.username || '-'}</p><p className="text-xs text-default-400">{team.owner?.email || `用户 #${team.owner?.id || '-'}`}</p></div></TableCell>
              <TableCell><div><p className="text-sm font-medium">{team.package?.package_name || `套餐 #${team.pending_package_id || '-'}`}</p><p className="text-xs text-default-400">{team.package?.level || '-'}</p></div></TableCell>
              <TableCell>{renderTeamStatus(team.status)}</TableCell>
              <TableCell><span className="font-medium">{team.member_counts.active + team.member_counts.suspended}</span> / {team.seat_count}{team.member_counts.invited > 0 && <p className="text-xs text-warning">{team.member_counts.invited} 个邀请</p>}</TableCell>
              <TableCell><div className="flex flex-wrap gap-1"><Chip size="sm" variant="flat" color="success">正常 {team.member_counts.active}</Chip>{team.member_counts.suspended > 0 && <Chip size="sm" variant="flat" color="warning">暂停 {team.member_counts.suspended}</Chip>}</div></TableCell>
              <TableCell><p className="text-sm">{formatDate(team.expires_at)}</p>{team.pending_effective_at && <p className="mt-1 text-xs text-primary">待变更 {formatDate(team.pending_effective_at)}</p>}</TableCell>
              <TableCell><span className="text-sm">{formatDate(team.created_at)}</span></TableCell>
              <TableCell><div className="flex justify-end"><Button size="sm" color="primary" variant="flat" startContent={<Eye className="h-4 w-4" />} onPress={() => openDetail(team)}>详情</Button></div></TableCell>
            </TableRow>}
          </TableBody>
        </Table>
      </CardBody></Card>

      {totalPages > 1 && <div className="flex justify-center"><Pagination page={page} total={totalPages} showControls onChange={setPage} /></div>}

      <Modal isOpen={detailModal.isOpen} onOpenChange={detailModal.onOpenChange} size="5xl" scrollBehavior="inside" classNames={{ base: 'max-h-[94vh]' }}>
        <ModalContent>{(onClose) => <>
          <ModalHeader className="flex flex-col items-start gap-1"><span>{selectedTeam?.team_name || '团队详情'}</span><span className="text-xs font-normal text-default-400">团队 #{selectedTeam?.id}</span></ModalHeader>
          <ModalBody>
            {detailLoading ? <div className="flex min-h-80 items-center justify-center"><Spinner label="加载团队详情中..." /></div> : detail ? <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card shadow="none" className="border border-divider"><CardBody><p className="text-xs text-default-500">状态</p><div className="mt-2">{renderTeamStatus(detail.team.status)}</div></CardBody></Card>
                <Card shadow="none" className="border border-divider"><CardBody><p className="text-xs text-default-500">所有者</p><p className="mt-1 font-medium">{detail.team.owner?.username || detail.team.owner?.email || '-'}</p><p className="text-xs text-default-400">{detail.team.owner?.email}</p></CardBody></Card>
                <Card shadow="none" className="border border-divider"><CardBody><p className="text-xs text-default-500">当前套餐</p><p className="mt-1 font-medium">{detail.team.package?.package_name || '-'}</p><p className="text-xs text-default-400">{detail.team.package?.level || '-'}</p></CardBody></Card>
                <Card shadow="none" className="border border-divider"><CardBody><p className="text-xs text-default-500">席位使用</p><p className="mt-1 text-xl font-bold">{detail.team.member_counts.active + detail.team.member_counts.suspended} / {detail.team.seat_count}</p><p className="text-xs text-default-400">待接受邀请 {detail.team.member_counts.invited}</p></CardBody></Card>
              </div>
              {detail.team.pending_package_id && <Alert color="primary" variant="flat" title="已安排下周期变更" description={`${detail.pending_package?.package_name || `套餐 #${detail.team.pending_package_id}`} · ${detail.team.pending_seat_count || detail.team.seat_count} 席 · ${formatDate(detail.team.pending_effective_at)} 生效`} />}
              {detail.team.status === 'pending' && <Alert color="warning" variant="flat" title="团队尚未付款生效" description="管理员可取消该团队并使待支付订单失效。" endContent={<Button size="sm" color="danger" variant="flat" startContent={<ShieldAlert className="h-4 w-4" />} onPress={() => requestCancelTeam(detail.team)}>取消待支付团队</Button>} />}
              <Divider />
              <Tabs aria-label="团队详情" variant="underlined">
                <Tab key="members" title={`成员与邀请 (${detail.members.length})`}>
                  <Table aria-label="团队成员" removeWrapper classNames={{ table: 'min-w-[900px]' }}>
                    <TableHeader><TableColumn>成员</TableColumn><TableColumn>角色</TableColumn><TableColumn>状态</TableColumn><TableColumn>邀请/加入时间</TableColumn><TableColumn>离开时间</TableColumn><TableColumn align="end">管理</TableColumn></TableHeader>
                    <TableBody items={detail.members} emptyContent="暂无成员记录">{(member) => <TableRow key={member.id}>
                      <TableCell><div><p className="font-medium">{memberName(member)}</p><p className="text-xs text-default-400">{member.email || `用户 #${member.user_id}`}</p>{member.inviter && <p className="text-xs text-default-400">邀请人：{member.inviter.username || member.inviter.email}</p>}</div></TableCell>
                      <TableCell>{member.role === 'owner' ? <Chip size="sm" color="primary" variant="flat">所有者</Chip> : <span className="text-sm">成员</span>}</TableCell>
                      <TableCell><Chip size="sm" variant="flat" color={MEMBER_STATUS[member.status].color}>{MEMBER_STATUS[member.status].label}</Chip></TableCell>
                      <TableCell><p className="text-sm">{member.status === 'invited' ? formatDate(member.invited_at) : formatDate(member.joined_at)}</p>{member.status === 'invited' && <p className="text-xs text-default-400">到期 {formatDate(member.invite_expires_at)}</p>}</TableCell>
                      <TableCell><span className="text-sm">{formatDate(member.left_at)}</span></TableCell>
                      <TableCell>{renderMemberActions(member)}</TableCell>
                    </TableRow>}</TableBody>
                  </Table>
                </Tab>
                <Tab key="orders" title={`团队订单 (${detail.orders.length})`}>
                  <Table aria-label="团队订单" removeWrapper classNames={{ table: 'min-w-[820px]' }}>
                    <TableHeader><TableColumn>订单</TableColumn><TableColumn>类型</TableColumn><TableColumn>状态</TableColumn><TableColumn>套餐/席位变化</TableColumn><TableColumn>金额</TableColumn><TableColumn>时间</TableColumn></TableHeader>
                    <TableBody items={detail.orders} emptyContent="暂无团队订单">{(order) => <TableRow key={order.id}>
                      <TableCell><div><p className="font-mono text-xs">{order.order_id}</p><p className="text-xs text-default-400">记录 #{order.id}</p></div></TableCell>
                      <TableCell>{ORDER_TYPE[order.order_type]}</TableCell>
                      <TableCell><Chip size="sm" variant="flat" color={ORDER_STATUS[order.status].color}>{ORDER_STATUS[order.status].label}</Chip></TableCell>
                      <TableCell><p className="text-sm">套餐 {order.old_package_id || '-'} → {order.new_package_id || order.package_id}</p><p className="text-xs text-default-400">席位 {order.old_seat_count || '-'} → {order.new_seat_count || '-'}</p></TableCell>
                      <TableCell><p className="font-medium">¥{Number(order.paid_amount ?? order.payable_amount ?? 0).toFixed(2)}</p></TableCell>
                      <TableCell><p className="text-sm">{formatDate(order.created_at)}</p>{order.paid_at && <p className="text-xs text-success">支付 {formatDate(order.paid_at)}</p>}</TableCell>
                    </TableRow>}</TableBody>
                  </Table>
                </Tab>
              </Tabs>
            </> : <Alert color="danger" title="无法加载团队详情" />}
          </ModalBody>
          <ModalFooter><Button variant="light" onPress={onClose}>关闭</Button></ModalFooter>
        </>}</ModalContent>
      </Modal>

      <Modal isOpen={confirmModal.isOpen} onOpenChange={confirmModal.onOpenChange} placement="center">
        <ModalContent>{(onClose) => <>
          <ModalHeader>{pendingAction?.kind === 'cancel-team' ? '取消待支付团队' : confirmation?.title}</ModalHeader>
          <ModalBody className="gap-3">
            <Alert color={pendingAction?.kind === 'cancel-team' ? 'danger' : confirmation?.color || 'warning'} variant="flat" title={pendingAction?.kind === 'cancel-team' ? '该操作会使支付二维码立即失效' : confirmation?.description} />
            {pendingAction?.kind === 'cancel-team' ? <p className="text-sm">确定取消团队 <strong>{pendingAction.team.team_name}</strong> 吗？所有待支付订单将标记失败，所有者成员关系将解除。</p> : pendingAction?.kind === 'member' ? <p className="text-sm">操作成员：<strong>{memberName(pendingAction.member)}</strong></p> : null}
          </ModalBody>
          <ModalFooter><Button variant="light" onPress={onClose} isDisabled={actionLoading}>返回</Button><Button color={pendingAction?.kind === 'cancel-team' ? 'danger' : confirmation?.color || 'warning'} isLoading={actionLoading} onPress={() => void executeAction()}>{pendingAction?.kind === 'cancel-team' ? '确认取消团队' : confirmation?.button}</Button></ModalFooter>
        </>}</ModalContent>
      </Modal>
    </div>
  );
};

export default TeamsManagePage;
