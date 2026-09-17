import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Snippet,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  useDisclosure,
} from '@heroui/react';
import { KeyRound, LockKeyhole, RefreshCw, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import adminApiService from '../../services/adminApi';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import type { AdministratorSession } from '../../types/admin';
import { showToast } from '../../components/Toast';
import { generateQRCodeDataUrl } from '../user/tabs/subscription/qrCode';

const formatTime = (value?: string | null) => value ? new Date(value).toLocaleString() : '-';

const AdminSecurityPage: React.FC = () => {
  const { principal, refresh, clear } = useAdminAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [mfaSetup, setMfaSetup] = useState<{ secret: string; otpauth_uri: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSaving, setMfaSaving] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const disableModal = useDisclosure();
  const [sessions, setSessions] = useState<AdministratorSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const forced = principal?.must_change_password || searchParams.get('forcePassword') === '1';
  const qrCode = useMemo(() => mfaSetup ? generateQRCodeDataUrl(mfaSetup.otpauth_uri) : '', [mfaSetup]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const response = await adminApiService.getOwnSessions();
      if (response.code !== 20000) throw new Error(response.msg || '获取会话失败');
      setSessions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取会话失败', 'error');
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => { void loadSessions(); }, [loadSessions]);

  const changePassword = async () => {
    if (!currentPassword || !newPassword) return showToast('请填写当前密码和新密码', 'warning');
    if (newPassword !== confirmPassword) return showToast('两次新密码不一致', 'warning');
    setPasswordSaving(true);
    try {
      const response = await adminApiService.changeOwnPassword(currentPassword, newPassword);
      if (response.code !== 20000) throw new Error(response.msg || '修改密码失败');
      showToast(response.msg || '密码已修改，请重新登录', 'success');
      clear();
      navigate('/star-admin/login', { replace: true });
    } catch (error) {
      showToast(error instanceof Error ? error.message : '修改密码失败', 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  const beginMfaSetup = async () => {
    setMfaSaving(true);
    try {
      const response = await adminApiService.setupMfa();
      if (response.code !== 20000) throw new Error(response.msg || '生成 MFA 密钥失败');
      setMfaSetup(response.data);
      setMfaCode('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '生成 MFA 密钥失败', 'error');
    } finally {
      setMfaSaving(false);
    }
  };

  const enableMfa = async () => {
    if (!/^\d{6}$/.test(mfaCode)) return showToast('请输入 6 位动态验证码', 'warning');
    setMfaSaving(true);
    try {
      const response = await adminApiService.enableMfa(mfaCode);
      if (response.code !== 20000) throw new Error(response.msg || '启用 MFA 失败');
      setMfaSetup(null);
      setMfaCode('');
      await refresh();
      await loadSessions();
      showToast('MFA 已启用', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '启用 MFA 失败', 'error');
    } finally {
      setMfaSaving(false);
    }
  };

  const disableMfa = async () => {
    if (!disablePassword || !/^\d{6}$/.test(disableCode)) return showToast('请输入密码和 6 位动态验证码', 'warning');
    setMfaSaving(true);
    try {
      const response = await adminApiService.disableMfa(disablePassword, disableCode);
      if (response.code !== 20000) throw new Error(response.msg || '关闭 MFA 失败');
      disableModal.onClose();
      clear();
      navigate('/star-admin/login', { replace: true });
    } catch (error) {
      showToast(error instanceof Error ? error.message : '关闭 MFA 失败', 'error');
    } finally {
      setMfaSaving(false);
    }
  };

  const revoke = async (session: AdministratorSession) => {
    setRevoking(session.id);
    try {
      const response = await adminApiService.revokeOwnSession(session.id);
      if (response.code !== 20000) throw new Error(response.msg || '撤销会话失败');
      if (response.data.current) {
        clear();
        navigate('/star-admin/login', { replace: true });
        return;
      }
      await loadSessions();
      showToast('会话已撤销', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '撤销会话失败', 'error');
    } finally {
      setRevoking(null);
    }
  };

  return <div className="space-y-6">
    <div className="flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-primary" /><div><h1 className="text-2xl font-bold">账号安全</h1><p className="text-sm text-default-500">{principal?.display_name} · {principal?.username}</p></div></div>
    {forced && <Alert color="warning" variant="flat" title="首次登录必须修改密码" description="完成密码修改后，当前会话会立即撤销，请使用新密码重新登录。" />}

    <Card><CardHeader className="gap-2 font-semibold"><LockKeyhole className="h-5 w-5 text-primary" />修改密码</CardHeader><Divider /><CardBody className="grid gap-4 md:grid-cols-2">
      <Input type="password" label="当前密码" value={currentPassword} onValueChange={setCurrentPassword} autoComplete="current-password" />
      <div className="hidden md:block" />
      <Input type="password" label="新密码" value={newPassword} onValueChange={setNewPassword} autoComplete="new-password" description="至少 12 位，包含大写、小写、数字、特殊字符中的至少三类" />
      <Input type="password" label="确认新密码" value={confirmPassword} onValueChange={setConfirmPassword} autoComplete="new-password" />
      <div className="md:col-span-2"><Button color="primary" startContent={<KeyRound className="h-4 w-4" />} isLoading={passwordSaving} onPress={() => void changePassword()}>修改密码并退出全部会话</Button></div>
    </CardBody></Card>

    <Card><CardHeader className="flex justify-between gap-3"><div className="flex items-center gap-2 font-semibold"><Smartphone className="h-5 w-5 text-primary" />双重验证（TOTP）</div><Chip color={principal?.mfa_enabled ? 'success' : 'default'} variant="flat">{principal?.mfa_enabled ? '已启用' : '未启用'}</Chip></CardHeader><Divider /><CardBody className="gap-4">
      {principal?.mfa_enabled ? <div><p className="text-sm text-default-600">登录时必须输入身份验证器中的动态验证码。</p><Button className="mt-3" color="danger" variant="flat" onPress={disableModal.onOpen}>关闭 MFA</Button></div> : mfaSetup ? <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
        <Image src={qrCode} alt="MFA 配置二维码" className="h-[220px] w-[220px]" />
        <div className="space-y-4"><Alert color="warning" variant="flat" title="请立即保存密钥" description="密钥仅在本次配置流程中显示。用身份验证器扫描二维码后，输入当前动态验证码完成绑定。" /><Snippet symbol="" className="max-w-full">{mfaSetup.secret}</Snippet><Input label="动态验证码" value={mfaCode} onValueChange={(value) => setMfaCode(value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" /><div className="flex gap-2"><Button variant="flat" onPress={() => setMfaSetup(null)}>取消</Button><Button color="primary" isLoading={mfaSaving} onPress={() => void enableMfa()}>验证并启用</Button></div></div>
      </div> : <div><p className="text-sm text-default-600">启用后，每次新登录都需要密码和 6 位动态验证码。</p><Button className="mt-3" color="primary" variant="flat" isLoading={mfaSaving} onPress={() => void beginMfaSetup()}>设置 MFA</Button></div>}
    </CardBody></Card>

    <Card><CardHeader className="flex justify-between gap-3"><div className="font-semibold">登录会话</div><Button isIconOnly variant="flat" aria-label="刷新会话" isLoading={sessionsLoading} onPress={() => void loadSessions()}><RefreshCw className="h-4 w-4" /></Button></CardHeader><CardBody className="p-0"><Table aria-label="管理员登录会话"><TableHeader><TableColumn>设备</TableColumn><TableColumn>地址</TableColumn><TableColumn>最近活动</TableColumn><TableColumn>状态</TableColumn><TableColumn>操作</TableColumn></TableHeader><TableBody isLoading={sessionsLoading} loadingContent={<Spinner label="加载中" />} emptyContent="暂无会话">{sessions.map((session) => <TableRow key={session.id}><TableCell><div className="max-w-72"><p className="truncate text-sm">{session.user_agent || '未知设备'}</p><p className="text-xs text-default-400">创建：{formatTime(session.created_at)}</p></div></TableCell><TableCell>{session.ip || '-'}</TableCell><TableCell>{formatTime(session.last_seen_at)}</TableCell><TableCell><Chip size="sm" color={session.active ? 'success' : 'default'} variant="flat">{session.current ? '当前会话' : session.active ? '有效' : '已失效'}</Chip></TableCell><TableCell>{session.active && <Button isIconOnly size="sm" color="danger" variant="light" aria-label="撤销会话" isLoading={revoking === session.id} onPress={() => void revoke(session)}><Trash2 className="h-4 w-4" /></Button>}</TableCell></TableRow>)}</TableBody></Table></CardBody></Card>

    <Modal isOpen={disableModal.isOpen} onOpenChange={disableModal.onOpenChange}><ModalContent><ModalHeader>关闭双重验证</ModalHeader><ModalBody><Alert color="danger" title="安全性将降低" description="关闭后会撤销全部会话，您需要重新登录。" /><Input type="password" label="当前密码" value={disablePassword} onValueChange={setDisablePassword} /><Input label="动态验证码" value={disableCode} onValueChange={(value) => setDisableCode(value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" /></ModalBody><ModalFooter><Button variant="light" onPress={disableModal.onClose}>取消</Button><Button color="danger" isLoading={mfaSaving} onPress={() => void disableMfa()}>确认关闭</Button></ModalFooter></ModalContent></Modal>
  </div>;
};

export default AdminSecurityPage;
