import React, { useEffect, useRef, useState } from 'react';
import { Button, Checkbox, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Radio, RadioGroup } from '@heroui/react';
import { Copy, Eye, EyeOff } from 'lucide-react';
import resetUserPassword, { PasswordResetResult } from '../../services/userPasswordApi';

const errorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const { response } = error;
    if (response && typeof response === 'object' && 'data' in response) {
      const { data } = response;
      if (data && typeof data === 'object' && 'msg' in data && typeof data.msg === 'string' && data.msg) return data.msg;
    }
  }
  return error instanceof Error ? error.message : '密码重置失败';
};

export type UserPasswordResetModalProps = {
  isOpen: boolean;
  user: { id: number; email?: string | null } | null;
  canReset: boolean;
  onClose: () => void;
  onComplete?: (result: PasswordResetResult) => void;
};

const UserPasswordResetModal: React.FC<UserPasswordResetModalProps> = ({ isOpen, user, canReset, onClose, onComplete }) => {
  const [mode, setMode] = useState<'generated' | 'custom'>('generated');
  const [password, setPassword] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [result, setResult] = useState<PasswordResetResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);
  const busyRef = useRef(false);
  const clear = () => { setPassword(''); setResult(null); setVisible(false); setError(''); setCopied(false); setMode('generated'); setSendEmail(false); };
  useEffect(() => { if (!isOpen) clear(); }, [isOpen]);
  useEffect(() => { clear(); }, [user?.id]);
  const close = () => { if (busyRef.current) return; clear(); onClose(); };
  const submit = async () => {
    if (!user || !canReset || busyRef.current) return;
    if (mode === 'custom' && (!password || password.length < 8 || password.length > 128)) { setError('自定义密码必须为 8-128 位'); return; }
    busyRef.current = true; setBusy(true); setError('');
    try {
      const response = await resetUserPassword(user.id, { mode, password: mode === 'custom' ? password : undefined, send_email: sendEmail });
      setResult(response); setPassword(''); onComplete?.(response);
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const copy = async () => {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.password); setCopied(true); }
    catch { setError('复制失败，请手动选择密码'); }
  };
  return <Modal isOpen={isOpen} onClose={close} isDismissable={!busy} isKeyboardDismissDisabled={busy}>
    <ModalContent><ModalHeader>重置用户密码</ModalHeader><ModalBody>
      <p className="text-sm">用户 #{user?.id}　{user?.email || '未设置邮箱'}</p>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {!result && <>
        <RadioGroup label="密码方式" value={mode} onValueChange={(value) => setMode(value as 'generated' | 'custom')} isDisabled={busy}>
          <Radio value="generated">系统生成（12 位）</Radio><Radio value="custom">自定义密码</Radio>
        </RadioGroup>
        {mode === 'custom' && <Input type="password" label="新密码（8-128 位）" value={password} onValueChange={setPassword} isDisabled={busy} />}
        <Checkbox isSelected={sendEmail} onValueChange={setSendEmail} isDisabled={busy}>发送密码到用户邮箱</Checkbox>
      </>}
      {result && <div className="space-y-2">
        <Input label="新密码（请立即保存）" type={visible ? 'text' : 'password'} value={result.password} isReadOnly
          endContent={<Button isIconOnly variant="light" aria-label={visible ? '隐藏密码' : '显示密码'} onPress={() => setVisible(!visible)}>{visible ? <EyeOff /> : <Eye />}</Button>} />
        <Button size="sm" variant="flat" onPress={() => void copy()}><Copy className="mr-1" />{copied ? '已复制' : '复制'}</Button>
        <p>邮件：{result.email_requested ? (result.email_sent ? '已发送' : result.email_error || '发送失败') : '未请求'}</p>
        <p>旧会话：{result.sessions_revoked ? '已撤销' : (result.session_revocation_warning || '撤销失败')}</p>
      </div>}
    </ModalBody><ModalFooter><Button variant="light" onPress={close} isDisabled={busy}>关闭</Button>{!result && <Button color="primary" onPress={() => void submit()} isLoading={busy} isDisabled={!canReset}>确认重置</Button>}</ModalFooter></ModalContent>
  </Modal>;
};
export default UserPasswordResetModal;
