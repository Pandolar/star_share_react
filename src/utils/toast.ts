import { showToast, ToastType } from '../components/Toast';

export interface ToastOptions {
  duration?: number;
  closable?: boolean;
  className?: string;
}

const notify = (type: ToastType, message: string) => showToast(message, type);

/** Compatibility facade for existing call sites, rendered by HeroUI. */
export const toast = {
  success: (message: string, _options?: ToastOptions) => notify('success', message),
  error: (message: string, _options?: ToastOptions) => notify('error', message),
  warning: (message: string, _options?: ToastOptions) => notify('warning', message),
  info: (message: string, _options?: ToastOptions) => notify('info', message),
};
