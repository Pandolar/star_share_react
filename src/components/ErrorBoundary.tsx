import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  autoReload?: boolean;
  reloadDelay?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isReloading: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  private reloadTimer: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isReloading: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isReloading: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // 自动刷新逻辑
    if (this.props.autoReload !== false) {
      const delay = this.props.reloadDelay || 2000;
      this.scheduleReload(delay);
    }
  }

  componentWillUnmount() {
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
    }
  }

  private scheduleReload(delay: number) {
    this.setState({ isReloading: true });
    
    this.reloadTimer = setTimeout(() => {
      // 避免无限刷新，检查刷新次数
      const reloadCount = parseInt(sessionStorage.getItem('errorReloadCount') || '0');
      if (reloadCount < 3) {
        sessionStorage.setItem('errorReloadCount', (reloadCount + 1).toString());
        window.location.reload();
      } else {
        // 超过3次错误，停止自动刷新
        this.setState({ isReloading: false });
        console.warn('页面错误次数过多，停止自动刷新');
      }
    }, delay);
  }

  private handleManualReload = () => {
    // 清除错误计数，允许手动刷新
    sessionStorage.removeItem('errorReloadCount');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.state.isReloading) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">页面正在恢复中...</h2>
              <p className="text-gray-600">正在重新加载页面，请稍候</p>
            </div>
          </div>
        );
      }

      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">页面加载出现问题</h2>
            <p className="text-gray-600 mb-6">抱歉给您带来不便，页面遇到了一些技术问题</p>
            <div className="space-x-4">
              <button 
                onClick={this.handleManualReload} 
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                立即刷新
              </button>
              <button 
                onClick={() => window.location.href = '/'} 
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;