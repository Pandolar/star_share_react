import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Eye, EyeOff, Lock, LogIn, User } from 'lucide-react';
import distributorApiService from '../../services/distributorApi';
import { showToast } from '../../components/Toast';

const DistributorLoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (distributorApiService.isLoggedIn()) {
            navigate('/distributor/dashboard', { replace: true });
        }
    }, [navigate]);

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!username.trim() || !password) {
            showToast('请输入分销商账号和密码', 'warning');
            return;
        }

        setLoading(true);
        try {
            const response = await distributorApiService.login({
                username: username.trim(),
                password,
            });
            if (response.code === 20000 && response.data) {
                localStorage.setItem('dtoken', response.data.dtoken);
                localStorage.setItem('distributor', JSON.stringify(response.data));
                showToast('登录成功', 'success');
                navigate('/distributor/dashboard', { replace: true });
            } else {
                showToast(response.msg || '登录失败', 'error');
            }
        } catch (error: any) {
            showToast(error.response?.data?.msg || error.message || '登录失败，请检查网络', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-default-50 p-4">
            <div className="w-full max-w-md space-y-4">
                <Card shadow="lg">
                    <CardHeader className="flex-col gap-3 pb-5 text-center">
                        <Avatar color="primary" icon={<LogIn className="h-7 w-7" />} size="lg" />
                        <div>
                            <h1 className="text-2xl font-semibold text-foreground">分销商登录</h1>
                            <p className="mt-1 text-sm text-default-500">管理卡密、余额和白牌站点内容</p>
                        </div>
                    </CardHeader>
                    <Divider />
                    <CardBody className="py-6">
                        <Form className="gap-5" onSubmit={handleLogin}>
                            <Input
                                label="分销商账号"
                                value={username}
                                onValueChange={setUsername}
                                startContent={<User className="h-4 w-4 text-default-400" />}
                                autoComplete="username"
                                autoFocus
                                isRequired
                            />
                            <Input
                                label="登录密码"
                                type={passwordVisible ? 'text' : 'password'}
                                value={password}
                                onValueChange={setPassword}
                                startContent={<Lock className="h-4 w-4 text-default-400" />}
                                endContent={(
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        aria-label={passwordVisible ? '隐藏密码' : '显示密码'}
                                        onPress={() => setPasswordVisible((visible) => !visible)}
                                    >
                                        {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                )}
                                autoComplete="current-password"
                                isRequired
                            />
                            <Button
                                className="w-full"
                                type="submit"
                                color="primary"
                                size="lg"
                                isLoading={loading}
                                startContent={!loading && <LogIn className="h-5 w-5" />}
                            >
                                登录控制台
                            </Button>
                        </Form>
                    </CardBody>
                </Card>

                <Alert
                    isVisible
                    color="default"
                    variant="flat"
                    title="无法登录或忘记密码？"
                    description="分销商账号、登录权限、余额、折扣和域名均由平台管理员配置，请联系管理员处理。"
                />
            </div>
        </main>
    );
};

export default DistributorLoginPage;
