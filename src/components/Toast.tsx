import { addToast } from '@heroui/react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

const severityMap = {
  success: 'success',
  error: 'danger',
  warning: 'warning',
  info: 'primary',
} as const;

/** Backward-compatible helper backed by HeroUI Toast. */
export const showToast = (message: string, type: ToastType = 'info') => addToast({
  title: message,
  color: severityMap[type],
  severity: severityMap[type],
  variant: 'flat',
  timeout: type === 'warning' ? 5000 : type === 'error' ? 4000 : 3000,
  shouldShowTimeoutProgress: true,
});
