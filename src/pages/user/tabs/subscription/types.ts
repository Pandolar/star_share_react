/** Subscription Tab 共享类型与工具 */

export interface PackageInfo {
  id: number;
  package_name: string;
  category: string;
  price: number;
  duration: number;
  introduce: string;
  level: string;
  priority: number;
  remarks: string;
  status: number;
}

export interface PromotionSnapshot {
  code: string;
  name: string;
  discount_type: 'rate' | 'fixed';
  discount_value: number;
  scope_type: 'all' | 'packages' | 'levels';
  original_amount: string;
  discount_amount: string;
  discounted_amount: string;
}

export interface OrderInfo {
  success: boolean;
  trade_no: string;
  order_id: string;
  checkout_id: string;
  payment_url: string | null;
  qr_code: string;
  channel: string;
  pay_type: string;
  base_amount?: string;
  payable_amount?: string;
  invoice_requested?: boolean;
  discount_amount?: string;
  promotion_code?: string | null;
  promotion_snapshot?: PromotionSnapshot | null;
  expires_at?: string | null;
  expires_in_seconds?: number;
  invoice_snapshot?: {
    title: string;
    tax_number: string;
    email: string;
    surcharge_amount: string;
    original_amount?: string;
    base_amount?: string;
    discount_amount?: string;
    promotion_code?: string | null;
    payable_amount?: string;
    delivery_workdays: number;
  } | null;
}

export type SubscriptionType = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'more';

export interface SubscriptionCategory {
  key: SubscriptionType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

/** 时长归类 */
export const categorizePackage = (duration: number): SubscriptionType => {
  if (duration === 7) return 'weekly';
  if (duration >= 30 && duration <= 31) return 'monthly';
  if (duration >= 90 && duration <= 93) return 'quarterly';
  if (duration >= 364 && duration <= 366) return 'yearly';
  return 'more';
};

/** 时长文案 */
export const getDurationText = (duration: number) => {
  if (duration === 7) return '1周';
  if (duration >= 30 && duration <= 31) return '1个月';
  if (duration >= 90 && duration <= 93) return '1季度';
  if (duration >= 364 && duration <= 366) return '1年';
  return `${duration}天`;
};

/** 日均价格（保留 1 位小数，四舍五入） */
export const calculateDailyPrice = (price: number, duration: number): string => {
  if (duration <= 0) return '0.0';
  return (Math.round((price / duration) * 10) / 10).toString();
};

/** 月均价格（保留 1 位小数，四舍五入） */
export const calculateMonthlyPrice = (price: number, duration: number): string => {
  if (duration <= 0) return '0.0';
  return (Math.round((price / duration) * 30 * 10) / 10).toString();
};

/** 是否显示月均价格（年卡/季卡） */
export const shouldShowMonthlyPrice = (duration: number): boolean =>
  (duration >= 90 && duration <= 93) || (duration >= 364 && duration <= 366);
