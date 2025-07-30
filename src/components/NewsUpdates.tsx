import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

// 新闻更新区域组件
const NewsUpdates: React.FC = () => {
  const news = [
    {
      id: 1,
      title: 'NiceAIGC发布全新AI视频生成模型',
      summary: '全新海螺AI模型支持高清视频生成，在视频质量和生成速度上实现重大突破',
      category: '产品发布',
      date: '2024-01-15',
      readTime: '3分钟',
      image: '/api/placeholder/400/250',
      featured: true
    },
    {
      id: 2,
      title: '人工智能安全与伦理研究新进展',
      summary: '公司在AI安全研究方面取得重要进展，发布了新的伦理指导原则',
      category: '研究报告',
      date: '2024-01-10',
      readTime: '5分钟',
      image: '/api/placeholder/400/250',
      featured: false
    },
    {
      id: 3,
      title: '开发者大会：AI技术的未来趋势',
      summary: '年度开发者大会成功举办，分享最新技术趋势和开发工具',
      category: '活动资讯',
      date: '2024-01-05',
      readTime: '4分钟',
      image: '/api/placeholder/400/250',
      featured: false
    },
    {
      id: 4,
      title: '合作伙伴生态系统扩展',
      summary: '与多家科技公司达成战略合作，共同推进AI技术普及应用',
      category: '合作公告',
      date: '2024-01-01',
      readTime: '2分钟',
      image: '/api/placeholder/400/250',
      featured: false
    }
  ];

  const getCategoryColor = (category: string) => {
    const colors = {
      '产品发布': 'bg-blue-100 text-blue-700',
      '研究报告': 'bg-green-100 text-green-700',
      '活动资讯': 'bg-purple-100 text-purple-700',
      '合作公告': 'bg-orange-100 text-orange-700'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  return (
    <section className="py-20 bg-gray-50">
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
            新闻动态
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            了解最新产品发布、技术突破和行业动态
          </p>
        </motion.div>

        {/* 新闻网格 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 特色新闻 */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="lg:row-span-2"
          >
            {news.filter(item => item.featured).map((item) => (
              <motion.article
                key={item.id}
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 h-full"
              >
                {/* 特色新闻图片 */}
                <div className="h-64 lg:h-80 relative overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(item.category)}`}>
                      {item.category}
                    </span>
                  </div>
                </div>

                {/* 特色新闻内容 */}
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {item.summary}
                  </p>

                  {/* 元信息 */}
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{item.date}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{item.readTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* 阅读按钮 */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <span>阅读全文</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.article>
            ))}
          </motion.div>

          {/* 普通新闻列表 */}
          <div className="space-y-6">
            {news.filter(item => !item.featured).map((item, index) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="flex">
                  {/* 新闻图片 */}
                  <div className="w-32 h-32 flex-shrink-0 relative overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* 新闻内容 */}
                  <div className="flex-1 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(item.category)}`}>
                        {item.category}
                      </span>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{item.date}</span>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {item.title}
                    </h3>

                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {item.summary}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{item.readTime}</span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                      >
                        <span>阅读</span>
                        <ArrowRight className="w-3 h-3" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        {/* 查看更多 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gray-200 text-gray-700 px-8 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200 flex items-center space-x-2 mx-auto"
          >
            <span>查看更多新闻</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default NewsUpdates;