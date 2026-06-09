/** ProfileTab 共享类型 */

export interface UserInfo {
  username: string;
  email: string;
  user_active_packages: {
    package_id: string;
    package_name: string;
    level: string;
    priority: string;
    expiry_date?: string | null;
    status?: 'active' | 'frozen';
    status_text?: string;
    remaining_duration?: number | null;
    remaining_text?: string;
  };
  status: number;
  inviter_user: string;
  created_at: string;
  wechat_openid?: string;
  preferences?: {
    payment_info?: {
      type: string;
      real_name: string;
      account: string;
      updated_at?: string;
    };
  };
}

export type EditTabKey = 'username' | 'email' | 'password' | 'payment_info';
