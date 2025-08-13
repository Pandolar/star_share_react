import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { Input, Button, Spinner } from '@heroui/react';
import { Eye, EyeOff } from 'lucide-react';
import { sendEmailCode, registerUser } from '../../services/authApi';
import { toast } from '../../utils/toast';
import { setAuthCookies } from '../../utils/cookies';
import { useAutoLogin } from '../../hooks/useAutoLogin';
import { useRedirect } from '../../hooks/useRedirect';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const isLoggedIn = useAutoLogin();
  const redirect = useRedirect();
  const location = useLocation();

  const validateEmail = (value: string) => {
    if (!value || /^[\w-.+]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)) {
      setEmailError('');
      return true;
    } else {
      setEmailError('请输入有效的邮箱地址');
      return false;
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    validateEmail(newEmail);
  };

  const handleSendCode = async () => {
    if (!validateEmail(email)) return;
    setIsSendingCode(true);
    try {
      await sendEmailCode(email, 'register');
      toast.success('验证码已发送，请注意查收');
      setIsSendingCode(false);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev === 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      // 错误已在拦截器中处理，此处无需额外提示
      setIsSendingCode(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailError || !code || !password) {
      toast.warning('请填写完整的注册信息');
      return;
    }
    setIsRegistering(true);
    try {
      const data = await registerUser(email, code, password);
      if (data && data.xuserid && data.xtoken && data.xy_uuid_token) {
        setAuthCookies({ xuserid: data.xuserid, xtoken: data.xtoken, xy_uuid_token: data.xy_uuid_token });
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
          <Button
            type="submit"
            color="primary"
            fullWidth
            disabled={isRegistering}
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
