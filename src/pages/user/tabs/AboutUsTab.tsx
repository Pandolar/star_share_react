import React, { useEffect, useState } from 'react';
import { Button, Card, CardBody, Spinner } from '@heroui/react';
import { Building2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserMarkdown } from '../../../components/UserMarkdown';
import { announcementApi } from '../../../services/userApi';

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
        </CardBody>
      </Card>
    </motion.div>
  );
};
