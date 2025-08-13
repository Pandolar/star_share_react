import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { Input, Button, Spinner } from '@heroui/react';
import { Eye, EyeOff } from 'lucide-react';
import { loginUser } from '../../services/authApi';
import { setAuthCookies } from '../../utils/cookies';
import { toast } from '../../utils/toast';
import { useAutoLogin } from '../../hooks/useAutoLogin';
import { useRedirect } from '../../hooks/useRedirect';

const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const isLoggedIn = useAutoLogin();
  const redirect = useRedirect();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.warning('请输入邮箱/用户名和密码');
      return;
    }
    setIsLoggingIn(true);
    try {
      const data = await loginUser(identifier, password);
      if (data && data.xuserid && data.xtoken && data.xy_uuid_token) {
        setAuthCookies({ xuserid: data.xuserid, xtoken: data.xtoken, xy_uuid_token: data.xy_uuid_token });
        toast.success('登录成功！正在跳转...');
        redirect();
      }
    } catch (error) {
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <AuthLayout title="登录您的账户">
      {isLoggedIn ? (
        <div className="text-center text-gray-600">
          <p>您已登录，正在跳转...</p>
        </div>
      ) : (
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <Input
              label="邮箱"
              placeholder="请输入您的邮箱"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              fullWidth
              required
            />
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
            disabled={isLoggingIn}
            className="!mt-8 bg-primary-500 text-white hover:bg-primary-600 disabled:bg-gray-300"
          >
            {isLoggingIn ? <Spinner size="sm" color="white" /> : '登录'}
          </Button>
          <div className="text-center mt-4 space-y-2">
            <div className="flex flex-col items-center space-y-1">
              <Link
                to={`/forgot-password${location.search}`}
                className="text-xs text-gray-400 hover:text-primary-500 transition-colors"
                style={{ marginBottom: 2 }}
              >
                找回密码
              </Link>
              <Link
                to={`/register${location.search}`}
                className="text-sm text-primary-700 hover:text-primary-600 font-medium"
              >
                还没有账户？
                <span className="ml-1 text-sm text-primary-600 hover:text-primary-700 underline underline-offset-2">
                  立即注册
                </span>
              </Link>
            </div>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default LoginPage;
