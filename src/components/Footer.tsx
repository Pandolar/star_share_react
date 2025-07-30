import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Github, Twitter, Linkedin, Youtube } from 'lucide-react';

// Footer组件 - 包含版权信息和链接
const Footer: React.FC = () => {
  const footerLinks = {
    // 产品: [
    //   { name: '海螺AI', href: '#' },
    //   { name: 'ChatBot Pro', href: '#' },
    //   { name: 'CodeGen AI', href: '#' },
    //   { name: 'ImageGen Pro', href: '#' }
    // ],
    开发者: [
      { name: 'API文档', href: '#' },
      { name: 'SDK下载', href: '#' },
      { name: '开发指南', href: '#' },
      { name: '社区论坛', href: '#' }
    ],
    资源: [
      { name: '帮助中心', href: '#' },
      { name: '视频教程', href: '#' },
      { name: '技术博客', href: '#' },
      { name: '最佳实践', href: '#' }
    ],
    公司: [
      { name: '关于我们', href: '#' },
      { name: '加入我们', href: '#' },
      { name: '新闻动态', href: '#' },
      { name: '投资者关系', href: '#' }
    ]
  };

  const socialLinks = [
    { icon: Github, href: 'https://github.com/niceaigc', label: 'GitHub' },
    { icon: Twitter, href: 'https://x.com/niceaigc', label: 'Twitter' },
    // { icon: Linkedin, href: 'https://www.linkedin.com/company/niceaigc', label: 'LinkedIn' },
    { icon: Youtube, href: 'https://www.youtube.com/@niceaigc', label: 'YouTube' }
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 主要内容区域 */}
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
            {/* 公司信息 */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
                  NiceAIGC
                </div>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  致力于推动人工智能技术的发展与应用，为用户提供智能、高效、便捷的AI解决方案。
                </p>
                
                {/* 联系信息 */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-blue-400" />
                    <span className="text-gray-400">contact@niceaigc.com</span>
                  </div>
                  {/* <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-blue-400" />
                    <span className="text-gray-400">+86 400-123-4567</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-blue-400" />
                    <span className="text-gray-400">北京市海淀区中关村科技园</span>
                  </div> */}
                </div>
              </motion.div>
            </div>

            {/* 链接区域 */}
            {Object.entries(footerLinks).map(([category, links], index) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <h3 className="text-lg font-semibold mb-4">{category}</h3>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.name}>
                      <motion.a
                        href={link.href}
                        className="text-gray-400 hover:text-white transition-colors duration-200 no-underline"
                        style={{ textDecoration: 'none' }}
                        whileHover={{ x: 5 }}
                      >
                        {link.name}
                      </motion.a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 分割线 */}
        <div className="border-t border-gray-800" />

        {/* 底部信息 */}
        <div className="py-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            {/* 版权信息 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-gray-400 text-sm"
            >
              <span>© 2024 NiceAIGC. 保留所有权利.</span>
              {/* <div className="flex space-x-6">
                <a href="#" className="hover:text-white transition-colors">隐私政策</a>
                <a href="#" className="hover:text-white transition-colors">用户协议</a>
                <a href="#" className="hover:text-white transition-colors">Cookie政策</a>
              </div> */}
            </motion.div>

            {/* 社交媒体链接 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="flex space-x-4"
            >
              {socialLinks.map((social, index) => {
                const IconComponent = social.icon;
                return (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    className="bg-gray-800 p-3 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200"
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="sr-only">{social.label}</span>
                  </motion.a>
                );
              })}
            </motion.div>
          </div>

          {/* 备案信息 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="mt-6 pt-6 border-t border-gray-800 text-center text-gray-500 text-sm"
          >
            <p>
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-300 text-gray-500 no-underline transition-colors duration-200"
                style={{ textDecoration: 'none' }}
              >
                沪ICP备2024091545号-1
              </a>
            </p>
            {/*<p className="mt-2">互联网信息服务业务经营许可证：京B2-20240101</p>*/}
          </motion.div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;