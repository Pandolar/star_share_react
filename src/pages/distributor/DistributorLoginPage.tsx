import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Input, Button } from '@heroui/react';
import { Lock, User, LogIn } from 'lucide-react';
import distributorApiService from '../../services/distributorApi';
import { showToast } from '../../components/Toast';

const DistributorLoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // 如果已登录，跳转到控制面板
        if (distributorApiService.isLoggedIn()) {
            navigate('/distributor/dashboard');
        }
    }, [navigate]);

    const handleLogin = async () => {
        if (!username || !password) {
            showToast('请输入账号和密码', 'warning');
            return;
        }

        setLoading(true);
        try {
            const response = await distributorApiService.login({
                username: username.trim(),
                password: password,
            });

            if (response.code === 20000 && response.data) {
                // 保存 dtoken 和分销商信息
                localStorage.setItem('dtoken', response.data.dtoken);
                localStorage.setItem('distributor', JSON.stringify(response.data));

                showToast('登录成功', 'success');

                // 跳转到控制面板
                setTimeout(() => {
                    navigate('/distributor/dashboard');
                }, 500);
            } else {
                showToast(response.msg || '登录失败', 'error');
            }
        } catch (error: any) {
            console.error('登录失败:', error);
            showToast(error.response?.data?.msg || error.message || '登录失败，请检查网络', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo 和标题 */}
                <div className="text-center mb-8">
                    <div className="inline-block p-4 bg-blue-500 rounded-2xl mb-4">
                        <LogIn className="w-12 h-12 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-default-800 mb-2">分销商登录</h1>
                    <p className="text-default-500">登录后管理您的白牌站点配置</p>
                </div>

                {/* 登录卡片 */}
                <Card className="shadow-lg">
                    <CardBody className="p-8">
                        <div className="space-y-6">
                            <Input
                                label="分销商账号"
                                placeholder="请输入您的账号"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onKeyPress={handleKeyPress}
                                startContent={<User className="w-4 h-4 text-default-400" />}
                                variant="bordered"
                                size="lg"
                                autoFocus
                            />

                            <Input
                                label="登录密码"
                                type="password"
                                placeholder="请输入密码"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyPress={handleKeyPress}
                                startContent={<Lock className="w-4 h-4 text-default-400" />}
                                variant="bordered"
                                size="lg"
                            />

                            <Button
                                color="primary"
                                size="lg"
                                className="w-full"
                                onPress={handleLogin}
                                isLoading={loading}
                                startContent={!loading && <LogIn className="w-5 h-5" />}
                            >
                                {loading ? '登录中...' : '登录'}
                            </Button>

                            <div className="text-center text-sm text-default-500">
                                <p>忘记密码？请联系管理员重置</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* 底部提示 */}
                <div className="text-center mt-6 text-sm text-default-400">
                    <p>© 2024 白牌分销商系统</p>
                </div>
            </div>
        </div>
    );
};

export default DistributorLoginPage;
