/**
 * 公告通知Tab页面
 * 显示系统公告和用户通知信息
 */
import React, { useState, useEffect } from 'react';
import { Card, CardBody, Spinner } from '@heroui/react';
import { motion } from 'framer-motion';
import { Bell, AlertCircle } from 'lucide-react';
import { UserMarkdown } from '../../../components/UserMarkdown';
import { announcementApi } from '../../../services/userApi';

export const AnnouncementTab: React.FC = () => {
  const [notice, setNotice] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // 获取公告信息
  const fetchNotice = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await announcementApi.getPublicInfo();

      if (response.code === 20000) {
        setNotice(response.data.notice || '');
      } else {
        setError(response.msg || '获取公告信息失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotice();
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <Bell size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-default-900">公告通知</h1>
        </div>
      </div>

      {/* 公告内容 */}
      <Card className="overflow-visible">
        <CardBody className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" color="primary" />
              <span className="ml-3 text-default-600">加载中...</span>
            </div>
          ) : error ? (
            <div className="flex items-start gap-4 p-6 bg-danger/10 rounded-lg">
              <AlertCircle size={20} className="text-danger flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-danger mb-2">加载失败</h3>
                <p className="text-default-600 text-sm">{error}</p>
                <button
                  onClick={fetchNotice}
                  className="mt-3 text-sm text-primary hover:text-primary-600 underline"
                >
                  重试
                </button>
              </div>
            </div>
          ) : notice ? (
            <UserMarkdown>{notice}</UserMarkdown>
          ) : (
            <div className="text-center py-12 text-default-400">
              <Bell size={48} className="mx-auto mb-4 opacity-50" />
              <p>暂无公告通知</p>
            </div>
          )}
        </CardBody>
      </Card>
    </motion.div >
  );
};