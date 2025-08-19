/**
 * 个人主页Tab页面
 * 显示用户个人信息和账户设置
 */
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardBody, Avatar, Chip, Spinner, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Tabs, Tab } from '@heroui/react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Shield, AlertCircle, Package, Crown, Edit3, Send, Eye, EyeOff, MessageCircle } from 'lucide-react';
import { userInfoApi } from '../../../services/userApi';
import { getWechatQRCode, checkWechatLoginStatus } from '../../../services/authApi';
import { getCookie } from '../../../utils/cookies';

interface UserInfo {
  username: string;
  email: string;
  user_active_packages: {
    package_id: string;
    package_name: string;
    level: string;
    priority: string;
    expiry_date: string;
  };
  status: number;
  inviter_user: string;
  created_at: string;
  wechat_openid?: string;
}

export const ProfileTab: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // 编辑弹窗状态
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'username' | 'email'>('username');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string>('');

  // 表单状态
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCodeSending, setEmailCodeSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showEmailCode, setShowEmailCode] = useState(false);

  // 微信绑定相关状态
  const [wechatQrUrl, setWechatQrUrl] = useState('');
  const [wechatTicket, setWechatTicket] = useState('');
  const [wechatQrStatus, setWechatQrStatus] = useState<'loading' | 'active' | 'expired' | 'scanned' | 'registered'>('loading');
  const [wechatBinding, setWechatBinding] = useState(false);
  const [showWechatQr, setShowWechatQr] = useState(false);

  // 轮询引用
  const wechatPollingRef = useRef<NodeJS.Timeout | null>(null);
  const wechatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 获取用户信息
  const fetchUserInfo = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await userInfoApi.getUserInfo();

      if (response.code === 20000) {
        setUserInfo(response.data);
      } else {
        setError(response.msg || '获取用户信息失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();

    // 清理定时器
    return () => {
      if (wechatPollingRef.current) {
        clearInterval(wechatPollingRef.current);
      }
      if (wechatTimeoutRef.current) {
        clearTimeout(wechatTimeoutRef.current);
      }
    };
  }, []);

  // 倒计时效果
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // 打开编辑弹窗
  const openEditModal = (type?: 'username' | 'email') => {
    if (type) {
      setActiveTab(type);
    }
    setEditError('');
    setEmailCodeSent(false);
    setEmailCode('');
    setCountdown(0);
    setNewUsername(userInfo?.username || '');
    setNewEmail(userInfo?.email || '');
    setIsEditModalOpen(true);
  };

  // 关闭编辑弹窗
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditError('');
    setNewUsername('');
    setNewEmail('');
    setEmailCode('');
    setEmailCodeSent(false);
    setCountdown(0);
  };

  // 发送邮箱验证码
  const sendEmailCode = async () => {
    if (!newEmail.trim()) {
      setEditError('请输入新邮箱地址');
      return;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEditError('请输入有效的邮箱地址');
      return;
    }

    setEmailCodeSending(true);
    setEditError('');

    try {
      const response = await userInfoApi.sendEmailCode(newEmail);
      if (response.code === 20000) {
        setEmailCodeSent(true);
        setCountdown(60);
        setEditError('');
      } else {
        setEditError(response.msg || '发送验证码失败');
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '发送验证码失败');
    } finally {
      setEmailCodeSending(false);
    }
  };

  // 获取微信二维码
  const fetchWechatQR = async () => {
    setWechatQrStatus('loading');

    // 清除之前的定时器
    if (wechatPollingRef.current) {
      clearInterval(wechatPollingRef.current);
      wechatPollingRef.current = null;
    }
    if (wechatTimeoutRef.current) {
      clearTimeout(wechatTimeoutRef.current);
      wechatTimeoutRef.current = null;
    }

    try {
      const data = await getWechatQRCode();
      setWechatQrUrl(data.qr_code_url);
      setWechatTicket(data.ticket);
      setWechatQrStatus('active');
      startWechatPolling(data.ticket);

      // 设置2分钟后自动过期
      wechatTimeoutRef.current = setTimeout(() => {
        setWechatQrStatus('expired');
        if (wechatPollingRef.current) {
          clearInterval(wechatPollingRef.current);
          wechatPollingRef.current = null;
        }
      }, 2 * 60 * 1000);
    } catch (error) {
      console.error('获取微信二维码失败:', error);
      setWechatQrStatus('expired');
      setEditError('获取微信二维码失败，请重试');
    }
  };

  // 开始轮询检查微信二维码状态
  const startWechatPolling = (ticket: string) => {
    if (wechatPollingRef.current) {
      clearInterval(wechatPollingRef.current);
    }

    wechatPollingRef.current = setInterval(async () => {
      if (wechatBinding) return;

      try {
        console.log('[微信绑定] 开始检查二维码状态，ticket:', ticket);
        const statusData = await checkWechatLoginStatus(ticket);
        console.log('[微信绑定] 收到状态数据:', statusData);

        if (statusData?.wechat_temp_token) {
          console.log('[微信绑定] 检测到新用户绑定，wechat_temp_token:', statusData.wechat_temp_token);
          setWechatQrStatus('scanned');

          // 清除轮询
          if (wechatPollingRef.current) {
            clearInterval(wechatPollingRef.current);
            wechatPollingRef.current = null;
          }
          if (wechatTimeoutRef.current) {
            clearTimeout(wechatTimeoutRef.current);
            wechatTimeoutRef.current = null;
          }

          // 进行微信绑定
          await handleWechatBind(statusData.wechat_temp_token);
        } else if (statusData?.xtoken && statusData?.xuserid && !statusData?.wechat_temp_token) {
          // 微信已注册，无法绑定
          console.log('[微信绑定] 检测到已注册微信，xtoken:', statusData.xtoken, 'xuserid:', statusData.xuserid);
          setWechatQrStatus('registered');
          setEditError('该微信已注册，无法绑定');

          // 清除轮询
          if (wechatPollingRef.current) {
            clearInterval(wechatPollingRef.current);
            wechatPollingRef.current = null;
          }
          if (wechatTimeoutRef.current) {
            clearTimeout(wechatTimeoutRef.current);
            wechatTimeoutRef.current = null;
          }
        } else if (statusData === null) {
          console.log('[微信绑定] 用户尚未扫码，继续轮询');
        } else {
          console.log('[微信绑定] 未知状态数据，继续轮询. statusData:', statusData);
        }
      } catch (error: any) {
        console.log('[微信绑定] 检查状态时发生错误:', error);
        if (error.message?.includes('二维码已过期')) {
          console.log('[微信绑定] 二维码已过期');
          setWechatQrStatus('expired');
          if (wechatPollingRef.current) {
            clearInterval(wechatPollingRef.current);
            wechatPollingRef.current = null;
          }
        }
      }
    }, 2000);
  };

  // 处理微信绑定
  const handleWechatBind = async (wechatTempToken: string) => {
    setWechatBinding(true);
    try {
      // 获取当前用户信息
      const xuserid = getCookie('xuserid');
      const xtoken = getCookie('xtoken');

      if (!xuserid || !xtoken) {
        throw new Error('用户信息获取失败');
      }

      const response = await userInfoApi.wechatBind({
        is_bind: true,
        wechat_temp_token: wechatTempToken,
        xuserid: parseInt(xuserid),
        xtoken: xtoken
      });

      if (response.code === 20000) {
        // 绑定成功，更新用户信息
        await fetchUserInfo();
        setShowWechatQr(false);
        setEditError('');
      } else {
        setEditError(response.msg || '微信绑定失败');
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '微信绑定失败');
    } finally {
      setWechatBinding(false);
    }
  };

  // 开始微信绑定流程
  const startWechatBind = () => {
    setShowWechatQr(true);
    setEditError('');
    fetchWechatQR();
  };

  // 提交修改
  const handleSubmitEdit = async () => {
    setEditLoading(true);
    setEditError('');

    try {
      if (activeTab === 'username') {
        // 修改用户名
        if (!newUsername.trim()) {
          setEditError('用户名不能为空');
          return;
        }

        const response = await userInfoApi.changeUserInfo({
          change_type: 'username',
          username: newUsername.trim()
        });

        if (response.code === 20000) {
          // 更新本地用户信息
          if (userInfo) {
            setUserInfo({ ...userInfo, username: newUsername.trim() });
          }
          closeEditModal();
        } else {
          setEditError(response.msg || '修改用户名失败');
        }
      } else {
        // 修改邮箱
        if (!userInfo?.email.endsWith('@default.com')) {
          setEditError('当前邮箱不是@default.com结尾，无法修改');
          return;
        }

        if (!newEmail.trim()) {
          setEditError('新邮箱不能为空');
          return;
        }

        if (!emailCode.trim()) {
          setEditError('请输入验证码');
          return;
        }

        const response = await userInfoApi.changeUserInfo({
          change_type: 'email',
          email: newEmail.trim(),
          email_code: emailCode.trim()
        });

        if (response.code === 20000) {
          // 更新本地用户信息
          if (userInfo) {
            setUserInfo({ ...userInfo, email: newEmail.trim() });
          }
          closeEditModal();
        } else {
          setEditError(response.msg || '修改邮箱失败');
        }
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setEditLoading(false);
    }
  };

  // 获取状态样式
  const getStatusChip = (status: number) => {
    return status === 1 ? (
      <Chip size="sm" color="success" variant="flat">活跃</Chip>
    ) : (
      <Chip size="sm" color="danger" variant="flat">停用</Chip>
    );
  };

  // 获取套餐等级图标和颜色
  const getPackageLevelStyle = (level?: string) => {
    if (!level) {
      return { icon: Package, color: 'default' as const, bgColor: 'bg-default/10' };
    }
    switch (level.toLowerCase()) {
      case 'base':
        return { icon: Package, color: 'default' as const, bgColor: 'bg-default/10' };
      case 'plus':
        return { icon: Shield, color: 'primary' as const, bgColor: 'bg-primary/10' };
      case 'pro':
      case 'premium':
        return { icon: Crown, color: 'warning' as const, bgColor: 'bg-warning/10' };
      default:
        return { icon: Package, color: 'default' as const, bgColor: 'bg-default/10' };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <User size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-default-900">个人主页</h1>
          <p className="text-sm text-default-500 mt-1">查看您的个人信息和账户状态</p>
        </div>
      </div>

      {/* 加载状态 */}
      {loading && (
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" color="primary" />
              <span className="ml-3 text-default-600">加载中...</span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 错误状态 */}
      {error && (
        <Card>
          <CardBody className="p-6">
            <div className="flex items-start gap-4 p-6 bg-danger/10 rounded-lg">
              <AlertCircle size={20} className="text-danger flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-danger mb-2">加载失败</h3>
                <p className="text-default-600 text-sm">{error}</p>
                <button
                  onClick={fetchUserInfo}
                  style={{
                    backgroundColor: '#006FEE',
                    color: '#ffffff',
                    border: '1px solid #006FEE',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    marginTop: '12px'
                  }}
                >
                  重试
                </button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 用户信息展示 */}
      {userInfo && (
        <>
          {/* 用户基本信息卡片 */}
          <Card className="overflow-visible">
            <CardBody className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* 用户头像 */}
                <div className="relative flex flex-col items-center gap-3">
                  <Avatar
                    size="lg"
                    className="w-20 h-20"
                    name={userInfo.username}
                    showFallback
                    fallback={<User size={32} />}
                  />
                  <button
                    onClick={() => openEditModal()}
                    style={{
                      backgroundColor: '#006FEE',
                      color: '#ffffff',
                      border: '1px solid #006FEE',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      minHeight: '24px'
                    }}
                  >
                    <Edit3 size={12} />
                    修改资料
                  </button>
                </div>

                {/* 用户基本信息 */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <h2 className="text-xl font-bold text-default-900">{userInfo.username}</h2>
                    <div className="flex items-center gap-2">
                      {getStatusChip(userInfo.status)}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-default-600">
                      <Mail size={16} />
                      <span>{userInfo.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-default-600">
                      <Calendar size={16} />
                      <span>注册时间：{userInfo.created_at}</span>
                    </div>
                    <div className="flex items-center gap-2 text-default-600">
                      <User size={16} />
                      <span>邀请人：{userInfo.inviter_user}</span>
                    </div>
                    <div className="flex items-center gap-2 text-default-600">
                      <MessageCircle size={16} />
                      <span>
                        微信：
                        {userInfo.wechat_openid ? (
                          <span className="text-success">已绑定微信</span>
                        ) : (
                          <>
                            <span className="text-warning">未绑定微信</span>
                            <button
                              onClick={startWechatBind}
                              style={{
                                backgroundColor: '#09C46A',
                                color: '#ffffff',
                                border: '1px solid #09C46A',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '10px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                marginLeft: '8px'
                              }}
                            >
                              绑定
                            </button>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 当前套餐信息 */}
          {userInfo.user_active_packages && (
            <Card className="border-l-4 border-l-primary">
              <CardBody className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getPackageLevelStyle(userInfo.user_active_packages.level).bgColor}`}>
                    {React.createElement(getPackageLevelStyle(userInfo.user_active_packages.level).icon, {
                      size: 24,
                      className: `text-${getPackageLevelStyle(userInfo.user_active_packages.level).color}`
                    })}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-bold text-default-900">当前套餐</h3>
                      <Chip
                        size="sm"
                        color={getPackageLevelStyle(userInfo.user_active_packages.level).color}
                        variant="flat"
                      >
                        {userInfo.user_active_packages.level}
                      </Chip>
                    </div>
                    <p className="text-default-600 mb-4">
                      {userInfo.user_active_packages.package_name}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-default-600">
                        <Calendar size={16} />
                        <span>到期时间：{userInfo.user_active_packages.expiry_date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-default-600">
                        <Shield size={16} />
                        <span>优先级：{userInfo.user_active_packages.priority}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* 账户统计 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardBody className="p-4 text-center">
                <div className="text-2xl font-bold text-primary mb-1">
                  {userInfo.user_active_packages &&
                    Object.keys(userInfo.user_active_packages).length > 0 &&
                    userInfo.user_active_packages.package_id ? '1' : '0'}
                </div>
                <div className="text-sm text-default-500">活跃套餐</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4 text-center">
                <div className="text-2xl font-bold text-success mb-1">
                  {userInfo.status === 1 ? '正常' : '停用'}
                </div>
                <div className="text-sm text-default-500">账户状态</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4 text-center">
                <div className="text-2xl font-bold text-warning mb-1">
                  {userInfo.user_active_packages?.level || 'Free'}
                </div>
                <div className="text-sm text-default-500">会员等级</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4 text-center">
                <div className="text-2xl font-bold text-default-900 mb-1">
                  {new Date(userInfo.created_at).getFullYear()}
                </div>
                <div className="text-sm text-default-500">注册年份</div>
              </CardBody>
            </Card>
          </div>
        </>
      )}

      {/* 编辑资料弹窗 */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        placement="center"
        size="lg"
      >
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
                setActiveTab(key as 'username' | 'email');
                setEditError('');
                setEmailCodeSent(false);
                setEmailCode('');
                setCountdown(0);
              }}
              className="w-full"
            >
              <Tab
                key="username"
                title={
                  <div className="flex items-center space-x-2">
                    <User size={16} />
                    <span>用户名</span>
                  </div>
                }
              >
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-default-700 mb-2">
                      当前用户名
                    </label>
                    <Input
                      value={userInfo?.username || ''}
                      isReadOnly
                      variant="flat"
                      className="bg-default-100"
                    />
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

              <Tab
                key="email"
                title={
                  <div className="flex items-center space-x-2">
                    <Mail size={16} />
                    <span>邮箱</span>
                  </div>
                }
              >
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-default-700 mb-2">
                      当前邮箱
                    </label>
                    <Input
                      value={userInfo?.email || ''}
                      isReadOnly
                      variant="flat"
                      className="bg-default-100"
                    />
                    {userInfo?.email && !userInfo.email.endsWith('@default.com') && (
                      <p className="text-xs text-warning mt-1">
                        非微信新用户，无法修改邮箱
                      </p>
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
                      />
                      <button
                        onClick={sendEmailCode}
                        disabled={emailCodeSending || countdown > 0 || !newEmail.trim() || Boolean(userInfo?.email && !userInfo.email.endsWith('@default.com'))}
                        style={{
                          backgroundColor: emailCodeSending || countdown > 0 || !newEmail.trim() || Boolean(userInfo?.email && !userInfo.email.endsWith('@default.com')) ? '#d1d5db' : '#006FEE',
                          color: '#ffffff',
                          border: '1px solid #006FEE',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: emailCodeSending || countdown > 0 || !newEmail.trim() || Boolean(userInfo?.email && !userInfo.email.endsWith('@default.com')) ? 'not-allowed' : 'pointer',
                          minWidth: '80px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          justifyContent: 'center'
                        }}
                      >
                        {!emailCodeSending && <Send size={14} />}
                        {countdown > 0 ? `${countdown}s` : '发送验证码'}
                      </button>
                    </div>
                  </div>
                  {emailCodeSent && (
                    <div>
                      <label className="block text-sm font-medium text-default-700 mb-2">
                        邮箱验证码 <span className="text-danger">*</span>
                      </label>
                      <Input
                        value={emailCode}
                        onChange={(e) => setEmailCode(e.target.value)}
                        placeholder="请输入6位验证码"
                        variant="bordered"
                        type={showEmailCode ? "text" : "password"}
                        isInvalid={!!editError && !emailCode.trim()}
                        endContent={
                          <button
                            className="focus:outline-none"
                            type="button"
                            onClick={() => setShowEmailCode(!showEmailCode)}
                          >
                            {showEmailCode ? (
                              <EyeOff size={16} className="text-default-400" />
                            ) : (
                              <Eye size={16} className="text-default-400" />
                            )}
                          </button>
                        }
                        maxLength={6}
                      />
                      <p className="text-xs text-success mt-1">
                        ✓ 验证码已发送至新邮箱，请查收
                      </p>
                    </div>
                  )}
                </div>
              </Tab>
            </Tabs>

            {/* 错误提示 */}
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
              onClick={closeEditModal}
              disabled={editLoading}
              style={{
                backgroundColor: '#ffffff',
                color: '#404040',
                border: '1px solid #d4d4d8',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: editLoading ? 'not-allowed' : 'pointer'
              }}
            >
              取消
            </button>
            <button
              onClick={handleSubmitEdit}
              disabled={editLoading || (
                activeTab === 'username'
                  ? !newUsername.trim()
                  : (!newEmail.trim() || !emailCode.trim() || Boolean(userInfo?.email && !userInfo.email.endsWith('@default.com')))
              )}
              style={{
                backgroundColor: editLoading || (
                  activeTab === 'username'
                    ? !newUsername.trim()
                    : (!newEmail.trim() || !emailCode.trim() || Boolean(userInfo?.email && !userInfo.email.endsWith('@default.com')))
                ) ? '#d1d5db' : '#006FEE',
                color: '#ffffff',
                border: '1px solid #006FEE',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: editLoading || (
                  activeTab === 'username'
                    ? !newUsername.trim()
                    : (!newEmail.trim() || !emailCode.trim() || Boolean(userInfo?.email && !userInfo.email.endsWith('@default.com')))
                ) ? 'not-allowed' : 'pointer'
              }}
            >
              {editLoading ? '保存中...' : '保存修改'}
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 微信绑定二维码弹窗 */}
      <Modal
        isOpen={showWechatQr}
        onClose={() => {
          setShowWechatQr(false);
          if (wechatPollingRef.current) {
            clearInterval(wechatPollingRef.current);
            wechatPollingRef.current = null;
          }
          if (wechatTimeoutRef.current) {
            clearTimeout(wechatTimeoutRef.current);
            wechatTimeoutRef.current = null;
          }
        }}
        placement="center"
        size="md"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <MessageCircle size={20} className="text-success" />
              <span>微信绑定</span>
            </div>
          </ModalHeader>
          <ModalBody className="text-center">
            <div className="space-y-4">
              <p className="text-sm text-default-600">
                使用微信扫描下方二维码完成绑定
              </p>

              <div className="flex justify-center">
                {wechatQrStatus === 'loading' ? (
                  <div className="w-48 h-48 flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center">
                      <Spinner size="lg" />
                      <p className="text-sm text-gray-500 mt-2">生成二维码中...</p>
                    </div>
                  </div>
                ) : wechatQrStatus === 'active' ? (
                  <div className="relative">
                    <img
                      src={wechatQrUrl}
                      alt="微信绑定二维码"
                      className="w-48 h-48 border rounded-lg"
                    />
                    {wechatBinding && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                        <div className="text-center text-white">
                          <Spinner size="lg" color="white" />
                          <p className="text-sm mt-2">绑定中...</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : wechatQrStatus === 'scanned' ? (
                  <div className="w-48 h-48 flex items-center justify-center bg-green-50 border-2 border-green-300 rounded-lg">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                      <p className="text-sm text-green-600">扫码成功</p>
                      <p className="text-xs text-green-500">正在绑定中...</p>
                    </div>
                  </div>
                ) : wechatQrStatus === 'registered' ? (
                  <div className="w-48 h-48 flex items-center justify-center bg-warning-50 border-2 border-warning-300 rounded-lg">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-warning-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                      </div>
                      <p className="text-sm text-warning-600 mb-2">该微信已注册</p>
                      <p className="text-xs text-warning-500 mb-3">此微信号已绑定其他账户，无法重复绑定</p>
                      <button
                        onClick={fetchWechatQR}
                        style={{
                          backgroundColor: '#006FEE',
                          color: '#ffffff',
                          border: '1px solid #006FEE',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        重新获取二维码
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">二维码已过期</p>
                      <button
                        onClick={fetchWechatQR}
                        style={{
                          backgroundColor: '#006FEE',
                          color: '#ffffff',
                          border: '1px solid #006FEE',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        刷新二维码
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center space-y-2">
                <p className="text-xs text-gray-400">
                  使用手机微信扫描二维码
                </p>
                <p className="text-xs text-gray-400">
                  扫码后即可完成绑定
                </p>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => {
                setShowWechatQr(false);
                if (wechatPollingRef.current) {
                  clearInterval(wechatPollingRef.current);
                  wechatPollingRef.current = null;
                }
                if (wechatTimeoutRef.current) {
                  clearTimeout(wechatTimeoutRef.current);
                  wechatTimeoutRef.current = null;
                }
              }}
              style={{
                backgroundColor: '#ffffff',
                color: '#404040',
                border: '1px solid #d4d4d8',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              取消
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </motion.div>
  );
};