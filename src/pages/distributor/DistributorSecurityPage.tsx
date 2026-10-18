import React, { useState } from 'react';
import { Button, Card, CardBody, CardHeader, Divider, Form, Input } from '@heroui/react';
import { KeyRound, Lock } from 'lucide-react';
import distributorApiService from '../../services/distributorApi';
import { showToast } from '../../components/Toast';

const DistributorSecurityPage: React.FC = () => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    const handleChangePassword = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!oldPassword || !newPassword || !confirmPassword) { showToast('请填写完整的密码信息', 'warning'); return; }
        if (newPassword.length < 8) { showToast('新密码至少 8 位', 'warning'); return; }
        if (newPassword !== confirmPassword) { showToast('两次输入的新密码不一致', 'warning'); return; }
        setChangingPassword(true);
        try {
            const response = await distributorApiService.changePassword({ old_password: oldPassword, new_password: newPassword });
            if (response.code === 20000) {
                distributorApiService.clearLocalSession('密码已修改，请使用新密码重新登录');
            } else {
                showToast(response.msg || '密码修改失败', 'error');
            }
        } catch (error: unknown) {
            showToast(error instanceof Error ? error.message : '密码修改失败', 'error');
        } finally {
            setChangingPassword(false);
        }
    };

    return <div className="space-y-6">
        <header>
            <h1 className="text-2xl font-semibold">账号安全</h1>
            <p className="mt-1 text-sm text-default-500">定期更换密码保护账号与余额安全。</p>
        </header>
        <div className="mx-auto max-w-2xl">
            <Card shadow="sm">
                <CardHeader className="flex-col items-start gap-1">
                    <div className="flex items-center gap-2 font-semibold"><KeyRound className="h-5 w-5 text-warning" />修改登录密码</div>
                    <p className="text-sm text-default-500">修改成功后当前登录立即失效，需要使用新密码重新登录。</p>
                </CardHeader>
                <Divider />
                <CardBody>
                    <Form className="gap-4" onSubmit={(event) => void handleChangePassword(event)}>
                        <Input label="当前密码" type="password" value={oldPassword} onValueChange={setOldPassword} autoComplete="current-password" isRequired />
                        <Input label="新密码" type="password" value={newPassword} onValueChange={setNewPassword} autoComplete="new-password" minLength={8} description="至少 8 位，建议使用字母、数字和符号组合。" isRequired />
                        <Input label="确认新密码" type="password" value={confirmPassword} onValueChange={setConfirmPassword} autoComplete="new-password" isInvalid={Boolean(confirmPassword && newPassword !== confirmPassword)} errorMessage="两次输入的新密码不一致" isRequired />
                        <Button type="submit" color="warning" size="lg" isLoading={changingPassword} startContent={!changingPassword && <Lock className="h-5 w-5" />}>修改密码并重新登录</Button>
                    </Form>
                </CardBody>
            </Card>
        </div>
    </div>;
};

export default DistributorSecurityPage;
