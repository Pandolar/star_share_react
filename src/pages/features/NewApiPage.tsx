import React from 'react';
import {
  BuildingOfficeIcon,
  CheckCircleIcon,
  CheckIcon,
  CodeBracketIcon,
  ComputerDesktopIcon,
  DocumentTextIcon,
  LanguageIcon,
  LightBulbIcon,
  PencilIcon,
  SparklesIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

const NewApiPage: React.FC = () => {
  return (
    <div className="bg-gray-50 text-gray-800 font-sans">
      {/* How to use */}
      <section id="how-to-use" className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center text-gray-800">如何使用？</h2>
          
          <div className="max-w-3xl mx-auto bg-white rounded-xl p-8 shadow-md">
            <p className="text-lg mb-6 text-gray-700">
              修改应用 BASE_URL 为其中一个中转接口调用地址接口即可，例如：
            </p>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-6 overflow-x-auto">
              https://api.183ai.com 对应 https://api.openai.com
            </div>
            
            <p className="text-lg mb-4 text-gray-700">
              不同的客户端需要填写不同的 BASE_URL，这些都可以试一下：
            </p>
            <ul className="space-y-2 mb-6">
              <li className="bg-gray-100 p-3 rounded font-mono text-sm">https://api.183ai.com</li>
              <li className="bg-gray-100 p-3 rounded font-mono text-sm">https://api.183ai.com/v1</li>
              <li className="bg-gray-100 p-3 rounded font-mono text-sm">https://api.183ai.com/v1/chat/completions</li>
            </ul>
            
            <div className="flex justify-center">
              <span className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm">
                <LightBulbIcon className="w-5 h-5 mr-2" /> 简单三步，即可快速使用
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Target users */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Enterprise users */}
            <div className="bg-blue-50 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">企业用户</h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mt-1 mr-3 flex-shrink-0" />
                  <span>按需计费、多档价位、便宜实惠</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mt-1 mr-3 flex-shrink-0" />
                  <span>可签对公合同、提供正规发票，报销无忧</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mt-1 mr-3 flex-shrink-0" />
                  <span>助力企业自动化流程和智能化服务</span>
                </li>
              </ul>
            </div>

            {/* Individual creators */}
            <div className="bg-indigo-50 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
                <UserIcon className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">个人创作者</h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mt-1 mr-3 flex-shrink-0" />
                  <span>零基础便捷接入各类AI创作工具</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mt-1 mr-3 flex-shrink-0" />
                  <span>激发灵感，让创作更轻松</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mt-1 mr-3 flex-shrink-0" />
                  <span>低成本使用数百个AI模型</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section id="features" className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center text-gray-800">为什么选择我们？</h2>
          
          <p className="text-center text-gray-600 max-w-3xl mx-auto mb-12">
            整合全球领先的人工智能技术，提供最新、最高水平的人工智能支持。
            完美兼容各个平台的接口协议，0开发基础直接无缝对接各种应用
          </p>
          
          <div className="overflow-hidden rounded-xl shadow-lg">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-4 px-6 font-bold text-gray-700">对比项</th>
                  <th className="py-4 px-6 font-bold text-blue-600">NiceAIGC API</th>
                  <th className="py-4 px-6 font-bold text-gray-600">官方</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="py-4 px-6 font-medium">并发支持</td>
                  <td className="py-4 px-6 text-green-600"><CheckIcon className="w-5 h-5 mr-2 inline-block" />支持数百个账户保证高并发</td>
                  <td className="py-4 px-6">单个账号 API 有限制</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-4 px-6 font-medium">账号注册</td>
                  <td className="py-4 px-6 text-green-600"><CheckIcon className="w-5 h-5 mr-2 inline-block" />无需注册官方账号</td>
                  <td className="py-4 px-6">需要科学和绑定国外手机</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-4 px-6 font-medium">额度时效</td>
                  <td className="py-4 px-6 text-green-600"><CheckIcon className="w-5 h-5 mr-2 inline-block" />账号额度永不过期</td>
                  <td className="py-4 px-6">按月计算</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-4 px-6 font-medium">账号安全</td>
                  <td className="py-4 px-6 text-green-600"><CheckIcon className="w-5 h-5 mr-2 inline-block" />无忧风控问题</td>
                  <td className="py-4 px-6">随时可能无故封号</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-4 px-6 font-medium">使用明细</td>
                  <td className="py-4 px-6 text-green-600"><CheckIcon className="w-5 h-5 mr-2 inline-block" />实时查看每条使用细则</td>
                  <td className="py-4 px-6">只能查看延迟总消耗</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-4 px-6 font-medium">访问限制</td>
                  <td className="py-4 px-6 text-green-600"><CheckIcon className="w-5 h-5 mr-2 inline-block" />无需代理访问</td>
                  <td className="py-4 px-6">需要在可支持的地区使用</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-4 px-6 font-medium">计费方式</td>
                  <td className="py-4 px-6 text-green-600"><CheckIcon className="w-5 h-5 mr-2 inline-block" />以人民币计算</td>
                  <td className="py-4 px-6">以美金兑人民币计算</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* API uses */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center text-gray-800">API用途</h2>
          
          <p className="text-center text-gray-600 max-w-3xl mx-auto mb-12">
            API Key 相对于对话类应用来说可扩展性很强，可以用在不同的客户端调用或者集成在您的应用里等
          </p>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* For translation */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <LanguageIcon className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">用于翻译</h3>
              <p className="text-gray-600">
                与传统的翻译方法相比，基于AI的机器翻译具有更高的准确率和更快的翻译速度。
              </p>
            </div>
            
            {/* Writing assistance */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <PencilIcon className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">辅助写作</h3>
              <p className="text-gray-600">
                相比于传统的人工创作，ai写作生成可以快速产生大量的文本内容，并且质量稳定。
              </p>
            </div>
            
            {/* Code consultant */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <CodeBracketIcon className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">代码顾问</h3>
              <p className="text-gray-600">
                不仅能够大大减少写代码工作量,还能够提高代码的可读性和可维护性,让您更加专注于算法和业务逻辑的实现。
              </p>
            </div>
            
            {/* Multi-client support */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <ComputerDesktopIcon className="w-7 h-7 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">多客户端支持</h3>
              <p className="text-gray-600">
                对市面上支持自定义API的应用全面兼容，应用涵盖各大系统平台。本站也将提供下载导航和使用教程。
              </p>
            </div>
            
            {/* Custom assistant */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <SparklesIcon className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">自定义助手</h3>
              <p className="text-gray-600">
                通过对模型设定Prompt提示词或直接使用GPTs让AI变成您想要的专业领域的助手。
              </p>
            </div>
            
            {/* Document understanding */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <DocumentTextIcon className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">文档理解</h3>
              <p className="text-gray-600">
                通过支持多模态的AI模型可对图片进行理解。以及通过gpts等应用可对文档进行阅读和理解。
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default NewApiPage;