import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { Input, Button, Spinner } from '@heroui/react';
import { Eye, EyeOff } from 'lucide-react';
import { sendEmailCode, resetPassword } from '../../services/authApi';
import { toast } from '../../utils/toast';
import { useAutoLogin } from '../../hooks/useAutoLogin';
import { useRedirect } from '../../hooks/useRedirect';

const ForgotPasswordPage: React.FC = () => {
    // 状态管理
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSendingCode, setIsSendingCode] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [countdown, setCountdown] = useState(0);

      // Hooks
  const isLoggedIn = useAutoLogin();
  const redirect = useRedirect();
  const location = useLocation();
  const navigate = useNavigate();

  // 如果用户已登录，自动重定向
  React.useEffect(() => {
    if (isLoggedIn) {
      redirect();
    }
  }, [isLoggedIn, redirect]);

    /**
     * 邮箱格式验证
     * @param value 邮箱地址
     * @returns 是否有效
     */
    const validateEmail = (value: string) => {
        if (!value || /^[\w-.+]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)) {
            setEmailError('');
            return true;
        } else {
            setEmailError('请输入有效的邮箱地址');
            return false;
        }
    };

    /**
     * 处理邮箱输入变化
     */
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEmail = e.target.value;
        setEmail(newEmail);
        validateEmail(newEmail);
    };

    /**
     * 发送邮箱验证码
     * 使用type_: 'back_password'参数
     */
    const handleSendCode = async () => {
        if (!validateEmail(email)) return;
        setIsSendingCode(true);
        try {
            await sendEmailCode(email, 'back_password');
            toast.success('验证码已发送，请注意查收');
            setIsSendingCode(false);
            // 开始60秒倒计时
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

    /**
     * 处理找回密码表单提交
     * 调用/u/back_password接口
     */
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        // 表单验证
        if (emailError || !email || !code || !password) {
            toast.warning('请填写完整的找回密码信息');
            return;
        }

        setIsResetting(true);
        try {
            await resetPassword(email, code, password);
            toast.success('密码重置成功！请使用新密码登录');
            // 跳转到登录页面，携带当前URL参数
            navigate(`/login${location.search}`);
        } catch (error) {
            // 错误已在拦截器中处理，此处无需额外提示
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <AuthLayout title="找回密码">
            {isLoggedIn ? (
                <div className="text-center text-gray-600">
                    <p>您已登录，正在跳转...</p>
                </div>
            ) : (
                <form onSubmit={handleResetPassword} className="space-y-6">
                    {/* 邮箱输入 */}
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

                    {/* 邮箱验证码输入和发送按钮 */}
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

                    {/* 新密码输入 */}
                    <div>
                        <Input
                            label="新密码"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="请输入您的新密码"
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

                    {/* 提交按钮 */}
                    <Button
                        type="submit"
                        color="primary"
                        fullWidth
                        disabled={isResetting}
                        className="!mt-8 bg-primary-500 text-white hover:bg-primary-600 disabled:bg-gray-300"
                    >
                        {isResetting ? <Spinner size="sm" color="white" /> : '重置密码'}
                    </Button>

                    {/* 导航链接 */}
                    <div className="text-center mt-4 space-y-2">
                        <Link to={`/register${location.search}`} className="block text-sm text-primary-600 hover:text-primary-500">
                            还没有账户？立即注册
                        </Link>
                    </div>
                </form>
            )}
        </AuthLayout>
    );
};

export default ForgotPasswordPage; 