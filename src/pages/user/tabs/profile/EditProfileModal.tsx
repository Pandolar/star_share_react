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
  Checkbox,
  Button,
  Alert,
} from '@heroui/react';
import { Edit3, User, Mail, Shield, AlertCircle, Send, Eye, EyeOff, Wallet, ReceiptText } from 'lucide-react';
import { userInfoApi } from '../../../../services/userApi';
import { sendEmailCode as sendAuthEmailCode, resetPassword } from '../../../../services/authApi';
import { setAuthCookies } from '../../../../utils/cookies';
import type { UserInfo, EditTabKey } from './types';

interface EditProfileModalProps {
  isOpen: boolean;
  initialTab?: EditTabKey;
  showFinancialTabs: boolean;
  userInfo: UserInfo | null;
  onClose: () => void;
  onUserInfoChange: (next: Partial<UserInfo>) => void;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^1[3-9]\d{9}$/;

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
  initialTab = 'username' as EditTabKey,
  userInfo,
  showFinancialTabs,
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

  // 收款方式
  const [realName, setRealName] = useState('');
  const [paymentAccount, setPaymentAccount] = useState('');

  // 开票主体
  const [billingTitle, setBillingTitle] = useState('');
  const [billingTaxNumber, setBillingTaxNumber] = useState('');
  const [billingConfirmed, setBillingConfirmed] = useState(false);

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
    setRealName(userInfo?.preferences?.payment_info?.real_name || '');
    setPaymentAccount(userInfo?.preferences?.payment_info?.account || '');
    setBillingTitle(userInfo?.preferences?.billing_profile?.title || '');
    setBillingTaxNumber(userInfo?.preferences?.billing_profile?.tax_number || '');
    setBillingConfirmed(false);
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
      } else if (activeTab === 'payment_info') {
        if (!realName.trim()) {
          setEditError('请输入真实姓名');
          return;
        }
        if (!paymentAccount.trim()) {
          setEditError('请输入收款账号');
          return;
        }
        // 验证账号格式：必须是手机号或邮箱
        const isPhone = PHONE_REGEX.test(paymentAccount.trim());
        const isEmail = EMAIL_REGEX.test(paymentAccount.trim());
        if (!isPhone && !isEmail) {
          setEditError('收款账号格式不正确，请输入有效的手机号或邮箱');
          return;
        }
        const response = await userInfoApi.changeUserInfo({
          change_type: 'payment_info',
          payment_info: {
            real_name: realName.trim(),
            account: paymentAccount.trim(),
          },
        });
        if (response.code === 20000) {
          const updatedPreferences = {
            ...userInfo?.preferences,
            payment_info: {
              type: 'alipay',
              real_name: realName.trim(),
              account: paymentAccount.trim(),
            },
          };
          onUserInfoChange({ preferences: updatedPreferences });
          onClose();
        } else {
          setEditError(response.msg || '修改收款方式失败');
        }
      } else if (activeTab === 'billing_profile') {
        if (billingTitle.trim().length < 2) {
          setEditError('请输入完整的发票抬头');
          return;
        }
        const normalizedTaxNumber = billingTaxNumber.replace(/\s+/g, '').toUpperCase();
        if (!/^\d{15}$/.test(normalizedTaxNumber) && !/^[0-9A-HJ-NPQRTUWXY]{18}$/.test(normalizedTaxNumber)) {
          setEditError('请输入 15 位旧税号或 18 位统一社会信用代码');
          return;
        }
        if (!billingConfirmed) {
          setEditError('请确认主体信息准确无误');
          return;
        }
        const response = await userInfoApi.changeUserInfo({
          change_type: 'billing_profile',
          billing_profile: {
            title: billingTitle.trim(),
            tax_number: normalizedTaxNumber,
            confirmed: true,
          },
        });
        if (response.code === 20000) {
          onUserInfoChange({
            preferences: {
              ...userInfo?.preferences,
              billing_profile: { title: billingTitle.trim(), tax_number: normalizedTaxNumber },
            },
          });
          onClose();
        } else {
          setEditError(response.msg || '保存开票主体失败');
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
        ? !newEmail.trim()
        : activeTab === 'password'
          ? (!newPassword.trim() || !confirmPassword.trim())
          : activeTab === 'billing_profile'
            ? (!billingTitle.trim() || !billingTaxNumber.trim() || !billingConfirmed)
            : (!realName.trim() || !paymentAccount.trim())
  );

  const sendCodeDisabled = emailCodeSending || countdown > 0 || !newEmail.trim() || Boolean(userInfo?.email && !userInfo.email.endsWith('@default.com'));
  const sendPwdCodeDisabled = pwdCodeSending || pwdCountdown > 0 || !userInfo?.email || userInfo.email.endsWith('@default.com');

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center" size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Edit3 size={20} className="text-primary" />
            <span>修改资料</span>
          </div>
        </ModalHeader>
        <ModalBody className="overflow-x-hidden px-3 sm:px-6">
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => {
              setActiveTab(key as EditTabKey);
              setEditError('');
              setEmailCodeSent(false);
              setEmailCode('');
              setCountdown(0);
            }}
            classNames={{
              base: 'w-full',
              tabList: 'w-full flex-wrap gap-1 overflow-visible p-1',
              tab: 'h-9 min-w-fit flex-1 px-2 sm:px-3',
              panel: 'px-0',
            }}
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

            {showFinancialTabs && (
              <>
            <Tab key="payment_info" title={<div className="flex items-center space-x-2"><Wallet size={16} /><span>收款方式</span></div>}>
              <div className="space-y-4 mt-4">
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-sm text-primary">支付宝收款信息</p>
                  <p className="text-xs text-default-500 mt-1">用于邀请返利等收款场景</p>
                </div>
                {userInfo?.preferences?.payment_info && (
                  <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                    <p className="text-xs text-success">✓ 当前已设置收款方式</p>
                    <p className="text-xs text-default-500 mt-1">
                      真实姓名: {userInfo.preferences.payment_info.real_name}
                    </p>
                    <p className="text-xs text-default-500">
                      收款账号: {userInfo.preferences.payment_info.account}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-default-700 mb-2">
                    真实姓名 <span className="text-danger">*</span>
                  </label>
                  <Input
                    value={realName}
                    onChange={(e) => setRealName(e.target.value)}
                    placeholder="请输入支付宝实名姓名"
                    variant="bordered"
                    isInvalid={!!editError && !realName.trim()}
                  />
                  <p className="text-xs text-default-400 mt-1">请填写支付宝账号的实名姓名</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-default-700 mb-2">
                    收款账号 <span className="text-danger">*</span>
                  </label>
                  <Input
                    value={paymentAccount}
                    onChange={(e) => setPaymentAccount(e.target.value)}
                    placeholder="请输入支付宝手机号或邮箱"
                    variant="bordered"
                    isInvalid={!!editError && !paymentAccount.trim()}
                  />
                  <p className="text-xs text-default-400 mt-1">
                    仅支持手机号（11位）或邮箱格式
                  </p>
                </div>
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-xs text-warning">⚠️ 请确保填写的信息准确无误，以免影响收款，且支付宝必须打开手机或邮箱收款，务必确认！否则无法收到款项</p>
                </div>
              </div>
            </Tab>
            <Tab key="billing_profile" title={<div className="flex items-center gap-1.5"><ReceiptText size={16} /><span>开票主体</span></div>}>
              <div className="space-y-4 mt-4">
                {userInfo?.preferences?.billing_profile ? (
                  <Alert
                    color="warning"
                    variant="flat"
                    title="您正在修改已保存的开票主体"
                    description="新资料只用于之后创建的开票订单，历史订单仍保留提交时的抬头和税号。请再次核对后保存。"
                  />
                ) : (
                  <Alert color="primary" variant="flat" title="设置开票主体" description="提交订单时会保存当前资料快照，后续修改不会影响历史订单。" />
                )}
                <Input
                  label="发票抬头"
                  value={billingTitle}
                  onChange={(event) => setBillingTitle(event.target.value)}
                  placeholder="请输入公司或组织全称"
                  variant="bordered"
                  isRequired
                />
                <Input
                  label="税号"
                  value={billingTaxNumber}
                  onChange={(event) => setBillingTaxNumber(event.target.value.toUpperCase())}
                  placeholder="统一社会信用代码或旧税号"
                  variant="bordered"
                  isRequired
                />
                <Checkbox isSelected={billingConfirmed} onValueChange={setBillingConfirmed}>
                  我已核对并确认主体名称和税号准确无误
                </Checkbox>
              </div>
            </Tab>
              </>
            )}
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
          <Button variant="light" onPress={onClose} isDisabled={editLoading}>
            取消
          </Button>
          <Button color="primary" onPress={handleSubmit} isDisabled={isSubmitDisabled} isLoading={editLoading}>
            保存修改
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
