import React, { useEffect, useState } from 'react';
import { Card, CardBody, Avatar, Chip, Spinner, Button } from '@heroui/react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Shield, AlertCircle, Package, Crown, Edit3, MessageCircle, ArrowUpCircle, Gauge } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { userInfoApi } from '../../../services/userApi';
import { EditProfileModal } from './profile/EditProfileModal';
import { UsageSection } from './UsageTab';
import { useLimitUsage, summarizeQuotaRule } from '../../../hooks/useLimitUsage';
import { useWhiteLabel } from '../../../contexts/WhiteLabelContext';
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
  const { isWhiteLabel } = useWhiteLabel();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  // 额度详情：用于在套餐卡片展示当前套餐的配额规则，并共享给使用额度区块
  const { data: usageData, loading: usageLoading, error: usageError, refetch: refetchUsage } = useLimitUsage();
  const quotaRule = summarizeQuotaRule(usageData);

  const [editModal, setEditModal] = useState<{ open: boolean; tab: EditTabKey }>({ open: false, tab: 'username' });

  useEffect(() => {
    const openEdit = searchParams.get('openEdit');
    if (openEdit === 'email' || openEdit === 'username' || openEdit === 'password') {
      setEditModal({ open: true, tab: openEdit });
    }
  }, [searchParams]);

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
                <Button size="sm" color="primary" className="mt-3" onPress={fetchUserInfo}>
                  重试
                </Button>
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
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <Avatar
                  size="lg"
                  className="w-20 h-20 flex-shrink-0"
                  name={userInfo.username}
                  showFallback
                  fallback={<User size={32} />}
                />

                <div className="flex-1 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <h2 className="text-xl font-bold text-default-900">{userInfo.username}</h2>
                    <div className="flex items-center gap-2">{getStatusChip(userInfo.status)}</div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-default-600">
                      <Mail size={16} />
                      {userInfo.email && userInfo.email.endsWith('@default.com') ? (
                        <>
                          <span className="text-danger">未绑定邮箱</span>
                          <Button
                            size="sm"
                            color="danger"
                            variant="flat"
                            className="ml-2 h-6 min-w-0 px-2 text-xs"
                            onPress={() => openEditModal('email')}
                          >
                            立即绑定
                          </Button>
                        </>
                      ) : (
                        <span>{userInfo.email}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-default-600">
                      <Calendar size={16} />
                      <span>注册时间：{userInfo.created_at}</span>
                    </div>
                    {!isWhiteLabel && (
                      <div className="flex items-center gap-2 text-default-600">
                        <User size={16} />
                        <span>邀请人：{userInfo.inviter_user}</span>
                      </div>
                    )}
                    {userInfo.wechat_openid && (
                      <div className="flex items-center gap-2 text-default-600">
                        <MessageCircle size={16} />
                        <span>微信：<span className="text-success">已绑定微信</span></span>
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 - 移动端显示在信息下方 */}
                  <div className="flex items-center gap-2 pt-2 sm:hidden">
                    <Button size="sm" color="primary" startContent={<Edit3 size={14} />} onPress={() => openEditModal()}>
                      修改资料
                    </Button>
                    <Button size="sm" color="primary" variant="bordered" startContent={<Shield size={14} />} onPress={() => openEditModal('password')}>
                      修改密码
                    </Button>
                  </div>
                </div>

                {/* 操作按钮 - 桌面端显示在右侧 */}
                <div className="hidden sm:flex flex-col gap-2 flex-shrink-0">
                  <Button size="sm" color="primary" startContent={<Edit3 size={14} />} onPress={() => openEditModal()}>
                    修改资料
                  </Button>
                  <Button size="sm" color="primary" variant="bordered" startContent={<Shield size={14} />} onPress={() => openEditModal('password')}>
                    修改密码
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 当前套餐信息 */}
          {(() => {
            const hasPackage = userInfo.user_active_packages && userInfo.user_active_packages.package_id;
            const levelStyle = hasPackage
              ? getPackageLevelStyle(userInfo.user_active_packages!.level)
              : { icon: Package, color: 'default' as const, bgColor: 'bg-default/10' };

            return (
              <Card className={`border-l-4 ${hasPackage ? 'border-l-primary' : 'border-l-default-300'}`}>
                <CardBody className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${levelStyle.bgColor}`}>
                      {React.createElement(levelStyle.icon, {
                        size: 24,
                        className: `text-${levelStyle.color}`,
                      })}
                    </div>
                    <div className="flex-1">
                      {hasPackage ? (
                        <>
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-bold text-default-900">当前套餐</h3>
                            <Chip
                              size="sm"
                              color={userInfo.user_active_packages!.status === 'frozen' ? 'warning' : levelStyle.color}
                              variant="flat"
                            >
                              {userInfo.user_active_packages!.status_text || userInfo.user_active_packages!.level}
                            </Chip>
                          </div>
                          <p className="text-default-600 mb-4">{userInfo.user_active_packages!.package_name}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-default-600">
                              <Calendar size={16} />
                              <span>
                                {userInfo.user_active_packages!.status === 'frozen'
                                  ? `冻结剩余：${userInfo.user_active_packages!.remaining_text || '-'}`
                                  : `到期时间：${userInfo.user_active_packages!.expiry_date || '-'}`}
                              </span>
                            </div>
                            {quotaRule && (
                              <div className="flex items-center gap-2 text-default-600">
                                <Gauge size={16} />
                                <span>配额规则：{quotaRule}</span>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-default-900">当前套餐</h3>
                            <Chip size="sm" color="default" variant="flat">免费版</Chip>
                          </div>
                          <p className="text-default-500 mb-4">您当前为免费用户，升级套餐可享受更多功能</p>
                          {quotaRule && (
                            <div className="flex items-center gap-2 text-sm text-default-600 mb-4">
                              <Gauge size={16} />
                              <span>配额规则：{quotaRule}</span>
                            </div>
                          )}
                          <Button
                            size="sm"
                            color="primary"
                            startContent={<ArrowUpCircle size={14} />}
                            onPress={() => setSearchParams({ tab: 'subscription' })}
                          >
                            升级套餐
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })()}

          {/* 账户统计 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardBody className="p-4 text-center">
                <div className="text-2xl font-bold text-primary mb-1">
                  {userInfo.user_active_packages?.level || 'Free'}
                </div>
                <div className="text-sm text-default-500">会员等级</div>
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
                <div className="text-2xl font-bold text-default-900 mb-1">
                  {Math.floor((Date.now() - new Date(userInfo.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                </div>
                <div className="text-sm text-default-500">已注册天数</div>
              </CardBody>
            </Card>
          </div>

          {/* 使用额度 */}
          <UsageSection usage={usageData} loading={usageLoading} error={usageError} onRefresh={refetchUsage} />
        </>
      )}

      <EditProfileModal
        isOpen={editModal.open}
        initialTab={editModal.tab}
        userInfo={userInfo}
        onClose={closeEditModal}
        onUserInfoChange={(next) => setUserInfo((prev) => (prev ? { ...prev, ...next } : prev))}
      />
    </motion.div>
  );
};
