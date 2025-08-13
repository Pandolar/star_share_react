import React from 'react';
import { useWeChatDetection } from '../hooks/useWeChatDetection';
import WeChatBrowserTip from '../components/WeChatBrowserTip';
import ForceBrowserPage from '../components/ForceBrowserPage';
import { 
  isWeChatBrowser, 
  showBrowserOpenGuide, 
  getWeChatEnvironmentInfo,
  shouldBlockWeChatAccess,
  initForceMode
} from '../utils/weChatUtils';

/**
 * 微信检测功能使用示例
 * 展示如何在其他页面中集成微信检测功能
 */
const WeChatDetectionExample: React.FC = () => {
  // 演示模式选择：普通模式
  const [demoMode, setDemoMode] = React.useState<'normal' | 'force'>('normal');
  
  // 方法1: 使用Hook（推荐） - 普通模式
  const normalMode = useWeChatDetection({
    forceMode: false,
    showTipByDefault: true
  });
  
  // 方法1: 使用Hook（推荐） - 强制模式
  const forceMode = useWeChatDetection({
    forceMode: true,
    showTipByDefault: false
  });
  
  // 根据演示模式选择对应的状态
  const currentMode = demoMode === 'force' ? forceMode : normalMode;
  const { isWeChat, showBrowserTip, forceBlockWeChat, hideTip, environmentInfo } = currentMode;

  // 方法2: 直接使用工具函数
  const handleDirectDetection = () => {
    const isInWeChat = isWeChatBrowser();
    console.log('是否在微信中:', isInWeChat);
    
    if (isInWeChat) {
      showBrowserOpenGuide(demoMode === 'force');
    }
  };

  // 方法3: 获取详细环境信息
  const handleGetEnvironmentInfo = () => {
    const envInfo = getWeChatEnvironmentInfo();
    console.log('微信环境信息:', envInfo);
  };
  
  // 方法4: 检查强制模式
  const handleCheckForceMode = () => {
    const shouldBlock = shouldBlockWeChatAccess(demoMode === 'force');
    console.log('是否需要强制阻止:', shouldBlock);
    alert(`强制模式${demoMode === 'force' ? '启用' : '关闭'}，${shouldBlock ? '需要阻止' : '不需要阻止'}微信访问`);
  };

  // 如果在强制模式下需要阻止微信访问
  if (demoMode === 'force' && forceBlockWeChat) {
    return (
      <ForceBrowserPage 
        siteName="示例网站"
        customTitle="示例：强制模式演示"
        customDescription="这是强制模式的演示。在实际应用中，当检测到微信访问时，会完全替换页面内容，强制用户在浏览器中打开。"
        showCurrentUrl={true}
      />
    );
  }

        return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">微信检测功能使用示例</h1>

      {/* 模式选择器 */}
      <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h2 className="text-lg font-semibold mb-3">演示模式选择</h2>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="demoMode"
              value="normal"
              checked={demoMode === 'normal'}
              onChange={(e) => setDemoMode(e.target.value as 'normal' | 'force')}
              className="mr-2"
            />
            <span>普通模式（提示用户在浏览器打开）</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="demoMode"
              value="force"
              checked={demoMode === 'force'}
              onChange={(e) => setDemoMode(e.target.value as 'normal' | 'force')}
              className="mr-2"
            />
            <span className="text-red-600 font-medium">强制模式（禁止在微信中访问）</span>
          </label>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {demoMode === 'force' 
            ? '⚠️ 强制模式：在微信中将完全无法访问页面内容，强制跳转到浏览器打开提示页面'
            : '💡 普通模式：在微信中会显示提示，但用户可以选择继续浏览'
          }
        </p>
      </div>

      {/* 当前环境信息显示 */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">当前环境信息</h2>
        <div className="space-y-2 text-sm">
          <p><strong>演示模式:</strong> <span className={demoMode === 'force' ? 'text-red-600 font-medium' : 'text-green-600'}>{demoMode === 'force' ? '强制模式' : '普通模式'}</span></p>
          <p><strong>是否在微信中:</strong> {isWeChat ? '是' : '否'}</p>
          <p><strong>是否在小程序中:</strong> {environmentInfo.isMiniProgram ? '是' : '否'}</p>
          <p><strong>强制阻止状态:</strong> {forceBlockWeChat ? <span className="text-red-600 font-medium">已阻止</span> : '正常访问'}</p>
          <p><strong>当前URL:</strong> {environmentInfo.currentUrl}</p>
          <p><strong>User Agent:</strong> {environmentInfo.userAgent}</p>
        </div>
      </div>

            {/* 使用方法示例 */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">集成方式</h2>

                <div className="space-y-4">
                    {/* 方法1: Hook方式 */}
                    <div className="p-4 border rounded-lg">
                        <h3 className="font-medium mb-2">方法1: 使用Hook（推荐）</h3>
                        <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                            {`// 1. 导入Hook和组件
import { useWeChatDetection } from '../hooks/useWeChatDetection';
import WeChatBrowserTip from '../components/WeChatBrowserTip';

// 2. 在组件中使用
const YourComponent = () => {
  const { isWeChat, showBrowserTip, hideTip } = useWeChatDetection();
  
  return (
    <div>
      {/* 你的页面内容 */}
      
      {/* 微信浏览器提示 */}
      <WeChatBrowserTip 
        show={showBrowserTip} 
        onHide={hideTip}
        customMessage="自定义提示文案（可选）"
      />
    </div>
  );
};`}
                        </pre>
                    </div>

                    {/* 方法2: 直接使用工具函数 */}
                    <div className="p-4 border rounded-lg">
                        <h3 className="font-medium mb-2">方法2: 直接使用工具函数</h3>
                        <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                            {`// 1. 导入工具函数
import { 
  isWeChatBrowser, 
  showBrowserOpenGuide, 
  getWeChatEnvironmentInfo 
} from '../utils/weChatUtils';

// 2. 在需要的地方调用
const handleSomething = () => {
  if (isWeChatBrowser()) {
    showBrowserOpenGuide(); // 显示打开指引
  }
  
  // 或获取详细信息
  const envInfo = getWeChatEnvironmentInfo();
  console.log(envInfo);
};`}
                        </pre>
                    </div>
                </div>
            </div>

            {/* 测试按钮 */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">功能测试</h2>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleDirectDetection}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        直接检测并显示指引
                    </button>

                              <button
            onClick={handleGetEnvironmentInfo}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            获取环境信息（控制台）
          </button>
          
          <button
            onClick={handleCheckForceMode}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            检查强制模式状态
          </button>
                </div>
            </div>

                  {/* 微信浏览器提示组件（仅在普通模式下显示） */}
      {demoMode === 'normal' && (
        <WeChatBrowserTip 
          show={showBrowserTip} 
          onHide={hideTip}
          customMessage="这是示例页面的自定义提示文案（普通模式）"
        />
      )}
        </div>
    );
};

export default WeChatDetectionExample; 