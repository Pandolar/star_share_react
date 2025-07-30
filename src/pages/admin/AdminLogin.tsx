import React, { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  Input,
  Button,
  Spinner,
  Divider,
  Link,
  Image
} from '@heroui/react';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import { isAuthenticated, setStoredToken } from '../../config';
import { showMessage } from '../../utils/toast';

const AdminLogin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [errors, setErrors] = useState<{username?: string; password?: string}>({});
  const navigate = useNavigate();

  const toggleVisibility = () => setIsVisible(!isVisible);

  // 如果已经登录，直接跳转到管理页面
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  // 表单验证
  const validateForm = () => {
    const newErrors: {username?: string; password?: string} = {};

    if (!username || username.length < 3) {
      newErrors.username = username ? '用户名至少3个字符' : '请输入用户名';
    }

    if (!password || password.length < 6) {
      newErrors.password = password ? '密码至少6个字符' : '请输入密码';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.login(username, password);

      if (response.code === 20000 && response.data?.admin_token) {
        setStoredToken(response.data.admin_token);
        showMessage.success('登录成功，欢迎回来！');
        navigate('/admin/dashboard', { replace: true });
      } else {
        showMessage.error(response.msg || '登录失败，请检查用户名和密码');
      }
    } catch (error) {
      showMessage.error(error instanceof Error ? error.message : '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo和标题区域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            管理员登录
          </h1>
          <p className="text-gray-600">
            欢迎回来，请登录您的管理员账户
          </p>
        </div>

        {/* 登录表单 */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardBody className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 用户名输入 */}
              <Input
                type="text"
                label="用户名"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                startContent={<User className="w-4 h-4 text-gray-400" />}
                isInvalid={!!errors.username}
                errorMessage={errors.username}
                size="lg"
                variant="bordered"
                classNames={{
                  input: "text-sm",
                  inputWrapper: "border-gray-200 hover:border-blue-400 focus-within:border-blue-500"
                }}
              />

              {/* 密码输入 */}
              <Input
                type={isVisible ? "text" : "password"}
                label="密码"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                startContent={<Lock className="w-4 h-4 text-gray-400" />}
                endContent={
                  <button
                    className="focus:outline-none"
                    type="button"
                    onClick={toggleVisibility}
                    aria-label="切换密码可见性"
                  >
                    {isVisible ? (
                      <EyeOff className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                }
                isInvalid={!!errors.password}
                errorMessage={errors.password}
                size="lg"
                variant="bordered"
                classNames={{
                  input: "text-sm",
                  inputWrapper: "border-gray-200 hover:border-blue-400 focus-within:border-blue-500"
                }}
              />

              {/* 登录按钮 */}
              <Button
                type="submit"
                color="primary"
                size="lg"
                isLoading={loading}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg"
                spinner={<Spinner size="sm" color="white" />}
              >
                {loading ? '登录中...' : '登录'}
              </Button>
            </form>

            <Divider className="my-6" />

            {/* 底部信息 */}
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-500">
                请确保您有管理员权限
              </p>
              <Link
                href="/"
                size="sm"
                className="text-blue-600 hover:text-blue-700"
              >
                返回首页
              </Link>
            </div>
          </CardBody>
        </Card>

        {/* 底部版权信息 */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © 2024 Star Share. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;