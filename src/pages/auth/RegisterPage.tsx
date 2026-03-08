import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { Input, Button, Spinner } from '@heroui/react';
import { Eye, EyeOff, ChevronDown, Gift } from 'lucide-react';
import { sendEmailCode, registerUser, validateInviteAff } from '../../services/authApi';
import { toast } from '../../utils/toast';
import { setAuthCookies } from '../../utils/cookies';
import { useAutoLogin } from '../../hooks/useAutoLogin';
import { useRedirect } from '../../hooks/useRedirect';

const USER_AGREEMENT_URL = 'https://r7r3bw489x.feishu.cn/wiki/Mq7FwBuhdiNH12kmqFvc4W0onqg';
const AFF_STORAGE_KEY = 'register_aff';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [hasAgreedUserAgreement, setHasAgreedUserAgreement] = useState(true);
  const [showInviteField, setShowInviteField] = useState(false);
  const [aff, setAff] = useState('');
  const [affHelper, setAffHelper] = useState('');
  const [affError, setAffError] = useState('');
  const [validatingAff, setValidatingAff] = useState(false);

  const isLoggedIn = useAutoLogin();
  const redirect = useRedirect();
  const location = useLocation();

  const initialAff = useMemo(() => {
    const searchAff = new URLSearchParams(location.search).get('aff') || '';
    const storedAff = sessionStorage.getItem(AFF_STORAGE_KEY) || '';
    return (searchAff || storedAff).trim();
  }, [location.search]);

  useEffect(() => {
    if (!initialAff) {
      return;
    }
    setAff(initialAff);
    setShowInviteField(true);
    sessionStorage.setItem(AFF_STORAGE_KEY, initialAff);
  }, [initialAff]);

  const validateEmail = (value: string) => {
    if (!value || /^[\w-.+]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)) {
      setEmailError('');
      return true;
    }
    setEmailError('请输入有效的邮箱地址');
    return false;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    validateEmail(newEmail);
  };

  const handleValidateAff = async (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
      setAffError('');
      setAffHelper('邀请码为选填项，没有可留空。');
      sessionStorage.removeItem(AFF_STORAGE_KEY);
      return true;
    }
    setValidatingAff(true);
    setAffError('');
    try {
      const result = await validateInviteAff(trimmed);
      setAffHelper(`邀请码有效，邀请人：${result.masked}`);
      sessionStorage.setItem(AFF_STORAGE_KEY, trimmed);
      return true;
    } catch (error) {
      setAffError(error instanceof Error ? error.message : '邀请码校验失败');
      setAffHelper('');
      return false;
    } finally {
      setValidatingAff(false);
    }
  };

  const handleSendCode = async () => {
    if (!validateEmail(email)) return;
    setIsSendingCode(true);
    try {
      await sendEmailCode(email, 'register');
      toast.success('验证码已发送到您的邮箱，请在邮箱中查看！若没有收到邮件请检查邮箱是否正确，或前往垃圾箱确认');
      setIsSendingCode(false);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      setIsSendingCode(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAgreedUserAgreement) {
      toast.warning('请先勾选同意《用户协议》');
      return;
    }
    if (emailError || !code || !password) {
      toast.warning('请填写完整的注册信息');
      return;
    }
    if (aff.trim()) {
      const isAffValid = await handleValidateAff(aff);
      if (!isAffValid) {
        return;
      }
    }
    setIsRegistering(true);
    try {
      const data = await registerUser(email, code, password, aff.trim() || undefined);
      if (data && data.xuserid && data.xtoken && data.xy_uuid_token) {
        setAuthCookies({ xuserid: data.xuserid, xtoken: data.xtoken, xy_uuid_token: data.xy_uuid_token });
        sessionStorage.removeItem(AFF_STORAGE_KEY);
        toast.success('注册成功！正在跳转...');
        redirect();
      }
    } catch (error) {
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <AuthLayout title="创建新账户">
      {isLoggedIn ? (
        <div className="text-center text-gray-600">
          <p>您已登录，正在跳转...</p>
        </div>
      ) : (
        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <Input
              label="邮箱"
              type="email"
              placeholder="请输入您的邮箱地址"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => validateEmail(email)}
              errorMessage={emailError}
              isInvalid={!!emailError}
              fullWidth
              required
            />
          </div>
          <div className="flex items-start space-x-2">
            <div className="flex-grow">
              <Input
                label="邮箱验证码"
                placeholder="请输入验证码"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                fullWidth
                required
              />
            </div>
            <div className="h-14 flex items-center">
              <Button
                type="button"
                color="primary"
                onClick={handleSendCode}
                disabled={!!emailError || !email || isSendingCode || countdown > 0}
                className="h-10 shrink-0 bg-primary-500 text-white hover:bg-primary-600 disabled:bg-gray-300"
              >
                {isSendingCode ? <Spinner size="sm" /> : (countdown > 0 ? `${countdown}s` : '发送验证码')}
              </Button>
            </div>
          </div>
          <div>
            <Input
              label="密码"
              type={showPassword ? 'text' : 'password'}
              placeholder="请输入您的密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              endContent={
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="focus:outline-none">
                  {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </button>
              }
            />
          </div>

          <div className="rounded-xl border border-default-200 bg-default-50/70 p-4 space-y-3">
            <button
              type="button"
              onClick={() => setShowInviteField((prev) => !prev)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-default-800">有邀请码？点击填写</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-default-500 transition-transform ${showInviteField ? 'rotate-180' : ''}`} />
            </button>
            {showInviteField && (
              <div className="space-y-2">
                <Input
                  label="邀请码"
                  placeholder="请输入邀请码"
                  value={aff}
                  onChange={(e) => {
                    setAff(e.target.value.toLowerCase());
                    setAffError('');
                  }}
                  onBlur={() => handleValidateAff(aff)}
                  errorMessage={affError}
                  isInvalid={!!affError}
                  description={affHelper || (initialAff ? '已从邀请链接中自动识别邀请码，您也可以手动修改。' : '选填项，好友分享的邀请码可填写在这里。')}
                  endContent={validatingAff ? <Spinner size="sm" /> : undefined}
                  fullWidth
                />
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 text-sm text-gray-600">
            <input
              id="register-user-agreement"
              type="checkbox"
              checked={hasAgreedUserAgreement}
              onChange={(e) => setHasAgreedUserAgreement(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div className="leading-5">
              <label htmlFor="register-user-agreement" className="select-none">
                注册即代表同意
              </label>
              <a
                href={USER_AGREEMENT_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="ml-1 text-primary-700 hover:text-primary-600 underline underline-offset-2"
              >
                《用户协议》
              </a>
            </div>
          </div>
          <Button
            type="submit"
            color="primary"
            fullWidth
            disabled={isRegistering || !hasAgreedUserAgreement}
            className="!mt-8 bg-primary-500 text-white hover:bg-primary-600 disabled:bg-gray-300"
          >
            {isRegistering ? <Spinner size="sm" color="white" /> : '注册'}
          </Button>
          <div className="text-center mt-4 space-y-2">
            <Link to={`/login${location.search}`} className="block text-sm text-primary-600 hover:text-primary-500">
              已有账户？直接登录
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default RegisterPage;
