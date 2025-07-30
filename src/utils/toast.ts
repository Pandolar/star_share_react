/**
 * 通知提示工具函数
 * 提供统一的消息提示功能
 */

export interface ToastOptions {
  /** 持续时间（毫秒） */
  duration?: number;
  /** 是否可关闭 */
  closable?: boolean;
  /** 自定义样式 */
  className?: string;
}

export interface ToastInstance {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration: number;
  closable: boolean;
  timestamp: number;
}

// 简单的事件发射器
class ToastEmitter {
  private listeners: Array<(toast: ToastInstance) => void> = [];

  subscribe(listener: (toast: ToastInstance) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  emit(toast: ToastInstance) {
    this.listeners.forEach(listener => listener(toast));
  }
}

const emitter = new ToastEmitter();

// 生成唯一ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// 创建通知实例
const createToast = (
  type: ToastInstance['type'],
  message: string,
  options: ToastOptions = {}
): ToastInstance => ({
  id: generateId(),
  type,
  message,
  duration: options.duration ?? 3000,
  closable: options.closable ?? true,
  timestamp: Date.now()
});

// 通知方法
export const toast = {
  success: (message: string, options?: ToastOptions) => {
    const toastInstance = createToast('success', message, options);
    emitter.emit(toastInstance);
    return toastInstance.id;
  },

  error: (message: string, options?: ToastOptions) => {
    const toastInstance = createToast('error', message, { duration: 4000, ...options });
    emitter.emit(toastInstance);
    return toastInstance.id;
  },

  warning: (message: string, options?: ToastOptions) => {
    const toastInstance = createToast('warning', message, { duration: 5000, ...options });
    emitter.emit(toastInstance);
    return toastInstance.id;
  },

  info: (message: string, options?: ToastOptions) => {
    const toastInstance = createToast('info', message, options);
    emitter.emit(toastInstance);
    return toastInstance.id;
  },

  // 订阅通知事件
  subscribe: (listener: (toast: ToastInstance) => void) => {
    return emitter.subscribe(listener);
  }
};

// Toast消息工具 - 使用页面级别的美观提示替代浏览器弹窗
export const showMessage = {
  success: (message: string) => {
    console.log('Success:', message);
    return toast.success(message);
  },

  error: (message: string) => {
    console.error('Error:', message);
    return toast.error(message);
  },

  warning: (message: string) => {
    console.warn('Warning:', message);
    return toast.warning(message);
  },

  info: (message: string) => {
    console.log('Info:', message);
    return toast.info(message);
  }
};