import React, { useEffect, useState } from 'react';
import { Button, Card, CardBody, Spinner } from '@heroui/react';
import { Building2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserMarkdown } from '../../../components/UserMarkdown';
import { announcementApi } from '../../../services/userApi';

// 运营起点：2023-03-21 12:00:00（+08:00）
const SITE_ONLINE_AT = new Date('2023-03-21T12:00:00+08:00').getTime();

const formatUptime = (now: number): string => {
  let seconds = Math.max(0, Math.floor((now - SITE_ONLINE_AT) / 1000));
  const years = Math.floor(seconds / (365 * 86400));
  seconds -= years * 365 * 86400;
  const months = Math.floor(seconds / (30 * 86400));
  seconds -= months * 30 * 86400;
  const days = Math.floor(seconds / 86400);
  seconds -= days * 86400;
  const hours = Math.floor(seconds / 3600);
  seconds -= hours * 3600;
  const minutes = Math.floor(seconds / 60);
  seconds -= minutes * 60;
  const parts = [
    years ? `${years} 年 ` : '',
    months || years ? `${months} 个月 ` : '',
    days || months || years ? `${days} 天 ` : '',
  ];
  return `本站已运营：${parts.join('')}${hours} 小时 ${minutes} 分 ${seconds} 秒`;
};

const UptimeTicker: React.FC = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <p className="mt-6 border-t border-divider pt-4 text-center text-xs text-default-400">{formatUptime(now)}</p>;
};

export const AboutUsTab: React.FC = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await announcementApi.getPublicInfo();
      if (response.code !== 20000) throw new Error(response.msg || '获取关于我们内容失败');
      setContent(response.data.about_content || '');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <motion.div initial={false} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Building2 size={20} />
        </div>
        <h1 className="text-2xl font-bold text-default-900">关于我们</h1>
      </div>

      <Card>
        <CardBody className="p-6 sm:p-8">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-default-600">
              <Spinner size="lg" color="primary" />
              正在加载...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-sm text-danger">{error}</p>
              <Button size="sm" color="primary" variant="flat" startContent={<RefreshCw className="h-4 w-4" />} onPress={() => void load()}>
                重试
              </Button>
            </div>
          ) : content ? (
            <UserMarkdown>{content}</UserMarkdown>
          ) : (
            <div className="py-12 text-center text-default-400">暂无关于我们内容</div>
          )}
          <UptimeTicker />
        </CardBody>
      </Card>
    </motion.div>
  );
};
