import React from 'react';
import { copyToClipboard, getCurrentPageUrl } from '../utils/weChatUtils';

interface WeChatBrowserTipProps {
    /** 是否显示提示 */
    show: boolean;
    /** 隐藏提示的回调函数 */
    onHide: () => void;
    /** 自定义提示文案 */
    customMessage?: string;
}

/**
 * 微信浏览器提示组件
 * 当检测到在微信中打开时，显示提示用户在浏览器中打开
 * 
 * @param props - 组件属性
 * @returns JSX.Element
 */
const WeChatBrowserTip: React.FC<WeChatBrowserTipProps> = ({
    show,
    onHide,
    customMessage
}) => {
    if (!show) return null;

      /**
   * 复制当前页面URL到剪贴板
   */
  const copyCurrentUrl = async () => {
    const currentUrl = getCurrentPageUrl();
    const success = await copyToClipboard(currentUrl);
    
    if (success) {
      alert('链接已复制到剪贴板，请在浏览器中粘贴打开');
    } else {
      // 如果复制失败，显示URL供用户手动复制
      prompt('请复制以下链接在浏览器中打开：', currentUrl);
    }
  };

    const defaultMessage = customMessage || '为了更好的浏览体验，建议您在浏览器中打开';

    return (
        <div className="wechat-browser-tip">
            {/* 遮罩层 */}
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                {/* 提示卡片 */}
                <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6 relative">
                    {/* 关闭按钮 */}
                    <button
                        onClick={onHide}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="关闭提示"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* 图标 */}
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </div>
                    </div>

                    {/* 标题 */}
                    <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                        在浏览器中打开
                    </h3>

                    {/* 提示文案 */}
                    <p className="text-gray-600 text-center mb-6 text-sm">
                        {defaultMessage}
                    </p>

                    {/* 操作按钮 */}
                    <div className="space-y-3">
                        {/* 复制链接按钮 */}
                        <button
                            onClick={copyCurrentUrl}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            复制链接
                        </button>

                        {/* 继续浏览按钮 */}
                        <button
                            onClick={onHide}
                            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                        >
                            继续当前浏览
                        </button>
                    </div>

                    {/* 说明文字 */}
                    <p className="text-xs text-gray-500 text-center mt-4">
                        点击右上角"..."选择"在浏览器中打开"
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WeChatBrowserTip; 