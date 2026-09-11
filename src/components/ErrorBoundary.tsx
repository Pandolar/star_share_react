import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@heroui/react';
import {
  clearRecoveryAttempts,
  isStaleAssetError,
  purgeClientCaches,
  recoverStaleAssets,
  reloadDocumentBypassingCache,
} from '../utils/assetRecovery';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** 是否允许对「资源版本不一致」错误做一次自动恢复（默认允许）。 */
  autoReload?: boolean;
  /** 自动恢复前的等待时间，留出提示动画与用户感知。 */
  reloadDelay?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRecovering: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  private reloadTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isRecovering: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isRecovering: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 只有「资源版本不一致」才自动恢复；其余运行时错误立即展示终态页面，
    // 既不掩盖真实问题，也不会因为反复 reload 形成死循环。
    if (this.props.autoReload === false) return;
    if (!isStaleAssetError(error)) return;

    console.error('[ErrorBoundary] 资源版本不一致，准备清理缓存后重载', error, errorInfo.componentStack);
    this.setState({ isRecovering: true });
    this.reloadTimer = setTimeout(() => {
      void recoverStaleAssets().then((recovered) => {
        // 自愈额度用尽：停止自动重载，交给用户手动处理
        if (!recovered) {
          this.setState({ isRecovering: false });
          return;
        }
        // 重载已发起但未生效（导航被拦截 / 离线）时，兜底回到可操作状态，
        // 避免用户被永久困在「页面正在恢复中」。
        this.reloadTimer = setTimeout(() => this.setState({ isRecovering: false }), 10000);
      });
    }, this.props.reloadDelay ?? 1500);
  }

  componentWillUnmount() {
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
  }

  /** 手动刷新：清空自愈额度并清理缓存，确保用户这一次能拿到最新资源。 */
  private handleManualReload = async () => {
    clearRecoveryAttempts();
    await purgeClientCaches();
    reloadDocumentBypassingCache();
  };

  render() {
    if (this.state.hasError) {
      if (this.state.isRecovering) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-default-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h2 className="text-xl font-bold text-default-900 mb-2">页面正在恢复中...</h2>
              <p className="text-default-600">正在重新加载页面，请稍候</p>
            </div>
          </div>
        );
      }

      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-default-50">
          <div className="text-center p-8">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-default-900 mb-4">页面加载出现问题</h2>
            <p className="text-default-600 mb-6">
              抱歉给您带来不便，请点击下方按钮重新加载；若仍无法访问，请联系客服协助处理。
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button color="primary" onPress={this.handleManualReload}>
                立即刷新
              </Button>
              <Button variant="bordered" onPress={() => window.location.assign('/')}>
                返回首页
              </Button>
            </div>
            {this.state.error?.message ? (
              <p className="mt-6 break-all text-xs text-default-400">错误信息：{this.state.error.message}</p>
            ) : null}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
