import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@heroui/react';
import { AlertCircle, Eye, EyeOff, Mail, Shield } from 'lucide-react';
import { toast } from '../../utils/toast';
import { userInfoApi } from '../../services/userApi';

interface PrecheckBlocker {
  code: string;
  message: string;
}

interface PrecheckData {
  exists: boolean;
  can_takeover: boolean;
  email: string;
  ticket: string | null;
  target_masked?: string;
  blockers?: PrecheckBlocker[];
  target_summary?: {
    has_active_membership?: boolean;
    has_team?: boolean;
    historical_orders?: number;
  };
}

interface WechatEmailBindModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onUseEmailLogin?: () => void;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;

const useCountdown = () => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (value <= 0) return undefined;
    const timer = window.setTimeout(() => setValue(value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [value]);
  return [value, setValue] as const;
};

export const WechatEmailBindModal: React.FC<WechatEmailBindModalProps> = ({
  isOpen,
  onSuccess,
  onUseEmailLogin,
}) => {
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useCountdown();
  const [prechecking, setPrechecking] = useState(false);
  const [binding, setBinding] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [precheck, setPrecheck] = useState<PrecheckData | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');

  const blocked = Boolean(precheck && !precheck.can_takeover);
  const needsTakeoverConfirm = Boolean(precheck?.exists && precheck?.can_takeover);
  const readyForBind = Boolean(precheck?.can_takeover && precheck?.ticket);

  const canSubmit = useMemo(() => {
    if (!readyForBind || binding || prechecking) return false;
    if (!password.trim() || password.length < MIN_PASSWORD_LENGTH) return false;
    if (password !== passwordConfirm) return false;
    if (needsTakeoverConfirm) {
      if (!confirmed) return false;
      if (confirmEmail.trim().toLowerCase() !== precheck?.email?.toLowerCase()) return false;
    }
    return true;
  }, [binding, confirmEmail, confirmed, needsTakeoverConfirm, password, passwordConfirm, precheck?.email, prechecking, readyForBind]);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setEmailError('');
  }, [isOpen]);

  const resetPrecheck = () => {
    setPrecheck(null);
    setConfirmed(false);
    setConfirmEmail('');
    setError('');
  };

  const validateEmail = (): boolean => {
    const value = email.trim();
    if (!value) {
      setEmailError('请输入邮箱地址');
      return false;
    }
    if (!EMAIL_REGEX.test(value)) {
      setEmailError('邮箱格式不正确，请检查后重新输入');
      return false;
    }
    setEmailError('');
    return true;
  };

  const sendCode = async () => {
    if (!validateEmail() || sendingCode || countdown > 0) return;
    setSendingCode(true);
    setError('');
    resetPrecheck();
    try {
      const response = await userInfoApi.sendWechatBindEmailCode(email.trim().toLowerCase());
      if (response.code !== 20000) {
        setError(response.msg || '验证码发送失败，请稍后重试');
        return;
      }
      setCodeSent(true);
      setCountdown(60);
      toast.success('验证码已发送，请查收邮箱');
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证码发送失败，请检查网络后重试');
    } finally {
      setSendingCode(false);
    }
  };

  const doPrecheck = async () => {
    if (!validateEmail()) return;
    if (!emailCode.trim()) {
      setError('请输入邮箱验证码');
      return;
    }
    if (!/^\d+$/.test(emailCode.trim())) {
      setError('验证码只能是数字，请重新输入');
      return;
    }
    setPrechecking(true);
    setError('');
    resetPrecheck();
    try {
      const response = await userInfoApi.precheckWechatBindEmail(email.trim().toLowerCase(), emailCode.trim());
      if (response.code !== 20000 || !response.data) {
        setError(response.msg || '邮箱检测失败，请重新获取验证码');
        return;
      }
      setPrecheck(response.data as PrecheckData);
      if (!response.data.can_takeover) {
        setError('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '邮箱检测失败，请检查网络后重试');
    } finally {
      setPrechecking(false);
    }
  };

  const bind = async () => {
    if (!precheck?.ticket || !canSubmit) return;
    setBinding(true);
    setError('');
    try {
      const response = await userInfoApi.bindWechatEmail({
        ticket: precheck.ticket,
        password: btoa(password.trim()),
        confirm_takeover: needsTakeoverConfirm,
        confirm_email: needsTakeoverConfirm ? confirmEmail.trim().toLowerCase() : undefined,
      });
      if (response.code !== 20000) {
        setError(response.msg || '邮箱绑定失败，请重试');
        return;
      }
      toast.success(needsTakeoverConfirm ? '邮箱已绑定，原邮箱账号已停用' : '邮箱绑定成功');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '邮箱绑定失败，请检查网络后重试');
    } finally {
      setBinding(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => undefined}
      isDismissable={false}
      hideCloseButton
      placement="center"
      size="lg"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-primary" />
            <span>绑定安全邮箱</span>
          </div>
          <p className="text-sm font-normal text-default-500">
            绑定后才能继续使用账号。邮箱将作为登录凭据，请填写可正常收信的地址。
          </p>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-primary" />
                <p className="text-sm text-primary">
                  为了账户安全，请绑定真实邮箱并设置登录密码。绑定后可使用邮箱 + 密码登录。
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-default-700">
                邮箱地址 <span className="text-danger">*</span>
              </label>
              <div className="flex gap-2">
                <Input
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setEmailError('');
                    setError('');
                    setCodeSent(false);
                    resetPrecheck();
                  }}
                  placeholder="请输入您的邮箱地址"
                  variant="bordered"
                  isInvalid={Boolean(emailError)}
                  errorMessage={emailError || undefined}
                  type="email"
                  startContent={<Mail size={16} className="text-default-400" />}
                />
                <Button
                  color="primary"
                  variant="flat"
                  isLoading={sendingCode}
                  isDisabled={sendingCode || countdown > 0 || !email.trim()}
                  onPress={sendCode}
                  className="min-w-[104px]"
                >
                  {countdown > 0 ? `${countdown}s` : '发送验证码'}
                </Button>
              </div>
              {codeSent && <p className="mt-1 text-xs text-success">验证码已发送，请查收邮箱</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-default-700">
                邮箱验证码 <span className="text-danger">*</span>
              </label>
              <Input
                value={emailCode}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === '' || /^\d+$/.test(value)) {
                    setEmailCode(value);
                    resetPrecheck();
                  }
                }}
                placeholder="请输入数字验证码"
                variant="bordered"
                type={showCode ? 'text' : 'password'}
                endContent={
                  <button type="button" className="focus:outline-none" onClick={() => setShowCode((value) => !value)}>
                    {showCode ? <EyeOff size={16} className="text-default-400" /> : <Eye size={16} className="text-default-400" />}
                  </button>
                }
              />
            </div>

            {!precheck && (
              <Button
                color="primary"
                variant="flat"
                fullWidth
                isLoading={prechecking}
                isDisabled={prechecking || !emailCode.trim() || !email.trim()}
                onPress={doPrecheck}
              >
                检测邮箱并继续
              </Button>
            )}

            {precheck?.exists && precheck.can_takeover && (
              <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger-700">
                <p className="mb-2 font-semibold">该邮箱已注册为独立账号</p>
                <p className="leading-6">
                  微信登录和邮箱登录目前是两个账号，数据不互通。继续绑定后：
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 leading-5">
                  <li>该邮箱会转移到当前微信账号；</li>
                  <li>原邮箱账号将被永久停用，无法再登录；</li>
                  <li>原邮箱账号的历史订单、资料、余额不会迁移；</li>
                  <li>原邮箱账号必须没有有效会员或团队权益。</li>
                </ul>
              </div>
            )}

            {blocked && (
              <Alert
                color="danger"
                variant="flat"
                title="该邮箱账号无法接管"
                description={
                  precheck?.blockers?.map((item) => item.message).join('；')
                  || '该邮箱账号仍有有效会员或团队权益。请使用该邮箱登录原账号，或联系客服处理后再绑定。'
                }
              />
            )}

            {readyForBind && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-default-700">
                    设置登录密码 <span className="text-danger">*</span>
                  </label>
                  <Input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="请输入密码，至少8位"
                    variant="bordered"
                    type={showPassword ? 'text' : 'password'}
                    endContent={
                      <button type="button" className="focus:outline-none" onClick={() => setShowPassword((value) => !value)}>
                        {showPassword ? <EyeOff size={16} className="text-default-400" /> : <Eye size={16} className="text-default-400" />}
                      </button>
                    }
                  />
                  <p className="mt-1 text-xs text-default-400">密码至少8位，用于邮箱 + 密码登录</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-default-700">
                    确认密码 <span className="text-danger">*</span>
                  </label>
                  <Input
                    value={passwordConfirm}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    placeholder="请再次输入密码"
                    variant="bordered"
                    type={showPasswordConfirm ? 'text' : 'password'}
                    endContent={
                      <button type="button" className="focus:outline-none" onClick={() => setShowPasswordConfirm((value) => !value)}>
                        {showPasswordConfirm ? <EyeOff size={16} className="text-default-400" /> : <Eye size={16} className="text-default-400" />}
                      </button>
                    }
                  />
                </div>
              </>
            )}

            {needsTakeoverConfirm && (
              <div className="space-y-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
                <Checkbox isSelected={confirmed} onValueChange={setConfirmed} size="sm">
                  <span className="text-sm text-default-700">我确认原邮箱账号不再使用，并同意停用该账号</span>
                </Checkbox>
                <div>
                  <label className="mb-1 block text-xs font-medium text-default-600">
                    请输入该邮箱地址确认
                  </label>
                  <Input
                    value={confirmEmail}
                    onChange={(event) => setConfirmEmail(event.target.value)}
                    placeholder={precheck?.email || ''}
                    variant="bordered"
                    size="sm"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-danger/20 bg-danger/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-danger" />
                  <p className="text-sm text-danger">{error}</p>
                </div>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter className="flex-col items-stretch gap-2 sm:flex-row">
          {blocked && onUseEmailLogin && (
            <Button variant="flat" color="primary" onPress={onUseEmailLogin}>
              改用邮箱账号登录
            </Button>
          )}
          {readyForBind && (
            <Button color="primary" fullWidth isLoading={binding} isDisabled={!canSubmit} onPress={bind}>
              {needsTakeoverConfirm ? '确认绑定并停用原账号' : '绑定邮箱'}
            </Button>
          )}
          <p className="text-center text-xs text-default-400">
            有疑问请联系 <a className="text-primary hover:underline" href="mailto:admin@nice188.com">admin@nice188.com</a>
          </p>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default WechatEmailBindModal;
