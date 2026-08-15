import React, { useEffect, useState } from 'react';
import { Button, Card, CardBody, Spinner } from '@heroui/react';
import { Building2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
            <div className="prose prose-slate max-w-none text-default-600 dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:bg-primary/5 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_code]:rounded [&_code]:bg-default-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:border-b [&_h1]:border-divider [&_h1]:pb-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:leading-7 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-divider [&_td]:p-2 [&_th]:border [&_th]:border-divider [&_th]:bg-default-50 [&_th]:p-2 [&_ul]:list-disc">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            <div className="py-12 text-center text-default-400">暂无关于我们内容</div>
          )}
        </CardBody>
      </Card>
    </motion.div>
  );
};
