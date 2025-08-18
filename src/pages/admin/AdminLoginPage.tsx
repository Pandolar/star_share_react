import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card,
    CardBody,
    CardHeader,
    Input,
    Button,
    Divider,
    Spinner,
} from '@heroui/react';
import { Eye, EyeOff, Shield, User } from 'lucide-react';
import adminApiService from '../../services/adminApi';
import { showToast } from '../../components/Toast';

const AdminLoginPage: React.FC = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const toggleVisibility = () => setIsVisible(!isVisible);

    const handleInputChange = (field: string) => (value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.username.trim()) {
            showToast('请输入用户名', 'warning');
            return;
        }

        if (!formData.password.trim()) {
            showToast('请输入密码', 'warning');
            return;
        }

        setIsLoading(true);

        try {
            console.log('[AdminLogin] 开始登录，用户名:', formData.username);
            const response = await adminApiService.login(formData.username, formData.password);
            console.log('[AdminLogin] 登录API响应:', response);

            if (response.code === 20000) {
                console.log('[AdminLogin] 登录成功，准备跳转到:', '/star-admin');
                showToast('登录成功', 'success');
                navigate('/star-admin');
            } else {
                console.log('[AdminLogin] 登录失败，错误信息:', response.msg);
                showToast(response.msg || '登录失败', 'error');
            }
        } catch (error) {
            console.error('[AdminLogin] 登录异常:', error);
            showToast('登录失败，请检查网络连接', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <Card className="shadow-2xl border-0">
                    <CardHeader className="flex flex-col gap-3 pb-6">
                        <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-gray-800">管理员登录</h1>
                            <p className="text-gray-600 text-sm mt-1">欢迎使用Star Share管理后台</p>
                        </div>
                    </CardHeader>

                    <Divider />

                    <CardBody className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <Input
                                type="text"
                                label="用户名"
                                placeholder="请输入用户名"

                                onValueChange={handleInputChange('username')}
                                startContent={<User className="w-4 h-4 text-gray-400" />}
                                variant="bordered"
                                isRequired
                                className="w-full"
                            />

                            <Input
                                label="密码"
                                placeholder="请输入密码"

                                onValueChange={handleInputChange('password')}
                                startContent={<Shield className="w-4 h-4 text-gray-400" />}
                                endContent={
                                    <button className="focus:outline-none" type="button" onClick={toggleVisibility}>
                                        {isVisible ? (
                                            <EyeOff className="w-4 h-4 text-gray-400" />
                                        ) : (
                                            <Eye className="w-4 h-4 text-gray-400" />
                                        )}
                                    </button>
                                }
                                type={isVisible ? "text" : "password"}
                                variant="bordered"
                                isRequired
                                className="w-full"
                            />

                            <Button
                                type="submit"
                                color="primary"
                                size="lg"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                                isDisabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Spinner size="sm" color="white" />
                                        登录中...
                                    </>
                                ) : (
                                    '登录'
                                )}
                            </Button>
                        </form>
                    </CardBody>
                </Card>

                <div className="text-center mt-6">
                    <p className="text-gray-500 text-sm">
                        © 2024 Star Share. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginPage; 