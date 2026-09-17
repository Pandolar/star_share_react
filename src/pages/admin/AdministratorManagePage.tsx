import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
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
  Tab,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tabs,
  Textarea,
  Tooltip,
  useDisclosure,
} from '@heroui/react';
import { Eye, KeyRound, MoreVertical, Plus, RefreshCw, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import adminApiService from '../../services/adminApi';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import type {
  AdminPermission,
  AdminRole,
  AdministratorAccount,
  AdministratorAuditRecord,
  AdministratorSession,
} from '../../types/admin';
import { showToast } from '../../components/Toast';

const emptyAccountForm = {
  username: '',
  display_name: '',
  email: '',
  password: '',
  status: 'active' as 'active' | 'disabled',
  role_codes: [] as string[],
  remarks: '',
};

const formatTime = (value?: string | null) => value ? new Date(value).toLocaleString() : '-';
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

const AdministratorManagePage: React.FC = () => {
  const { can } = useAdminAuth();
  const [tab, setTab] = useState('accounts');
  const [accounts, setAccounts] = useState<AdministratorAccount[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [sessions, setSessions] = useState<AdministratorSession[]>([]);
  const [audits, setAudits] = useState<AdministratorAuditRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const accountModal = useDisclosure();
  const roleDetailModal = useDisclosure();
  const confirmModal = useDisclosure();
  const passwordModal = useDisclosure();
  const auditDetailModal = useDisclosure();
  const [selectedAccount, setSelectedAccount] = useState<AdministratorAccount | null>(null);
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<AdministratorAuditRecord | null>(null);
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    run: () => Promise<void>;
  } | null>(null);

  const permissionMap = useMemo(
    () => new Map(permissions.map((permission) => [permission.permission_key, permission])),
    [permissions],
  );

  const loadCatalog = useCallback(async () => {
    if (!can('administrator.role.read')) return;
    try {
      const [roleResponse, permissionResponse] = await Promise.all([
        adminApiService.getAdministratorRoles(),
        adminApiService.getAdministratorPermissions(),
      ]);
      if (roleResponse.code === 20000) setRoles(roleResponse.data || []);
      if (permissionResponse.code === 20000) setPermissions(permissionResponse.data || []);
    } catch (error) {
      showToast(errorMessage(error, '获取固定角色失败'), 'error');
    }
  }, [can]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'accounts') {
        const response = await adminApiService.getAdministratorAccounts({
          current_page: page,
          page_size: pageSize,
          querystring: query || undefined,
        });
        if (response.code !== 20000) throw new Error(response.msg || '获取管理员失败');
        setAccounts(response.data || []);
        setTotal(Number(response.total) || 0);
      } else if (tab === 'roles') {
        const response = await adminApiService.getAdministratorRoles();
        if (response.code !== 20000) throw new Error(response.msg || '获取固定角色失败');
        setRoles(response.data || []);
        setTotal(response.data?.length || 0);
      } else if (tab === 'sessions') {
        const response = await adminApiService.getAdministratorSessions({ active: true });
        if (response.code !== 20000) throw new Error(response.msg || '获取会话失败');
        setSessions(response.data || []);
        setTotal(response.data?.length || 0);
      } else {
        const response = await adminApiService.getAdministratorAuditLogs({
          current_page: page,
          page_size: pageSize,
          querystring: query || undefined,
        });
        if (response.code !== 20000) throw new Error(response.msg || '获取管理员审计失败');
        setAudits(response.data || []);
        setTotal(Number(response.total) || 0);
      }
    } catch (error) {
      showToast(errorMessage(error, '加载失败'), 'error');
    } finally {
      setLoading(false);
    }
  }, [page, query, tab]);

  useEffect(() => { void loadCatalog(); }, [loadCatalog]);
  useEffect(() => { void load(); }, [load]);

  const openCreateAccount = () => {
    setSelectedAccount(null);
    setAccountForm(emptyAccountForm);
    accountModal.onOpen();
  };

  const openEditAccount = (account: AdministratorAccount) => {
    setSelectedAccount(account);
    setAccountForm({
      username: account.username,
      display_name: account.display_name,
      email: account.email || '',
      password: '',
      status: account.status,
      role_codes: account.role_codes,
      remarks: account.remarks || '',
    });
    accountModal.onOpen();
  };

  const saveAccount = async () => {
    setSaving(true);
    try {
      const response = selectedAccount
        ? await adminApiService.updateAdministratorAccount({
            id: selectedAccount.id,
            display_name: accountForm.display_name,
            email: accountForm.email || null,
            status: accountForm.status,
            ...(selectedAccount.is_superadmin ? {} : { role_codes: accountForm.role_codes }),
            remarks: accountForm.remarks,
          })
        : await adminApiService.createAdministratorAccount({
            username: accountForm.username,
            display_name: accountForm.display_name,
            email: accountForm.email || undefined,
            password: accountForm.password,
            role_codes: accountForm.role_codes,
            remarks: accountForm.remarks,
          });
      if (response.code !== 20000) throw new Error(response.msg || '保存管理员失败');
      accountModal.onClose();
      await load();
      showToast(response.msg || '管理员已保存', 'success');
    } catch (error) {
      showToast(errorMessage(error, '保存管理员失败'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const askConfirm = (title: string, description: string, run: () => Promise<void>) => {
    setConfirmAction({ title, description, run });
    confirmModal.onOpen();
  };

  const runConfirmed = async () => {
    if (!confirmAction) return;
    setSaving(true);
    try {
      await confirmAction.run();
      confirmModal.onClose();
      await load();
    } catch (error) {
      showToast(errorMessage(error, '操作失败'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = (account: AdministratorAccount) => askConfirm(
    '删除管理员账号',
    `删除“${account.display_name}（${account.username}）”及其全部会话。该操作不可撤销。`,
    async () => {
      const response = await adminApiService.deleteAdministratorAccount(account.id);
      if (response.code !== 20000) throw new Error(response.msg);
      showToast('管理员已删除', 'success');
    },
  );

  const resetMfa = (account: AdministratorAccount) => askConfirm(
    '重置管理员 MFA',
    `清除“${account.username}”的 MFA 并撤销其全部会话。`,
    async () => {
      const response = await adminApiService.resetAdministratorMfa(account.id);
      if (response.code !== 20000) throw new Error(response.msg);
      showToast('MFA 已重置', 'success');
    },
  );

  const toggleStatus = (account: AdministratorAccount) => askConfirm(
    account.status === 'active' ? '禁用管理员' : '启用管理员',
    account.status === 'active' ? '禁用后该账号的全部会话立即失效。' : '启用后该账号可重新登录。',
    async () => {
      const response = await adminApiService.updateAdministratorAccount({
        id: account.id,
        status: account.status === 'active' ? 'disabled' : 'active',
      });
      if (response.code !== 20000) throw new Error(response.msg);
      showToast(response.msg, 'success');
    },
  );

  const resetPassword = async () => {
    if (!selectedAccount || !newPassword) return;
    setSaving(true);
    try {
      const response = await adminApiService.resetAdministratorPassword(selectedAccount.id, newPassword);
      if (response.code !== 20000) throw new Error(response.msg);
      passwordModal.onClose();
      setNewPassword('');
      await load();
      showToast('密码已重置；该账号下次登录必须修改密码', 'success');
    } catch (error) {
      showToast(errorMessage(error, '重置密码失败'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const revokeSession = (session: AdministratorSession) => askConfirm(
    '撤销管理员会话',
    `撤销 ${session.username || session.admin_id} 在 ${session.ip || '未知地址'} 的登录会话。`,
    async () => {
      const response = await adminApiService.revokeAdministratorSession(session.id);
      if (response.code !== 20000) throw new Error(response.msg);
      showToast('会话已撤销', 'success');
    },
  );

  const accountActions = (account: AdministratorAccount) => (
    <Dropdown>
      <DropdownTrigger>
        <Button isIconOnly size="sm" variant="light" aria-label={`管理 ${account.username}`}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="管理员操作"
        disabledKeys={account.is_superadmin ? ['status', 'delete', 'mfa'] : []}
      >
        <DropdownItem key="edit" onPress={() => openEditAccount(account)}>编辑账号与角色</DropdownItem>
        <DropdownItem
          key="password"
          startContent={<KeyRound className="h-4 w-4" />}
          onPress={() => { setSelectedAccount(account); setNewPassword(''); passwordModal.onOpen(); }}
        >
          重置密码
        </DropdownItem>
        <DropdownItem
          key="mfa"
          startContent={<ShieldCheck className="h-4 w-4" />}
          onPress={() => resetMfa(account)}
        >
          重置 MFA
        </DropdownItem>
        <DropdownItem
          key="status"
          color={account.status === 'active' ? 'warning' : 'success'}
          onPress={() => toggleStatus(account)}
        >
          {account.status === 'active' ? '禁用账号' : '启用账号'}
        </DropdownItem>
        <DropdownItem
          key="delete"
          color="danger"
          className="text-danger"
          startContent={<Trash2 className="h-4 w-4" />}
          onPress={() => deleteAccount(account)}
        >
          删除账号
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const availableTabs = [
    can('administrator.account.read') && { key: 'accounts', title: '管理员账号' },
    can('administrator.role.read') && { key: 'roles', title: '固定角色' },
    can('administrator.session.read') && { key: 'sessions', title: '活跃会话' },
    can('administrator.audit.read') && { key: 'audit', title: '安全审计' },
  ].filter(Boolean) as Array<{ key: string; title: string }>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserCog className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">管理员与角色</h1>
            <p className="text-sm text-default-500">六个固定角色、独立会话与安全审计</p>
          </div>
        </div>
        <Button isIconOnly variant="flat" aria-label="刷新" isLoading={loading} onPress={() => void load()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Tabs
        selectedKey={tab}
        onSelectionChange={(key) => { setTab(String(key)); setPage(1); setQuery(''); setQueryInput(''); }}
      >
        {availableTabs.map((item) => <Tab key={item.key} title={item.title} />)}
      </Tabs>

      {(tab === 'accounts' || tab === 'audit') && (
        <Card>
          <CardBody className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={queryInput}
              onValueChange={setQueryInput}
              placeholder={tab === 'accounts' ? '搜索账号、姓名或邮箱' : '搜索账号、动作、资源或请求编号'}
              onKeyDown={(event) => {
                if (event.key === 'Enter') { setQuery(queryInput.trim()); setPage(1); }
              }}
            />
            <Button color="primary" onPress={() => { setQuery(queryInput.trim()); setPage(1); }}>查询</Button>
            <Button variant="flat" onPress={() => { setQueryInput(''); setQuery(''); setPage(1); }}>重置</Button>
          </CardBody>
        </Card>
      )}

      {tab === 'accounts' && (
        <>
          <div className="flex justify-between">
            <span className="text-sm text-default-500">共 {total} 个管理员</span>
            {can('administrator.account.create') && (
              <Button color="primary" startContent={<Plus className="h-4 w-4" />} onPress={openCreateAccount}>
                创建管理员
              </Button>
            )}
          </div>
          <Table aria-label="管理员账号列表" classNames={{ wrapper: 'min-h-72' }}>
            <TableHeader>
              <TableColumn>账号</TableColumn><TableColumn>固定角色</TableColumn><TableColumn>安全状态</TableColumn>
              <TableColumn>最近登录</TableColumn><TableColumn>状态</TableColumn><TableColumn>操作</TableColumn>
            </TableHeader>
            <TableBody isLoading={loading} loadingContent={<Spinner label="加载中" />} emptyContent="暂无管理员">
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {account.display_name} {account.is_superadmin && <Chip size="sm" color="secondary" variant="flat">超级管理员</Chip>}
                      </div>
                      <p className="text-xs text-default-500">{account.username}{account.email ? ` · ${account.email}` : ''}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {account.roles.length
                        ? account.roles.map((role) => <Chip key={role.code} size="sm" variant="flat">{role.name}</Chip>)
                        : <span className="text-default-400">超级管理员无需角色</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Chip size="sm" color={account.mfa_enabled ? 'success' : 'default'} variant="flat">MFA {account.mfa_enabled ? '已启用' : '未启用'}</Chip>
                      {account.must_change_password && <Chip size="sm" color="warning" variant="flat">待改密</Chip>}
                    </div>
                  </TableCell>
                  <TableCell><p>{formatTime(account.last_login_at)}</p><p className="text-xs text-default-400">{account.last_login_ip || '-'}</p></TableCell>
                  <TableCell><Chip size="sm" color={account.status === 'active' ? 'success' : 'danger'} variant="flat">{account.status === 'active' ? '启用' : '禁用'}</Chip></TableCell>
                  <TableCell>{(can('administrator.account.update') || can('administrator.account.delete')) ? accountActions(account) : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {tab === 'roles' && (
        <>
          <Alert color="primary" variant="flat" title="角色固定为六个" description="角色及权限由代码统一维护，后台只能查看和给管理员分配，避免自定义规则长期漂移。" />
          <Table aria-label="固定管理员角色列表">
            <TableHeader>
              <TableColumn>角色</TableColumn><TableColumn>权限数</TableColumn><TableColumn>已分配账号</TableColumn><TableColumn>权限详情</TableColumn>
            </TableHeader>
            <TableBody isLoading={loading} loadingContent={<Spinner label="加载中" />} emptyContent="暂无角色">
              {roles.map((role) => (
                <TableRow key={role.code}>
                  <TableCell><div><div className="font-medium">{role.name}</div><p className="text-xs text-default-500">{role.code} · {role.description || '-'}</p></div></TableCell>
                  <TableCell>{role.permissions.length}</TableCell>
                  <TableCell>{role.assigned_accounts}</TableCell>
                  <TableCell>
                    <Tooltip content="查看权限">
                      <Button isIconOnly size="sm" variant="light" aria-label={`查看${role.name}权限`} onPress={() => { setSelectedRole(role); roleDetailModal.onOpen(); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {tab === 'sessions' && (
        <Table aria-label="管理员活跃会话">
          <TableHeader>
            <TableColumn>管理员</TableColumn><TableColumn>设备与地址</TableColumn><TableColumn>最近活动</TableColumn><TableColumn>MFA</TableColumn><TableColumn>操作</TableColumn>
          </TableHeader>
          <TableBody isLoading={loading} loadingContent={<Spinner label="加载中" />} emptyContent="暂无活跃会话">
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>{session.display_name || session.username} <span className="text-xs text-default-400">#{session.admin_id}</span></TableCell>
                <TableCell><div className="max-w-80"><p className="truncate text-sm">{session.user_agent || '-'}</p><p className="text-xs text-default-400">{session.ip || '-'}</p></div></TableCell>
                <TableCell>{formatTime(session.last_seen_at)}</TableCell>
                <TableCell><Chip size="sm" color={session.mfa_verified ? 'success' : 'default'} variant="flat">{session.mfa_verified ? '已验证' : '未启用'}</Chip></TableCell>
                <TableCell>{can('administrator.session.revoke') && <Button isIconOnly size="sm" color="danger" variant="light" aria-label="撤销会话" onPress={() => revokeSession(session)}><Trash2 className="h-4 w-4" /></Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {tab === 'audit' && (
        <Table aria-label="管理员安全审计">
          <TableHeader>
            <TableColumn>时间</TableColumn><TableColumn>管理员</TableColumn><TableColumn>动作</TableColumn><TableColumn>结果</TableColumn><TableColumn>来源</TableColumn><TableColumn>详情</TableColumn>
          </TableHeader>
          <TableBody isLoading={loading} loadingContent={<Spinner label="加载中" />} emptyContent="暂无安全审计">
            {audits.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{formatTime(record.created_at)}</TableCell>
                <TableCell>{record.admin_username || '匿名'} {record.admin_id && <span className="text-xs text-default-400">#{record.admin_id}</span>}</TableCell>
                <TableCell><div><div className="font-medium">{record.action}</div><p className="text-xs text-default-400">{record.permission_key || '-'}</p></div></TableCell>
                <TableCell><Chip size="sm" color={record.result === 'success' ? 'success' : record.result === 'denied' ? 'warning' : 'danger'} variant="flat">{record.result}</Chip></TableCell>
                <TableCell><p>{record.ip || '-'}</p><p className="text-xs text-default-400">{record.request_id || '-'}</p></TableCell>
                <TableCell><Button isIconOnly size="sm" variant="flat" aria-label="查看审计详情" onPress={() => { setSelectedAudit(record); auditDetailModal.onOpen(); }}><Eye className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {(tab === 'accounts' || tab === 'audit') && pages > 1 && (
        <div className="flex justify-end"><Pagination page={page} total={pages} onChange={setPage} showControls /></div>
      )}

      <Modal isOpen={accountModal.isOpen} onOpenChange={accountModal.onOpenChange} size="3xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{selectedAccount ? `编辑管理员：${selectedAccount.username}` : '创建管理员'}</ModalHeader>
          <ModalBody className="gap-5">
            {selectedAccount?.is_superadmin && <Alert color="warning" title="受保护的超级管理员" description="超级管理员无需分配普通角色，且不能被禁用或删除。" />}
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="登录账号" value={accountForm.username} onValueChange={(username) => setAccountForm((current) => ({ ...current, username }))} isReadOnly={Boolean(selectedAccount)} isRequired />
              <Input label="展示名称" value={accountForm.display_name} onValueChange={(display_name) => setAccountForm((current) => ({ ...current, display_name }))} isRequired />
              <Input type="email" label="邮箱" value={accountForm.email} onValueChange={(email) => setAccountForm((current) => ({ ...current, email }))} />
              {!selectedAccount && <Input type="password" label="初始密码" value={accountForm.password} onValueChange={(password) => setAccountForm((current) => ({ ...current, password }))} description="至少 12 位且包含至少三类字符；首次登录强制修改" isRequired />}
            </div>
            {!selectedAccount?.is_superadmin && (
              <Select
                label="固定角色"
                selectionMode="multiple"
                selectedKeys={new Set(accountForm.role_codes)}
                onSelectionChange={(keys) => setAccountForm((current) => ({
                  ...current,
                  role_codes: Array.from(keys === 'all' ? roles.map((role) => role.code) : keys).map(String),
                }))}
                description="至少选择一个角色；多个角色的权限取并集。"
              >
                {roles.map((role) => <SelectItem key={role.code}>{role.name}</SelectItem>)}
              </Select>
            )}
            <Textarea label="备注" value={accountForm.remarks} onValueChange={(remarks) => setAccountForm((current) => ({ ...current, remarks }))} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={accountModal.onClose}>取消</Button>
            <Button color="primary" isLoading={saving} onPress={() => void saveAccount()}>保存</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={roleDetailModal.isOpen} onOpenChange={roleDetailModal.onOpenChange} size="3xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{selectedRole?.name}权限</ModalHeader>
          <ModalBody>
            <Alert color="primary" variant="flat" title={selectedRole?.code || ''} description={selectedRole?.description || ''} />
            <div className="flex flex-wrap gap-2">
              {selectedRole?.permissions.map((key) => (
                <Chip key={key} variant="flat" color={permissionMap.get(key)?.risk_level === 'critical' ? 'danger' : 'default'}>
                  {permissionMap.get(key)?.label || key}
                </Chip>
              ))}
            </div>
          </ModalBody>
          <ModalFooter><Button color="primary" onPress={roleDetailModal.onClose}>关闭</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={passwordModal.isOpen} onOpenChange={passwordModal.onOpenChange}>
        <ModalContent>
          <ModalHeader>重置 {selectedAccount?.username} 的密码</ModalHeader>
          <ModalBody>
            <Alert color="warning" title="会话将全部撤销" description="账号下次登录必须修改此临时密码。" />
            <Input type="password" label="新临时密码" value={newPassword} onValueChange={setNewPassword} description="至少 12 位且包含至少三类字符" />
          </ModalBody>
          <ModalFooter><Button variant="light" onPress={passwordModal.onClose}>取消</Button><Button color="danger" isLoading={saving} onPress={() => void resetPassword()}>确认重置</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={confirmModal.isOpen} onOpenChange={confirmModal.onOpenChange}>
        <ModalContent>
          <ModalHeader>{confirmAction?.title}</ModalHeader>
          <ModalBody><Alert color="danger" variant="flat" title="高风险操作" description={confirmAction?.description} /></ModalBody>
          <ModalFooter><Button variant="light" onPress={confirmModal.onClose}>取消</Button><Button color="danger" isLoading={saving} onPress={() => void runConfirmed()}>确认执行</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={auditDetailModal.isOpen} onOpenChange={auditDetailModal.onOpenChange} size="3xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>安全审计 #{selectedAudit?.id}</ModalHeader>
          <ModalBody>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>动作：{selectedAudit?.action}</div><div>结果：{selectedAudit?.result}</div>
              <div>路径：{selectedAudit?.method} {selectedAudit?.path}</div><div>请求编号：{selectedAudit?.request_id || '-'}</div>
            </div>
            <Divider />
            <Textarea label="原因" value={selectedAudit?.reason || '-'} isReadOnly />
            <Textarea label="变更前" value={JSON.stringify(selectedAudit?.before_data || {}, null, 2)} minRows={5} isReadOnly />
            <Textarea label="变更后" value={JSON.stringify(selectedAudit?.after_data || {}, null, 2)} minRows={5} isReadOnly />
          </ModalBody>
          <ModalFooter><Button color="primary" onPress={auditDetailModal.onClose}>关闭</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default AdministratorManagePage;
