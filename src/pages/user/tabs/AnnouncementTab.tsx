/**
 * 公告通知Tab页面
 * 显示系统公告和用户通知信息
 */
import React, { useState, useEffect } from 'react';
import { Card, CardBody, Spinner } from '@heroui/react';
import { motion } from 'framer-motion';
import { Bell, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
      initial={{ opacity: 0 }}
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
          <p className="text-sm text-default-500 mt-1">查看最新的系统公告和重要通知</p>
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
            <div className="prose prose-slate max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // 自定义组件样式
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold text-default-900 mb-4 pb-2 border-b border-default-200">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold text-default-800 mb-3 mt-6">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-medium text-default-700 mb-2 mt-5">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-default-600 leading-relaxed mb-4">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside text-default-600 space-y-1 mb-4">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside text-default-600 space-y-1 mb-4">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="pl-2">{children}</li>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary/30 pl-4 py-2 my-4 bg-primary/5 rounded-r-lg">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children, ...props }) => (
                    (props as any).inline ? (
                      <code className="bg-default-100 text-primary px-1.5 py-0.5 rounded text-sm">
                        {children}
                      </code>
                    ) : (
                      <code className="block bg-default-100 p-4 rounded-lg text-sm overflow-x-auto">
                        {children}
                      </code>
                    )
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-default-900">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-default-700">{children}</em>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-600 underline"
                    >
                      {children}
                    </a>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full border border-default-200 rounded-lg">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-default-50">{children}</thead>
                  ),
                  tbody: ({ children }) => (
                    <tbody className="divide-y divide-default-200">{children}</tbody>
                  ),
                  tr: ({ children }) => (
                    <tr className="hover:bg-default-50">{children}</tr>
                  ),
                  th: ({ children }) => (
                    <th className="px-4 py-2 text-left text-sm font-medium text-default-700 border-r border-default-200 last:border-r-0">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-2 text-sm text-default-600 border-r border-default-200 last:border-r-0">
                      {children}
                    </td>
                  ),
                }}
              >
                {notice}
              </ReactMarkdown>
            </div>
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