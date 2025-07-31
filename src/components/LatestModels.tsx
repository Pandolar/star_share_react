import React from 'react';
import { motion } from 'framer-motion';
import { useHomeInfo } from '../contexts/HomeInfoContext';
import { DynamicIcon } from '../utils/iconUtils';

// 最新模型展示区域组件
const LatestModels: React.FC = () => {
  const { homeInfo, loading } = useHomeInfo();

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

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 标题区域加载状态 */}
          <div className="text-center mb-16">
            <div className="w-48 h-12 bg-gray-200 rounded mx-auto mb-4 animate-pulse"></div>
            <div className="w-96 h-6 bg-gray-200 rounded mx-auto animate-pulse"></div>
          </div>

          {/* 模型网格加载状态 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm animate-pulse"
              >
                <div className="p-6 pb-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                    <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
                  </div>
                  <div className="w-24 h-6 bg-gray-200 rounded mb-1"></div>
                </div>
                <div className="p-6 pt-4">
                  <div className="w-full h-16 bg-gray-200 rounded mb-6"></div>
                  <div className="flex flex-wrap gap-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="w-20 h-6 bg-gray-200 rounded-full"></div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const { features } = homeInfo;

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
            {features.title}
          </h2>
          <p className="text-xl text-gray-500 max-w-3xl mx-auto">
            {features.subtitle}
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
          {features.models.map((model) => {
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
                      <DynamicIcon 
                        iconName={model.icon}
                        fallbackIcon="User"
                        className="w-6 h-6"
                      />
                    </div>
                    <span className={`${model.badgeColor} px-3 py-1 rounded-full text-xs font-medium`}>
                      {model.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">{model.name}</h3>
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