/**
 * 使用教程Tab页面
 * 提供产品使用教程和帮助文档
 */
import React from 'react';
import { Card, CardBody, Button, Chip, Accordion, AccordionItem } from '@heroui/react';
import { motion } from 'framer-motion';
import { 
  Book, 
  Play, 
  FileText, 
  Video, 
  Download, 
  ExternalLink,
  HelpCircle,
  Lightbulb,
  Star
} from 'lucide-react';

export const TutorialTab: React.FC = () => {
  // 教程分类数据
  const tutorialCategories = [
    {
      title: '快速入门',
      description: '新用户必看的基础教程',
      icon: Lightbulb,
      color: 'success' as const,
      lessons: [
        { title: '账户注册与设置', duration: '5分钟', type: 'video' },
        { title: '选择合适的套餐', duration: '3分钟', type: 'article' },
        { title: '首次使用指南', duration: '8分钟', type: 'video' },
      ]
    },
    {
      title: '进阶功能',
      description: '深入了解高级功能的使用',
      icon: Star,
      color: 'primary' as const,
      lessons: [
        { title: 'API接口使用教程', duration: '15分钟', type: 'article' },
        { title: '批量操作指南', duration: '12分钟', type: 'video' },
        { title: '自定义配置说明', duration: '10分钟', type: 'article' },
      ]
    },
    {
      title: '常见问题',
      description: '解答用户最常遇到的问题',
      icon: HelpCircle,
      color: 'warning' as const,
      lessons: [
        { title: '账户安全问题', duration: '6分钟', type: 'article' },
        { title: '支付相关问题', duration: '4分钟', type: 'article' },
        { title: '技术支持联系方式', duration: '2分钟', type: 'article' },
      ]
    }
  ];

  // 获取内容类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video size={16} />;
      case 'article':
        return <FileText size={16} />;
      default:
        return <Book size={16} />;
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
          <Book size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-default-900">使用教程</h1>
          <p className="text-sm text-default-500 mt-1">学习如何更好地使用我们的产品和服务</p>
        </div>
      </div>

      {/* 推荐教程 */}
      <Card className="border-l-4 border-l-primary">
        <CardBody className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Play size={24} className="text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-default-900">新用户入门指南</h3>
                <Chip size="sm" color="primary" variant="flat">推荐</Chip>
              </div>
              <p className="text-default-600 mb-4">
                从零开始，全面了解产品功能和使用方法，快速上手我们的服务。
              </p>
              <div className="flex items-center gap-4 text-sm text-default-500 mb-4">
                <span className="flex items-center gap-1">
                  <Video size={16} />
                  视频教程
                </span>
                <span>•</span>
                <span>约 20 分钟</span>
                <span>•</span>
                <span>适合新用户</span>
              </div>
              <Button color="primary" startContent={<Play size={16} />}>
                开始学习
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 教程分类 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {tutorialCategories.map((category, index) => {
          const IconComponent = category.icon;
          return (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardBody className="p-6">
                  <div className="text-center mb-4">
                    <div className={`w-16 h-16 bg-${category.color}/10 rounded-lg flex items-center justify-center mx-auto mb-3`}>
                      <IconComponent size={24} className={`text-${category.color}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-default-900">{category.title}</h3>
                    <p className="text-sm text-default-500 mt-1">{category.description}</p>
                  </div>
                  
                  <div className="space-y-3">
                    {category.lessons.map((lesson, lessonIndex) => (
                      <div key={lessonIndex} className="flex items-center gap-3 p-3 bg-default-50 rounded-lg hover:bg-default-100 transition-colors cursor-pointer">
                        <div className="flex-shrink-0">
                          {getTypeIcon(lesson.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-default-900 truncate">
                            {lesson.title}
                          </p>
                          <p className="text-xs text-default-500">{lesson.duration}</p>
                        </div>
                        <ExternalLink size={14} className="text-default-400" />
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    fullWidth 
                    variant="bordered" 
                    className="mt-4"
                    startContent={<Book size={16} />}
                  >
                    查看全部
                  </Button>
                </CardBody>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* 常见问题FAQ */}
      <Card>
        <CardBody className="p-6">
          <h2 className="text-xl font-semibold text-default-900 mb-4">常见问题 FAQ</h2>
          <Accordion variant="splitted">
            <AccordionItem
              key="1"
              aria-label="如何修改密码"
              title="如何修改密码？"
              startContent={<HelpCircle size={16} className="text-primary" />}
            >
              <div className="text-sm text-default-600 space-y-2">
                <p>您可以通过以下步骤修改密码：</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>进入个人主页</li>
                  <li>点击"账户设置"</li>
                  <li>选择"安全设置"</li>
                  <li>点击"修改密码"并按提示操作</li>
                </ol>
              </div>
            </AccordionItem>
            
            <AccordionItem
              key="2"
              aria-label="如何升级套餐"
              title="如何升级套餐？"
              startContent={<HelpCircle size={16} className="text-primary" />}
            >
              <div className="text-sm text-default-600">
                <p>您可以在"订阅套餐"页面选择更高级的套餐，系统会自动计算升级费用差额。升级立即生效，原套餐剩余时间会按比例转换。</p>
              </div>
            </AccordionItem>
            
            <AccordionItem
              key="3"
              aria-label="支付失败怎么办"
              title="支付失败怎么办？"
              startContent={<HelpCircle size={16} className="text-primary" />}
            >
              <div className="text-sm text-default-600 space-y-2">
                <p>如遇支付失败，请检查：</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>银行卡余额是否充足</li>
                  <li>网络连接是否正常</li>
                  <li>支付密码是否正确</li>
                </ul>
                <p>如问题仍未解决，请联系客服。</p>
              </div>
            </AccordionItem>
          </Accordion>
        </CardBody>
      </Card>

      {/* 下载资源 */}
      <Card>
        <CardBody className="p-6">
          <h2 className="text-xl font-semibold text-default-900 mb-4">下载资源</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-4 p-4 bg-default-50 rounded-lg">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Download size={20} className="text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-default-900">用户手册 PDF</h4>
                <p className="text-sm text-default-500">完整的产品使用说明书</p>
              </div>
              <Button size="sm" variant="bordered">下载</Button>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-default-50 rounded-lg">
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <Download size={20} className="text-success" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-default-900">API 文档</h4>
                <p className="text-sm text-default-500">开发者接口使用指南</p>
              </div>
              <Button size="sm" variant="bordered">下载</Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 占位提示 */}
      <div className="text-center py-8 text-default-400">
        <Book size={48} className="mx-auto mb-4 opacity-50" />
        <p>更多教程内容正在制作中...</p>
      </div>
    </motion.div>
  );
};