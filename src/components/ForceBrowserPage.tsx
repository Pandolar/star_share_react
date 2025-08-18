import React, { useEffect, useState } from 'react';
import { copyToClipboard, getCurrentPageUrl } from '../utils/weChatUtils';

interface ForceBrowserPageProps {
    /** 网站名称 */
    siteName?: string;
    /** 自定义标题 */
    customTitle?: string;
    /** 自定义说明文字 */
    customDescription?: string;
    /** 是否显示当前URL */
    showCurrentUrl?: boolean;
}

/**
 * 强制浏览器打开页面组件
 * 当检测到在微信中打开且启用强制模式时，完全替换原页面内容
 * 
 * @param props - 组件属性
 * @returns JSX.Element
 */
const ForceBrowserPage: React.FC<ForceBrowserPageProps> = ({
    siteName = '本网站',
    customTitle,
    customDescription,
    showCurrentUrl = true
}) => {
    const [currentUrl, setCurrentUrl] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        setCurrentUrl(getCurrentPageUrl());
    }, []);

    /**
     * 复制当前页面URL到剪贴板
     */
    const handleCopyUrl = async () => {
        const success = await copyToClipboard(currentUrl);

        if (success) {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } else {
            // 如果复制失败，使用prompt让用户手动复制
            prompt('请复制以下链接在浏览器中打开：', currentUrl);
        }
    };

    const title = customTitle || `${siteName}需要在浏览器中打开`;
    const description = customDescription || `为了提供最佳的用户体验和功能支持，${siteName}暂不支持在微信内置浏览器中访问。请您使用手机浏览器打开本页面。`;

    return (
        <div className="force-browser-page min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* 主卡片 */}
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                    {/* 图标 */}
                    <div className="mb-6">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>
                        </div>
                    </div>

                    {/* 标题 */}
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        {title}
                    </h1>

                    {/* 说明文字 */}
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        {description}
                    </p>

                    {/* URL显示和复制区域 */}
                    {showCurrentUrl && currentUrl && (
                        <div className="mb-8">
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <p className="text-sm text-gray-500 mb-2">页面地址：</p>
                                <p className="text-sm text-gray-800 break-all font-mono">
                                    {currentUrl}
                                </p>
                            </div>

                            {/* 复制按钮 */}
                            <button
                                onClick={handleCopyUrl}
                                className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${copySuccess
                                    ? 'bg-green-600 text-white'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                disabled={copySuccess}
                            >
                                {copySuccess ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        复制成功！
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        复制链接
                                    </span>
                                )}
                            </button>
                        </div>
                    )}

                    {/* 操作指引 */}
                    <div className="space-y-4">
                        <div className="text-left">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                如何在浏览器中打开：
                            </h3>

                            <div className="space-y-3 text-sm text-gray-700">
                                <div className="flex items-start">
                                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                                        1
                                    </span>
                                    <p>点击右上角 <strong>"..."</strong> 菜单按钮</p>
                                </div>

                                <div className="flex items-start">
                                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                                        2
                                    </span>
                                    <p>选择 <strong>"在浏览器中打开"</strong> 或 <strong>"复制链接"</strong></p>
                                </div>

                                <div className="flex items-start">
                                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                                        3
                                    </span>
                                    <p>在浏览器中打开链接即可正常访问</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 支持的浏览器 */}
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-3">推荐使用以下浏览器：</p>
                        <div className="flex justify-center space-x-4 text-xs text-gray-400">
                            <span>Safari</span>
                            <span>•</span>
                            <span>Chrome</span>
                            <span>•</span>
                            <span>Firefox</span>
                            <span>•</span>
                            <span>Edge</span>
                        </div>
                    </div>
                </div>

                {/* 底部提示 */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500">
                        感谢您的理解与配合
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForceBrowserPage; 