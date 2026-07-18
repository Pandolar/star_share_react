import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Avatar,
    Card,
    CardBody,
    CardHeader,
    Input,
    Button,
    Divider,
    Form,
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
            const response = await adminApiService.login(formData.username, formData.password);

            if (response.code === 20000) {
                showToast('登录成功', 'success');
                navigate('/star-admin');
            } else {
                showToast(response.msg || '登录失败', 'error');
            }
        } catch {
            showToast('登录失败，请检查网络连接', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-default-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <Card shadow="lg">
                    <CardHeader className="flex flex-col gap-3 pb-6">
                        <Avatar color="primary" icon={<Shield className="h-7 w-7" />} size="lg" />
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-default-800">管理员登录</h1>
                            <p className="text-default-600 text-sm mt-1">欢迎使用Star Share管理后台</p>
                        </div>
                    </CardHeader>

                    <Divider />

                    <CardBody className="pt-6">
                        <Form onSubmit={handleSubmit} className="space-y-6">
                            <Input
                                type="text"
                                label="用户名"
                                placeholder="请输入用户名"
                                value={formData.username}
                                onValueChange={handleInputChange('username')}
                                startContent={<User className="w-4 h-4 text-default-400" />}
                                variant="bordered"
                                isRequired
                                className="w-full"
                            />

                            <Input
                                label="密码"
                                placeholder="请输入密码"
                                value={formData.password}
                                onValueChange={handleInputChange('password')}
                                startContent={<Shield className="w-4 h-4 text-default-400" />}
                                endContent={
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        aria-label={isVisible ? '隐藏密码' : '显示密码'}
                                        onPress={toggleVisibility}
                                    >
                                        {isVisible ? (
                                            <EyeOff className="w-4 h-4 text-default-400" />
                                        ) : (
                                            <Eye className="w-4 h-4 text-default-400" />
                                        )}
                                    </Button>
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
                                className="w-full font-medium"
                                isLoading={isLoading}
                            >
                                {isLoading ? '登录中...' : '登录'}
                            </Button>
                        </Form>
                    </CardBody>
                </Card>

                <div className="text-center mt-6">
                    <p className="text-default-500 text-sm">
                        © 2024 Star Share. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginPage;
