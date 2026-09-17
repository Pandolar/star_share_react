import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
    Alert,
    Avatar,
    Button,
    Card,
    CardBody,
    CardHeader,
    Divider,
    Form,
    Input,
} from '@heroui/react';
import { ArrowLeft, Eye, EyeOff, KeyRound, Shield, User } from 'lucide-react';
import adminApiService from '../../services/adminApi';
import { showToast } from '../../components/Toast';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const AdminLoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [challengeToken, setChallengeToken] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, isLoading: authLoading, principal, refresh } = useAdminAuth();

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            navigate(principal?.must_change_password ? '/star-admin/security?forcePassword=1' : '/star-admin', { replace: true });
        }
    }, [authLoading, isAuthenticated, navigate, principal?.must_change_password]);

    if (!authLoading && isAuthenticated) return <Navigate to={principal?.must_change_password ? '/star-admin/security?forcePassword=1' : '/star-admin'} replace />;

    const finishLogin = async () => {
        const nextPrincipal = await refresh();
        if (!nextPrincipal) throw new Error('登录会话建立失败');
        showToast('登录成功', 'success');
        const requested = (location.state as { from?: string } | null)?.from;
        navigate(nextPrincipal.must_change_password ? '/star-admin/security?forcePassword=1' : requested || '/star-admin', { replace: true });
    };

    const submitPassword = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!username.trim() || !password) {
            showToast('请输入账号和密码', 'warning');
            return;
        }
        setIsLoading(true);
        try {
            const response = await adminApiService.login(username.trim(), password);
            if (response.code !== 20000) throw new Error(response.msg || '登录失败');
            if (response.data.mfa_required) {
                setChallengeToken(response.data.challenge_token || null);
                setMfaCode('');
                return;
            }
            await finishLogin();
        } catch (error) {
            const message = error instanceof Error ? error.message : '登录失败，请检查网络连接';
            showToast(message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const submitMfa = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!challengeToken || !/^\d{6}$/.test(mfaCode)) {
            showToast('请输入 6 位动态验证码', 'warning');
            return;
        }
        setIsLoading(true);
        try {
            const response = await adminApiService.verifyMfa(challengeToken, mfaCode);
            if (response.code !== 20000) throw new Error(response.msg || '动态验证码错误');
            await finishLogin();
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'MFA 验证失败', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-default-50 flex items-center justify-center p-4">
            <Card shadow="lg" className="w-full max-w-md">
                <CardHeader className="flex flex-col gap-3 pb-6">
                    <Avatar color="primary" icon={<Shield className="h-7 w-7" />} size="lg" />
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-default-800">管理员登录</h1>
                        <p className="mt-1 text-sm text-default-600">独立账号、权限与会话审计</p>
                    </div>
                </CardHeader>
                <Divider />
                <CardBody className="pt-6">
                    {challengeToken ? (
                        <Form onSubmit={submitMfa} className="space-y-5">
                            <Alert color="primary" variant="flat" title="需要双重验证" description="请输入身份验证器中当前显示的 6 位动态验证码。" />
                            <Input
                                label="动态验证码"
                                value={mfaCode}
                                onValueChange={(value) => setMfaCode(value.replace(/\D/g, '').slice(0, 6))}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                startContent={<KeyRound className="h-4 w-4 text-default-400" />}
                                isRequired
                            />
                            <div className="flex w-full gap-2">
                                <Button variant="flat" startContent={<ArrowLeft className="h-4 w-4" />} onPress={() => { setChallengeToken(null); setMfaCode(''); }}>返回</Button>
                                <Button type="submit" color="primary" className="flex-1" isLoading={isLoading}>验证并登录</Button>
                            </div>
                        </Form>
                    ) : (
                        <Form onSubmit={submitPassword} className="space-y-6">
                            <Input type="text" label="管理员账号" value={username} onValueChange={setUsername} autoComplete="username" startContent={<User className="h-4 w-4 text-default-400" />} isRequired />
                            <Input
                                label="密码"
                                value={password}
                                onValueChange={setPassword}
                                autoComplete="current-password"
                                startContent={<Shield className="h-4 w-4 text-default-400" />}
                                endContent={<Button isIconOnly size="sm" variant="light" aria-label={isVisible ? '隐藏密码' : '显示密码'} onPress={() => setIsVisible((current) => !current)}>{isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>}
                                type={isVisible ? 'text' : 'password'}
                                isRequired
                            />
                            <Button type="submit" color="primary" size="lg" className="w-full font-medium" isLoading={isLoading}>登录</Button>
                        </Form>
                    )}
                </CardBody>
            </Card>
        </div>
    );
};

export default AdminLoginPage;
