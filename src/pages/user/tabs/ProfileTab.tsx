/**
 * 个人主页Tab页面
 * 显示用户个人信息和账户设置
 */
import React, { useEffect, useState } from 'react';
import { Card, CardBody, Avatar, Chip, Spinner } from '@heroui/react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Shield, AlertCircle, Package, Crown, Edit3, MessageCircle } from 'lucide-react';
import { userInfoApi } from '../../../services/userApi';
import { EditProfileModal } from './profile/EditProfileModal';
import { WechatBindModal } from './profile/WechatBindModal';
import type { UserInfo, EditTabKey } from './profile/types';

const getStatusChip = (status: number) =>
  status === 1
    ? <Chip size="sm" color="success" variant="flat">活跃</Chip>
    : <Chip size="sm" color="danger" variant="flat">停用</Chip>;

const getPackageLevelStyle = (level?: string) => {
  if (!level) return { icon: Package, color: 'default' as const, bgColor: 'bg-default/10' };
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

export const ProfileTab: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editModal, setEditModal] = useState<{ open: boolean; tab: EditTabKey }>({ open: false, tab: 'username' });
  const [wechatModalOpen, setWechatModalOpen] = useState(false);

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
  }, []);

  const openEditModal = (tab: EditTabKey = 'username') => setEditModal({ open: true, tab });
  const closeEditModal = () => setEditModal((s) => ({ ...s, open: false }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
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
                    marginTop: '12px',
                  }}
                >
                  重试
                </button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {userInfo && (
        <>
          {/* 用户基本信息卡片 */}
          <Card className="overflow-visible">
            <CardBody className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
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
                      minHeight: '24px',
                    }}
                  >
                    <Edit3 size={12} />
                    修改资料
                  </button>
                  <button
                    onClick={() => openEditModal('password')}
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#006FEE',
                      border: '1px solid #006FEE',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      minHeight: '24px',
                      marginTop: '6px',
                    }}
                  >
                    <Shield size={12} />
                    修改密码
                  </button>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <h2 className="text-xl font-bold text-default-900">{userInfo.username}</h2>
                    <div className="flex items-center gap-2">{getStatusChip(userInfo.status)}</div>
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
                              onClick={() => setWechatModalOpen(true)}
                              style={{
                                backgroundColor: '#09C46A',
                                color: '#ffffff',
                                border: '1px solid #09C46A',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '10px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                marginLeft: '8px',
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
          {userInfo.user_active_packages && userInfo.user_active_packages.package_id && (
            <Card className="border-l-4 border-l-primary">
              <CardBody className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getPackageLevelStyle(userInfo.user_active_packages.level).bgColor}`}>
                    {React.createElement(getPackageLevelStyle(userInfo.user_active_packages.level).icon, {
                      size: 24,
                      className: `text-${getPackageLevelStyle(userInfo.user_active_packages.level).color}`,
                    })}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-bold text-default-900">当前套餐</h3>
                      <Chip
                        size="sm"
                        color={userInfo.user_active_packages.status === 'frozen' ? 'warning' : getPackageLevelStyle(userInfo.user_active_packages.level).color}
                        variant="flat"
                      >
                        {userInfo.user_active_packages.status_text || userInfo.user_active_packages.level}
                      </Chip>
                    </div>
                    <p className="text-default-600 mb-4">{userInfo.user_active_packages.package_name}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-default-600">
                        <Calendar size={16} />
                        <span>
                          {userInfo.user_active_packages.status === 'frozen'
                            ? `冻结剩余：${userInfo.user_active_packages.remaining_text || '-'}`
                            : `到期时间：${userInfo.user_active_packages.expiry_date || '-'}`}
                        </span>
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
                  userInfo.user_active_packages.package_id
                    ? '1'
                    : '0'}
                </div>
                <div className="text-sm text-default-500">当前套餐</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4 text-center">
                <div className="text-2xl font-bold text-success mb-1">{userInfo.status === 1 ? '正常' : '停用'}</div>
                <div className="text-sm text-default-500">账户状态</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4 text-center">
                <div className="text-2xl font-bold text-warning mb-1">{userInfo.user_active_packages?.level || 'Free'}</div>
                <div className="text-sm text-default-500">会员等级</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4 text-center">
                <div className="text-2xl font-bold text-default-900 mb-1">{new Date(userInfo.created_at).getFullYear()}</div>
                <div className="text-sm text-default-500">注册年份</div>
              </CardBody>
            </Card>
          </div>
        </>
      )}

      <EditProfileModal
        isOpen={editModal.open}
        initialTab={editModal.tab}
        userInfo={userInfo}
        onClose={closeEditModal}
        onUserInfoChange={(next) => setUserInfo((prev) => (prev ? { ...prev, ...next } : prev))}
      />

      <WechatBindModal
        isOpen={wechatModalOpen}
        onClose={() => setWechatModalOpen(false)}
        onBindSuccess={fetchUserInfo}
      />
    </motion.div>
  );
};
