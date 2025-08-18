import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useHomeInfo } from '../contexts/HomeInfoContext';
import { DynamicIcon } from '../utils/iconUtils';

// Footer组件 - 包含版权信息和链接
const Footer: React.FC = () => {
  const { homeInfo, loading } = useHomeInfo();

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 主要内容区域加载状态 */}
          <div className="py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
              {/* 公司信息加载状态 */}
              <div className="lg:col-span-2">
                <div className="w-32 h-8 bg-gray-700 rounded mb-4 animate-pulse"></div>
                <div className="w-full h-16 bg-gray-700 rounded mb-6 animate-pulse"></div>
                <div className="space-y-3">
                  <div className="w-48 h-5 bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>

              {/* 链接区域加载状态 */}
              {[...Array(3)].map((_, index) => (
                <div key={index}>
                  <div className="w-16 h-6 bg-gray-700 rounded mb-4 animate-pulse"></div>
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-20 h-4 bg-gray-700 rounded animate-pulse"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 底部信息加载状态 */}
          <div className="border-t border-gray-800 py-8">
            <div className="flex justify-between items-center">
              <div className="w-48 h-4 bg-gray-700 rounded animate-pulse"></div>
              <div className="flex space-x-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-10 h-10 bg-gray-700 rounded-full animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  const { siteInfo, footer } = homeInfo;

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
                <div className="text-2xl font-bold text-blue-600 mb-4">
                  {siteInfo.siteName}
                </div>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  {siteInfo.description}
                </p>

                {/* 联系信息 */}
                <div className="space-y-3">
                  {siteInfo.contactInfo.email && (
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-blue-400" />
                      <span className="text-gray-400">{siteInfo.contactInfo.email}</span>
                    </div>
                  )}
                  {siteInfo.contactInfo.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-blue-400" />
                      <span className="text-gray-400">{siteInfo.contactInfo.phone}</span>
                    </div>
                  )}
                  {siteInfo.contactInfo.address && (
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-5 h-5 text-blue-400" />
                      <span className="text-gray-400">{siteInfo.contactInfo.address}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* 链接区域 */}
            {Object.entries(footer.footerLinks).map(([category, links], index) => (
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
              <span>© {siteInfo.copyrightYear} {siteInfo.companyName}. 保留所有权利.</span>
            </motion.div>

            {/* 社交媒体链接 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="flex space-x-4"
            >
              {footer.socialLinks.map((social, index) => {
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
                    <DynamicIcon
                      iconName={social.icon}
                      fallbackIcon="Mail"
                      className="w-5 h-5"
                    />
                    <span className="sr-only">{social.label}</span>
                  </motion.a>
                );
              })}
            </motion.div>
          </div>

          {/* 备案信息 */}
          {siteInfo.icpNumber && (
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
                  {siteInfo.icpNumber}
                </a>
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;