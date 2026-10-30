export type SiteStatus = 'active' | 'paused' | 'pending_approval';
export type SiteBranding = 'white_label' | 'branded';
export type SiteSalesMode = 'cdk' | 'online' | 'hybrid';
export type SiteEditPermission = 'edit_branding' | 'edit_notice' | 'edit_features' | 'edit_prices' | 'edit_packages';
export type SiteCommissionMode = 'rate' | 'margin';
export interface SiteDomainRule { hostname: string; include_subdomains: boolean; }
export type SitePermissions = Partial<Record<SiteEditPermission, boolean>>;
export interface DistributorSite {
  id: number;
  distributor_id: number | null;
  owner_name?: string | null;
  name: string;
  status: SiteStatus;
  branding: SiteBranding;
  sales_mode: SiteSalesMode;
  logo_url: string;
  customer_service_url: string;
  domains: string[];
  domain_rules?: SiteDomainRule[];
  notice_mode: 'inherit' | 'custom' | 'hidden';
  notice: string;
  notice_id: string;
  features: Record<string, boolean>;
  feature_limits: Record<string, boolean>;
  effective_features: Record<string, boolean>;
  permissions: SitePermissions;
  commission_enabled: boolean;
  commission_mode: SiteCommissionMode;
  commission_rate: string;
  allow_reward_stacking: boolean;
  revision: number;
  created_at?: string;
  updated_at?: string;
}
export interface SitePackage {
  package_id: number;
  name: string;
  category: string;
  duration: number;
  main_price: string;
  effective_price: string;
  price_source: string;
  allowed: boolean;
  enabled: boolean;
  custom_price: string | null;
  min_price: string;
  max_price: string | null;
  min_net_amount: string;
  available: boolean;
  unavailable_reason?: string | null;
}
export type SitePackagePatch = Pick<SitePackage, 'package_id'> & Partial<Pick<SitePackage, 'allowed' | 'enabled' | 'custom_price' | 'min_price' | 'max_price' | 'min_net_amount'>>;
export interface SitePackagesPayload { site_revision: number; items: SitePackage[]; }
export interface SiteAuditLog {
  id: number;
  actor_type: string;
  actor_id: string;
  action: string;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
  created_at: string;
}
export interface PageQuery {
  current_page?: number;
  page_size?: number;
  site_id?: number;
  distributor_id?: number;
  status?: string;
  month?: string;
  from_date?: string;
  to_date?: string;
  querystring?: string;
}
export interface SiteOrder {
  id: number;
  order_id: string;
  site_id: number | null;
  distributor_id: number | null;
  source_domain: string | null;
  status: string;
  paid_amount: string;
  payable_amount: string;
  base_amount: string;
  order_type: string;
  user_id: number;
  created_at: string;
  paid_at: string | null;
  commission_mode: SiteCommissionMode | null;
  commission_rate: string | null;
  commission_amount: string;
  commission_base_amount: string;
  commission_status: string | null;
}
export interface CommissionLedger {
  id: number;
  order_id: number;
  site_id: number;
  distributor_id: number;
  kind: 'accrual' | 'refund';
  amount: string;
  basis_amount: string;
  refund_amount: string;
  remark: string;
  created_at: string;
}
export interface CommissionSummary {
  timezone: string;
  period_start: string;
  period_end: string;
  as_of: string;
  distributor_id: number | null;
  distributor_name: string | null;
  site_id: number | null;
  sales_order_count: number;
  sales_amount: string;
  opening_net_commission: string;
  period_commission: string;
  period_refund_commission: string;
  period_refund_amount: string;
  period_net_commission: string;
  closing_net_commission: string;
  lifetime_net_commission: string;
  reconciliation_text: string;
}
export const siteFeatureLabels: Record<string, string> = {
  register: '注册账号', wechat_login: '微信登录', invite: '邀请入口', invite_rewards: '邀请奖励',
  activity: '活动与补偿', about: '关于与教程', customer_service: '客服', team: '组织团队',
  promotion_code: '优惠码', invoice: '开票', cashback_credit: '返现余额抵扣', reset_quota: '配额重置',
};
export const sitePermissionLabels: Record<SiteEditPermission, string> = {
  edit_branding: '品牌与客服', edit_notice: '公告', edit_features: '功能开关',
  edit_prices: '套餐售价', edit_packages: '套餐上下架',
};
