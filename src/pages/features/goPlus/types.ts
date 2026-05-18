/** GoPlus 页面共享类型 */

export interface OrderInfo {
  trade_no: string;
  order_id: string;
  payment_url: string | null;
  qr_code: string;
  channel: string;
  pay_type: string;
  price: number;
  package_name: string;
}

export interface OrderStatus {
  status: string;
  order_id: string;
  message: string;
}

export type RechargeUiStatus = 'idle' | 'waiting' | 'success' | 'error';

export type RechargeStepType = 'json_input' | 'json_verify' | 'payment' | 'processing' | 'success';

export const RechargeStep = {
  JSON_INPUT: 'json_input' as const,
  JSON_VERIFY: 'json_verify' as const,
  PAYMENT: 'payment' as const,
  PROCESSING: 'processing' as const,
  SUCCESS: 'success' as const,
};

export interface JsonValidationState {
  isJsonValid: boolean;
  hasAllFields: boolean;
  errorMessage?: string;
}

export const formatRemainingTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
