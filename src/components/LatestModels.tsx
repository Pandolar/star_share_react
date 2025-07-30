import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Brain, User, Code, MessageCircle, Image, CreditCard, FileText, MessageSquare, Globe } from 'lucide-react';
import config from '../config';

// 最新模型展示区域组件
const LatestModels: React.FC = () => {

  const models = [
    {
      id: 1,
      name: '用户体系',
      // type: '中心化',
      description: '中心化用户体系，一处登录，多站使用，支持用户登录、注册、找回密码、修改密码、退出登录等功能',
      features: ['中心化', '单点登录', '数据加密', '便捷操作'],
      icon: User,
      color: 'bg-purple-50 text-purple-600',
      hoverColor: 'hover:bg-purple-100',
      badge: 'User System',
      badgeColor: 'bg-purple-100 text-purple-700',
      link: config.links.chatService
    },
    {
      id: 2,
      name: '无需魔法',
      // type: '对话式AI',
      description: '国内任意网络畅联，直通最强AI服务，无需魔法/代理/梯子，即可使用',
      features: ['无需魔法', '国内直连', '无需代理', '便捷操作'],
      icon: Globe,
      color: 'bg-blue-50 text-blue-600',
      hoverColor: 'hover:bg-blue-100',
      badge: 'STABLE',
      badgeColor: 'bg-blue-100 text-blue-700',
      link: config.links.chatService
    },
    {
      id: 3,
      name: 'Plus 充值',
      // type: '代码生成',
      description: '支持个人Plus充值，充在自己号上，支持多种支付方式，无需担心隐私问题',
      features: ['Plus 充值', '多种支付方式', '隐私至上', '便捷操作'],
      icon: CreditCard,
      color: 'bg-green-50 text-green-600',
      hoverColor: 'hover:bg-green-100',
      badge: 'BETA',
      badgeColor: 'bg-green-100 text-green-700',
      link: config.links.plusService
    },
    {
      id: 4,
      name: 'API 接口',
      // type: '图像生成',
      description: '支持API接口，支持多种语言和框架，支持多种数据格式',
      features: ['API 接口', '多种语言', '多种框架', '多种数据格式'],
      icon: Zap,
      color: 'bg-orange-50 text-orange-600',
      hoverColor: 'hover:bg-orange-100',
      badge: 'COMING',
      badgeColor: 'bg-orange-100 text-orange-700',
      link: config.links.openPlatform
    },
    {
      id: 5,
      name: '可开发票',
      // type: '图像生成',
      description: '支持开发票，企业/个人均可, 支持多种发票类型, 如有需要请联系客服',
      features: ['发票', '多种发票类型', '方便报销'],
      icon: FileText,
      color: 'bg-red-50 text-red-600',
      hoverColor: 'hover:bg-red-100',
      badge: 'COMING',
      badgeColor: 'bg-red-100 text-red-700',
      link: config.links.chatService
    },
    {
      id: 6,
      name: '优质售后',
      // type: '图像生成',
      description: '支持多种售后方式，微信/邮箱/QQ/工单，如有疑问可随时联系，客服会第一时间响应',
      features: ['售后', '多种售后方式', '稳定可靠', '快速响应'],
      icon: MessageSquare,
      color: 'bg-purple-50 text-purple-600',
      hoverColor: 'hover:bg-purple-100',
      badge: 'COMING',
      badgeColor: 'bg-purple-100 text-purple-700',
      link: config.links.chatService
    },
  ];

  // 动画变体
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0
    }
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 标题区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            本站特点
          </h2>
          <p className="text-xl text-gray-500 max-w-3xl mx-auto">
            以用户为中心，以技术为驱动，以服务为宗旨
          </p>
        </motion.div>

        {/* 模型网格 */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {models.map((model) => {
            const IconComponent = model.icon;
            return (
              <motion.div
                key={model.id}
                variants={itemVariants}
                whileHover={{
                  y: -3,
                  transition: { duration: 0.2 }
                }}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-300 shadow-sm"
              >
                {/* 卡片头部 */}
                <div className="p-6 pb-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`${model.color} rounded-xl p-3 transition-colors duration-200`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <span className={`${model.badgeColor} px-3 py-1 rounded-full text-xs font-medium`}>
                      {model.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">{model.name}</h3>
                    {/* <p className="text-sm text-gray-500">{model.type}</p> */}
                  </div>
                </div>

                {/* 卡片内容 */}
                <div className="p-6 pt-4">
                  {/* 描述 */}
                  <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                    {model.description}
                  </p>

                  {/* 特性标签 */}
                  <div className="flex flex-wrap gap-2">
                    {model.features.map((feature, index) => (
                      <motion.span
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        viewport={{ once: true }}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                      >
                        {feature}
                      </motion.span>
                    ))}
                  </div>

                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default LatestModels;