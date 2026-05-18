import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Tabs,
  Tab,
  Input,
  Spinner,
} from '@heroui/react';
import { Edit3, User, Mail, Shield, AlertCircle, Send, Eye, EyeOff } from 'lucide-react';
import { userInfoApi } from '../../../../services/userApi';
import { sendEmailCode as sendAuthEmailCode, resetPassword } from '../../../../services/authApi';
import { setAuthCookies } from '../../../../utils/cookies';
import type { UserInfo, EditTabKey } from './types';

interface EditProfileModalProps {
  isOpen: boolean;
  initialTab?: EditTabKey;
  userInfo: UserInfo | null;
  onClose: () => void;
  onUserInfoChange: (next: Partial<UserInfo>) => void;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const useCountdown = () => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (value <= 0) return;
    const t = setTimeout(() => setValue(value - 1), 1000);
    return () => clearTimeout(t);
  }, [value]);
  return [value, setValue] as const;
};

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  initialTab = 'username',
  userInfo,
  onClose,
  onUserInfoChange,
}) => {
  const [activeTab, setActiveTab] = useState<EditTabKey>(initialTab);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // 用户名
  const [newUsername, setNewUsername] = useState('');

  // 邮箱
  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCodeSending, setEmailCodeSending] = useState(false);
  const [countdown, setCountdown] = useCountdown();
  const [showEmailCode, setShowEmailCode] = useState(false);
  const [bindPassword, setBindPassword] = useState('');
  const [showBindPassword, setShowBindPassword] = useState(false);

  // 密码
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwdEmailCode, setPwdEmailCode] = useState('');
  const [pwdCodeSent, setPwdCodeSent] = useState(false);
  const [pwdCodeSending, setPwdCodeSending] = useState(false);
  const [pwdCountdown, setPwdCountdown] = useCountdown();
  const [showPwdEmailCode, setShowPwdEmailCode] = useState(false);

  // Modal 打开时，初始化字段
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setEditError('');
    setNewUsername(userInfo?.username || '');
    setNewEmail(userInfo?.email || '');
    setEmailCode('');
    setEmailCodeSent(false);
    setCountdown(0);
    setBindPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPwdEmailCode('');
    setPwdCodeSent(false);
    setPwdCountdown(0);
    setShowPwdEmailCode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const sendEmailCodeAction = async () => {
    setEditError('');
    if (!newEmail.trim()) {
      setEditError('请输入新邮箱地址');
      return;
    }
    if (!EMAIL_REGEX.test(newEmail.trim())) {
      setEditError('邮箱格式不正确，请检查后重新输入');
      return;
    }
    setEmailCodeSending(true);
    try {
      const response = await userInfoApi.sendEmailCode(newEmail.trim());
      if (response.code === 20000) {
        setEmailCodeSent(true);
        setCountdown(60);
      } else {
        setEditError(response.msg || '发送验证码失败，请稍后重试');
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '发送验证码失败，请检查网络后重试');
    } finally {
      setEmailCodeSending(false);
    }
  };

  const sendPwdResetCode = async () => {
    if (!userInfo?.email || userInfo.email.endsWith('@default.com')) {
      setEditError('请先绑定非默认邮箱再重置密码');
      return;
    }
    setPwdCodeSending(true);
    setEditError('');
    try {
      await sendAuthEmailCode(userInfo.email, 'back_password');
      setPwdCodeSent(true);
      setPwdCountdown(60);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '发送验证码失败');
    } finally {
      setPwdCodeSending(false);
    }
  };

  const handleSubmit = async () => {
    setEditLoading(true);
    setEditError('');
    try {
      if (activeTab === 'username') {
        if (!newUsername.trim()) {
          setEditError('用户名不能为空');
          return;
        }
        const response = await userInfoApi.changeUserInfo({
          change_type: 'username',
          username: newUsername.trim(),
        });
        if (response.code === 20000) {
          onUserInfoChange({ username: newUsername.trim() });
          onClose();
        } else {
          setEditError(response.msg || '修改用户名失败');
        }
      } else if (activeTab === 'email') {
        if (!userInfo?.email.endsWith('@default.com')) {
          setEditError('当前邮箱不是@default.com结尾，无法修改');
          return;
        }
        if (!newEmail.trim()) {
          setEditError('请输入新邮箱地址');
          return;
        }
        if (!EMAIL_REGEX.test(newEmail.trim())) {
          setEditError('邮箱格式不正确，请检查后重新输入');
          return;
        }
        if (!emailCode.trim()) {
          setEditError('请输入邮箱验证码');
          return;
        }
        if (!/^\d+$/.test(emailCode.trim())) {
          setEditError('验证码只能是数字，请重新输入');
          return;
        }
        if (bindPassword && bindPassword.trim().length > 0 && bindPassword.trim().length < 8) {
          setEditError('密码长度至少为8位');
          return;
        }
        const payload: any = {
          change_type: 'email',
          email: newEmail.trim(),
          email_code: emailCode.trim(),
        };
        if (bindPassword && bindPassword.trim()) {
          payload.password = btoa(bindPassword.trim());
        }
        const response = await userInfoApi.changeUserInfo(payload);
        if (response.code === 20000) {
          onUserInfoChange({ email: newEmail.trim() });
          onClose();
        } else {
          setEditError(response.msg || '修改邮箱失败，请重试');
        }
      } else if (activeTab === 'password') {
        if (!userInfo?.email || userInfo.email.endsWith('@default.com')) {
          setEditError('请先绑定非默认邮箱再重置密码');
          return;
        }
        if (!pwdEmailCode.trim()) {
          setEditError('请输入邮箱验证码');
          return;
        }
        if (!/^\d+$/.test(pwdEmailCode.trim())) {
          setEditError('验证码只能是数字，请重新输入');
          return;
        }
        if (!newPassword.trim()) {
          setEditError('请输入新密码');
          return;
        }
        if (newPassword.trim().length < 8) {
          setEditError('密码长度至少为8位');
          return;
        }
        if (!confirmPassword.trim()) {
          setEditError('请再次输入密码进行确认');
          return;
        }
        if (newPassword !== confirmPassword) {
          setEditError('两次输入的密码不一致，请重新输入');
          return;
        }
        try {
          const ret: any = await resetPassword(userInfo.email, pwdEmailCode.trim(), newPassword.trim());
          if (ret && ret.xtoken && ret.xuserid) {
            setAuthCookies({ xuserid: String(ret.xuserid), xtoken: String(ret.xtoken) });
          }
          onClose();
        } catch {
          // 错误已被拦截器提示
        }
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setEditLoading(false);
    }
  };

  const isSubmitDisabled = editLoading || (
    activeTab === 'username'
      ? !newUsername.trim()
      : activeTab === 'email'
        ? (!newEmail.trim() || !emailCode.trim() || Boolean(userInfo?.email && !userInfo.email.endsWith('@default.com')) || (bindPassword.trim().length > 0 && bindPassword.trim().length < 8))
        : (!userInfo?.email || userInfo.email.endsWith('@default.com') || !pwdEmailCode.trim() || !newPassword.trim() || !confirmPassword.trim() || newPassword !== confirmPassword || newPassword.length < 8)
  );

  const sendCodeDisabled = emailCodeSending || countdown > 0 || !newEmail.trim() || Boolean(userInfo?.email && !userInfo.email.endsWith('@default.com'));
  const sendPwdCodeDisabled = pwdCodeSending || pwdCountdown > 0 || !userInfo?.email || userInfo.email.endsWith('@default.com');

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center" size="lg">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Edit3 size={20} className="text-primary" />
            <span>修改资料</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => {
              setActiveTab(key as EditTabKey);
              setEditError('');
              setEmailCodeSent(false);
              setEmailCode('');
              setCountdown(0);
            }}
            className="w-full"
          >
            <Tab key="username" title={<div className="flex items-center space-x-2"><User size={16} /><span>用户名</span></div>}>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-default-700 mb-2">当前用户名</label>
                  <Input value={userInfo?.username || ''} isReadOnly variant="flat" className="bg-default-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-default-700 mb-2">
                    新用户名 <span className="text-danger">*</span>
                  </label>
                  <Input
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="请输入新用户名"
                    variant="bordered"
                    isInvalid={!!editError && !newUsername.trim()}
                  />
                </div>
              </div>
            </Tab>

            <Tab key="email" title={<div className="flex items-center space-x-2"><Mail size={16} /><span>邮箱</span></div>}>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-default-700 mb-2">当前邮箱</label>
                  <Input value={userInfo?.email || ''} isReadOnly variant="flat" className="bg-default-100" />
                  {userInfo?.email && !userInfo.email.endsWith('@default.com') && (
                    <p className="text-xs text-warning mt-1">非微信新用户，无法修改邮箱</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-default-700 mb-2">
                    新邮箱地址 <span className="text-danger">*</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="请输入新邮箱地址"
                      variant="bordered"
                      isInvalid={!!editError && !newEmail.trim()}
                      className="flex-1"
                      type="email"
                    />
                    <button
                      onClick={sendEmailCodeAction}
                      disabled={sendCodeDisabled}
                      style={{
                        backgroundColor: sendCodeDisabled ? '#d1d5db' : '#006FEE',
                        color: '#ffffff',
                        border: '1px solid #006FEE',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: sendCodeDisabled ? 'not-allowed' : 'pointer',
                        minWidth: '100px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        justifyContent: 'center',
                      }}
                    >
                      {emailCodeSending ? (
                        <Spinner size="sm" color="white" />
                      ) : (
                        <>
                          {!countdown && <Send size={14} />}
                          {countdown > 0 ? `${countdown}s` : '发送验证码'}
                        </>
                      )}
                    </button>
                  </div>
                  {emailCodeSent && (
                    <p className="text-xs text-success mt-1">✓ 验证码已发送至您的邮箱，请查收</p>
                  )}
                  <p className="text-xs text-default-400 mt-1">
                    验证码为纯数字。未收到验证码？请检查垃圾箱或确认邮箱地址是否正确
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-default-700 mb-2">
                    邮箱验证码 <span className="text-danger">*</span>
                  </label>
                  <Input
                    value={emailCode}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d+$/.test(value)) setEmailCode(value);
                    }}
                    placeholder="请输入数字验证码"
                    variant="bordered"
                    type={showEmailCode ? 'text' : 'password'}
                    isInvalid={!!editError && !emailCode.trim()}
                    endContent={
                      <button className="focus:outline-none" type="button" onClick={() => setShowEmailCode(!showEmailCode)}>
                        {showEmailCode ? <EyeOff size={16} className="text-default-400" /> : <Eye size={16} className="text-default-400" />}
                      </button>
                    }
                  />
                </div>
                {userInfo?.email && userInfo.email.endsWith('@default.com') && (
                  <div>
                    <label className="block text-sm font-medium text-default-700 mb-2">
                      设置登录密码（可选，至少8位）
                    </label>
                    <Input
                      value={bindPassword}
                      onChange={(e) => setBindPassword(e.target.value)}
                      placeholder="请输入新密码"
                      variant="bordered"
                      type={showBindPassword ? 'text' : 'password'}
                      endContent={
                        <button className="focus:outline-none" type="button" onClick={() => setShowBindPassword(!showBindPassword)}>
                          {showBindPassword ? <EyeOff size={16} className="text-default-400" /> : <Eye size={16} className="text-default-400" />}
                        </button>
                      }
                    />
                    <p className="text-xs text-default-400 mt-1">建议同时设置密码，便于邮箱+密码登录</p>
                  </div>
                )}
              </div>
            </Tab>

            <Tab key="password" title={<div className="flex items-center space-x-2"><Shield size={16} /><span>密码</span></div>}>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-default-700 mb-2">当前邮箱</label>
                  <Input value={userInfo?.email || ''} isReadOnly variant="flat" className="bg-default-100" />
                  {userInfo?.email && userInfo.email.endsWith('@default.com') && (
                    <p className="text-xs text-warning mt-1">请先在"邮箱"页绑定真实邮箱后再重置密码</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-default-700 mb-2">
                    邮箱验证码 <span className="text-danger">*</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={pwdEmailCode}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d+$/.test(value)) setPwdEmailCode(value);
                      }}
                      placeholder="请输入数字验证码"
                      variant="bordered"
                      type={showPwdEmailCode ? 'text' : 'password'}
                      isInvalid={!!editError && !pwdEmailCode.trim()}
                      className="flex-1"
                      endContent={
                        <button className="focus:outline-none" type="button" onClick={() => setShowPwdEmailCode(!showPwdEmailCode)}>
                          {showPwdEmailCode ? <EyeOff size={16} className="text-default-400" /> : <Eye size={16} className="text-default-400" />}
                        </button>
                      }
                    />
                    <button
                      onClick={sendPwdResetCode}
                      disabled={sendPwdCodeDisabled}
                      style={{
                        backgroundColor: sendPwdCodeDisabled ? '#d1d5db' : '#006FEE',
                        color: '#ffffff',
                        border: '1px solid #006FEE',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: sendPwdCodeDisabled ? 'not-allowed' : 'pointer',
                        minWidth: '100px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        justifyContent: 'center',
                      }}
                    >
                      {pwdCodeSending ? (
                        <Spinner size="sm" color="white" />
                      ) : (
                        <>
                          {!pwdCountdown && <Send size={14} />}
                          {pwdCountdown > 0 ? `${pwdCountdown}s` : '发送验证码'}
                        </>
                      )}
                    </button>
                  </div>
                  {pwdCodeSent && (
                    <p className="text-xs text-success mt-1">✓ 验证码已发送至您的邮箱，请查收</p>
                  )}
                  <p className="text-xs text-default-400 mt-1">
                    验证码为纯数字。未收到验证码？请检查垃圾箱或确认邮箱地址是否正确
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-default-700 mb-2">
                    新密码 <span className="text-danger">*</span>
                  </label>
                  <Input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="请输入新密码，至少8位"
                    variant="bordered"
                    type={showNewPassword ? 'text' : 'password'}
                    endContent={
                      <button className="focus:outline-none" type="button" onClick={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <EyeOff size={16} className="text-default-400" /> : <Eye size={16} className="text-default-400" />}
                      </button>
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-default-700 mb-2">
                    确认新密码 <span className="text-danger">*</span>
                  </label>
                  <Input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入新密码"
                    variant="bordered"
                    type={showConfirmPassword ? 'text' : 'password'}
                    endContent={
                      <button className="focus:outline-none" type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff size={16} className="text-default-400" /> : <Eye size={16} className="text-default-400" />}
                      </button>
                    }
                  />
                </div>
                <p className="text-xs text-default-400">密码重置将通过邮箱验证码完成，发送至当前绑定邮箱</p>
              </div>
            </Tab>
          </Tabs>

          {editError && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg mt-4">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-danger flex-shrink-0 mt-0.5" />
                <p className="text-sm text-danger">{editError}</p>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <button
            onClick={onClose}
            disabled={editLoading}
            style={{
              backgroundColor: '#ffffff',
              color: '#404040',
              border: '1px solid #d4d4d8',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: editLoading ? 'not-allowed' : 'pointer',
            }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            style={{
              backgroundColor: isSubmitDisabled ? '#d1d5db' : '#006FEE',
              color: '#ffffff',
              border: '1px solid #006FEE',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {editLoading ? '保存中...' : '保存修改'}
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
