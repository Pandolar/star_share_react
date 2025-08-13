import { useState, useEffect } from 'react';
import { isWeChatBrowser, getWeChatEnvironmentInfo } from '../utils/weChatUtils';

/**
 * 自定义Hook：检测当前页面是否在微信中打开
 * @param {object} options - 配置选项
 * @param {boolean} options.forceMode - 是否启用强制模式（强制不能在微信中打开）
 * @param {boolean} options.showTipByDefault - 是否默认显示提示（非强制模式下有效）
 * @returns {object} 返回检测结果和控制状态
 * - isWeChat: boolean - 是否在微信中打开
 * - showBrowserTip: boolean - 是否显示浏览器打开提示
 * - forceBlockWeChat: boolean - 是否强制阻止微信访问
 * - hideTip: function - 隐藏提示的方法
 * - environmentInfo: WeChatEnvironmentInfo - 微信环境详细信息
 */
export const useWeChatDetection = (options: {
  forceMode?: boolean;
  showTipByDefault?: boolean;
} = {}) => {
  const { forceMode = false, showTipByDefault = true } = options;
  
  const [isWeChat, setIsWeChat] = useState(false);
  const [showBrowserTip, setShowBrowserTip] = useState(false);
  const [forceBlockWeChat, setForceBlockWeChat] = useState(false);
  const [environmentInfo, setEnvironmentInfo] = useState(getWeChatEnvironmentInfo());

    useEffect(() => {
            /**
     * 检测微信环境
     */
    const detectWeChatEnvironment = () => {
      const envInfo = getWeChatEnvironmentInfo();
      setEnvironmentInfo(envInfo);
      setIsWeChat(envInfo.isWeChat);
      
      if (envInfo.isWeChat) {
        if (forceMode) {
          // 强制模式：阻止微信访问
          setForceBlockWeChat(true);
          setShowBrowserTip(false); // 强制模式下不显示普通提示
        } else if (showTipByDefault) {
          // 普通模式：显示浏览器打开提示
          setShowBrowserTip(true);
          setForceBlockWeChat(false);
        }
      } else {
        setForceBlockWeChat(false);
        setShowBrowserTip(false);
      }
    };

        detectWeChatEnvironment();
    }, []);

    /**
     * 隐藏浏览器打开提示
     */
    const hideTip = () => {
        setShowBrowserTip(false);
    };

      /**
   * 重新检测微信环境
   */
  const redetect = () => {
    const envInfo = getWeChatEnvironmentInfo();
    setEnvironmentInfo(envInfo);
    setIsWeChat(envInfo.isWeChat);
    
    if (envInfo.isWeChat) {
      if (forceMode) {
        setForceBlockWeChat(true);
        setShowBrowserTip(false);
      } else if (showTipByDefault) {
        setShowBrowserTip(true);
        setForceBlockWeChat(false);
      }
    } else {
      setForceBlockWeChat(false);
      setShowBrowserTip(false);
    }
  };

  return {
    isWeChat,
    showBrowserTip,
    forceBlockWeChat,
    hideTip,
    redetect,
    environmentInfo
  };
}; 