import React, { useEffect, useState } from 'react';
import { Card, CardBody, Spinner } from '@heroui/react';
import { AlertCircle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserMarkdown } from '../../../components/UserMarkdown';
import { announcementApi } from '../../../services/userApi';

export const LimitedActivityTab: React.FC = () => {
  const [title, setTitle] = useState('限时活动');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await announcementApi.getPublicInfo();
      if (response.code !== 20000) throw new Error(response.msg || '获取活动信息失败');
      setTitle(response.data.limited_activity_title || '限时活动');
      setContent(response.data.limited_activity_content || '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '网络错误');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  return <motion.div initial={false} animate={{ opacity: 1 }} className="space-y-6">
    <div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10"><Sparkles size={20} className="text-warning" /></div><h1 className="text-2xl font-bold text-default-900">{title}</h1></div>
    <Card className="overflow-visible"><CardBody className="p-6">
      {loading ? <div className="flex items-center justify-center py-12"><Spinner size="lg" color="primary" /><span className="ml-3 text-default-600">加载中...</span></div>
        : error ? <div className="flex items-start gap-4 rounded-lg bg-danger/10 p-6"><AlertCircle size={20} className="mt-1 flex-shrink-0 text-danger" /><div><h3 className="mb-2 font-semibold text-danger">加载失败</h3><p className="text-sm text-default-600">{error}</p><button onClick={() => void load()} className="mt-3 text-sm text-primary underline hover:text-primary-600">重试</button></div></div>
          : content ? <UserMarkdown>{content}</UserMarkdown> : <div className="py-12 text-center text-default-400"><Sparkles size={48} className="mx-auto mb-4 opacity-50" /><p>暂无活动内容</p></div>}
    </CardBody></Card>
  </motion.div>;
};
