import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Monitor, Cloud, Download, Star, Users } from 'lucide-react';

// 原生应用展示区域组件
const NativeApplications: React.FC = () => {
  const applications = [
    {
      id: 1,
      name: 'NiceAIGC Mobile',
      platform: 'iOS / Android',
      description: '随时随地使用AI功能，移动端完整体验',
      features: ['语音交互', '离线使用', '云端同步', '智能推荐'],
      icon: Smartphone,
      downloads: '100万+',
      rating: 4.8,
      image: '/api/placeholder/300/200'
    },
    {
      id: 2,
      name: 'NiceAIGC Desktop',
      platform: 'Windows / macOS',
      description: '专业级桌面应用，高效处理复杂任务',
      features: ['高性能计算', '多任务并行', '插件扩展', '专业工具'],
      icon: Monitor,
      downloads: '50万+',
      rating: 4.9,
      image: '/api/placeholder/300/200'
    },
    {
      id: 3,
      name: 'NiceAIGC Cloud',
      platform: 'Web 应用',
      description: '无需安装，浏览器直接使用，跨平台支持',
      features: ['即开即用', '实时协作', '云端存储', '团队共享'],
      icon: Cloud,
      downloads: '500万+',
      rating: 4.7,
      image: '/api/placeholder/300/200'
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            原生应用
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            跨平台支持，为不同设备和使用场景提供最佳体验
          </p>
        </motion.div>

        {/* 应用展示 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {applications.map((app, index) => {
            const IconComponent = app.icon;
            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02 }}
                className="bg-gray-50 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                {/* 应用图片 */}
                <div className="h-48 bg-blue-600 relative overflow-hidden">
                  <img
                    src={app.image}
                    alt={app.name}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm rounded-full p-3">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* 应用信息 */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{app.name}</h3>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">{app.rating}</span>
                    </div>
                  </div>

                  <p className="text-blue-600 font-medium mb-3">{app.platform}</p>
                  <p className="text-gray-600 mb-4">{app.description}</p>

                  {/* 特性标签 */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {app.features.map((feature, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* 下载信息 */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{app.downloads} 下载</span>
                    </div>
                  </div>

                  {/* 下载按钮 */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="w-5 h-5" />
                    <span>立即下载</span>
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default NativeApplications;