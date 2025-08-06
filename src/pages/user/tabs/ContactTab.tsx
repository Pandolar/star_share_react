/**
 * 联系我们Tab页面
 * 提供客服联系方式和意见反馈渠道
 */
import React from 'react';
import { Card, CardBody, Button } from '@heroui/react';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Mail, 
  Clock, 
  MessageSquare,
  Headphones,
  Globe,
  Group
} from 'lucide-react';

export const ContactTab: React.FC = () => {
  // 联系方式数据
  const contactMethods = [
    {
      icon: MessageSquare,
      title: '在线客服',
      description: '7×24小时在线支持',
      action: '立即咨询',
      color: 'primary' as const,
      available: true
    },
    {
      icon: Mail,
      title: '邮件支持',
      description: 'support@starshare.com',
      action: '发送邮件',
      color: 'success' as const,
      available: true
    },
    {
      icon: Group,
      title: 'QQ群组讨论',
      description: '1000000000',
      action: '加入QQ群',
      color: 'warning' as const,
      available: true
    },
    {
      icon: Headphones,
      title: '技术支持',
      description: '专业技术团队',
      action: '提交工单',
      color: 'secondary' as const,
      available: true
    }
  ];

  // 工单类型选项
  const ticketTypes = [
    { key: 'technical', label: '技术问题' },
    { key: 'billing', label: '账单问题' },
    { key: 'feature', label: '功能建议' },
    { key: 'bug', label: '错误报告' },
    { key: 'other', label: '其他问题' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <MessageCircle size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-default-900">联系我们</h1>
          <p className="text-sm text-default-500 mt-1">我们随时为您提供帮助和支持</p>
        </div>
      </div>

      {/* 联系方式 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {contactMethods.map((method, index) => {
          const IconComponent = method.icon;
          return (
            <motion.div
              key={method.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardBody className="p-6 text-center">
                  <div className={`w-16 h-16 bg-${method.color}/10 rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <IconComponent size={24} className={`text-${method.color}`} />
                  </div>
                  <h3 className="font-semibold text-default-900 mb-2">{method.title}</h3>
                  <p className="text-sm text-default-500 mb-4">{method.description}</p>
                  <Button 
                    size="sm" 
                    color={method.color}
                    variant="bordered"
                    fullWidth
                    disabled={!method.available}
                  >
                    {method.action}
                  </Button>
                </CardBody>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* 服务时间和地址信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 服务时间 */}
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock size={20} className="text-primary" />
              <h2 className="text-lg font-semibold text-default-900">服务时间</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-default-600">在线客服</span>
                <span className="font-medium text-default-900">7×24小时</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-default-600">QQ群组讨论</span>
                <span className="font-medium text-default-900">1000000000</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-default-600">邮件回复</span>
                <span className="font-medium text-default-900">工作日24h内</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-default-600">技术支持</span>
                <span className="font-medium text-default-900">9:00 - 20:00</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 联系地址
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <MapPin size={20} className="text-primary" />
              <h2 className="text-lg font-semibold text-default-900">联系地址</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-default-600 mb-1">公司地址</p>
                <p className="font-medium text-default-900">
                  北京市朝阳区科技园区创新大厦1001室
                </p>
              </div>
              <div>
                <p className="text-default-600 mb-1">邮政编码</p>
                <p className="font-medium text-default-900">100000</p>
              </div>
              <div>
                <p className="text-default-600 mb-1">官方网站</p>
                <p className="font-medium text-primary cursor-pointer hover:underline">
                  www.starshare.com
                </p>
              </div>
            </div>
          </CardBody>
        </Card> */}
      </div>

      {/* 意见反馈表单 */}
      {/* <Card>
        <CardBody className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Send size={20} className="text-primary" />
            <h2 className="text-lg font-semibold text-default-900">意见反馈</h2>
          </div>
          
          <form className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="您的姓名"
                placeholder="请输入您的姓名"
                variant="bordered"
                isRequired
              />
              <Input
                label="联系邮箱"
                placeholder="请输入您的邮箱"
                type="email"
                variant="bordered"
                isRequired
              />
            </div>
            
            <Select
              label="问题类型"
              placeholder="请选择问题类型"
              variant="bordered"
              isRequired
            >
              {ticketTypes.map((type) => (
                <SelectItem key={type.key}>
                  {type.label}
                </SelectItem>
              ))}
            </Select>
            
            <Input
              label="问题标题"
              placeholder="请简要描述您的问题"
              variant="bordered"
              isRequired
            />
            
            <Textarea
              label="详细描述"
              placeholder="请详细描述您遇到的问题或建议..."
              variant="bordered"
              minRows={4}
              isRequired
            />
            
            <div className="flex justify-end gap-2">
              <Button variant="bordered">
                重置
              </Button>
              <Button color="primary" startContent={<Send size={16} />}>
                提交反馈
              </Button>
            </div>
          </form>
        </CardBody>
      </Card> */}

      {/* 社交媒体和其他联系方式 */}
      <Card>
        <CardBody className="p-6">
          <h2 className="text-lg font-semibold text-default-900 mb-4">关注我们</h2>
          <div className="flex flex-wrap gap-4">
            <Button 
              variant="bordered" 
              startContent={<Globe size={16} />}
              size="sm"
            >
              官方网站
            </Button>
            <Button 
              variant="bordered" 
              startContent={<MessageCircle size={16} />}
              size="sm"
            >
              微信公众号
            </Button>
            <Button 
              variant="bordered" 
              startContent={<MessageSquare size={16} />}
              size="sm"
            >
              QQ群
            </Button>
            <Button 
              variant="bordered" 
              startContent={<Mail size={16} />}
              size="sm"
            >
              邮件订阅
            </Button>
          </div>
          <p className="text-sm text-default-500 mt-4">
            关注我们的社交媒体，获取最新产品动态和技术资讯。
          </p>
        </CardBody>
      </Card>

      {/* 占位提示 */}
      <div className="text-center py-8 text-default-400">
        <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
        <p>更多联系方式即将开通...</p>
      </div>
    </motion.div>
  );
};