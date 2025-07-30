/**
 * 个人主页Tab页面
 * 显示用户个人信息和账户设置
 */
import React, { useState, useEffect } from 'react';
import { Card, CardBody, Avatar, Chip, Spinner } from '@heroui/react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Shield, AlertCircle, Package, Crown } from 'lucide-react';
import { userInfoApi } from '../../../services/userApi';

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
}

export const ProfileTab: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

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
  }, []);

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
                  className="mt-3 text-sm text-primary hover:text-primary-600 underline"
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
                <div className="relative">
                  <Avatar
                    size="lg"
                    className="w-20 h-20"
                    name={userInfo.username}
                    showFallback
                    fallback={<User size={32} />}
                  />
                </div>

                {/* 用户基本信息 */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <h2 className="text-xl font-bold text-default-900">{userInfo.username}</h2>
                    <div className="flex gap-2">
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
                  {userInfo.user_active_packages?.level || 'N/A'}
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
    </motion.div>
  );
};