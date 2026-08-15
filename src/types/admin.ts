/**
 * 管理后台相关类型定义
 */

// 通用响应接口
export interface AdminApiResponse<T = any> {
    code: number;
    msg: string;
    data: T;
    total?: number;
}

// 通用查询参数
export interface CommonQueryParams {
    querystring?: string;
    current_page?: number;
    page_size?: number;
    order_column?: string;
    order?: 'asc' | 'desc';
}

export interface AuditLogCatalogItem {
    type: string;
    label: string;
    group: string;
    description: string;
    count: number;
}

export type AuditLogRetentionMode = 'forever' | 'days' | 'count';

export interface AuditLogRetentionRule {
    mode: Exclude<AuditLogRetentionMode, 'forever'>;
    value: number;
}

export type AuditLogRetentionPolicy = Record<string, AuditLogRetentionRule>;

export interface AuditLogRecord {
    id: number;
    type: string;
    type_label: string;
    user_id: number | null;
    ref_id: number | null;
    created_at: string | null;
    data: Record<string, unknown>;
}

export interface AuditLogQueryParams extends CommonQueryParams {
    type?: string;
    user_id?: number;
    ref_id?: number;
}

export interface AuditLogResponseData {
    list: AuditLogRecord[];
    catalog: AuditLogCatalogItem[];
    retention: AuditLogRetentionPolicy;
}

// 套餐管理相关类型
export interface Package {
    id: number;
    package_name: string;
    category: string;
    price: string;
    duration: number;
    introduce?: string;
    level: string;
    priority: number;
    status: 0 | 1;
    remarks?: string;
    created_at?: string;
    updated_at?: string;
}

export interface CreatePackageRequest {
    package_name: string;
    category: string;
    price: number;
    duration: number;
    level: string;
    priority: number;
    introduce?: string;
    status?: 0 | 1;
    remarks?: string;
}

export interface UpdatePackageRequest {
    id: number;
    package_name?: string;
    category?: string;
    price?: number;
    duration?: number;
    level?: string;
    priority?: number;
    introduce?: string;
    status?: 0 | 1;
    remarks?: string;
}

export interface PackageQueryParams extends CommonQueryParams {
    id?: number;
    package_name?: string;
    category?: string;
    price?: number;
    duration?: number;
    level?: string;
    priority?: number;
    status?: 0 | 1;
}

// 用户管理相关类型
export interface InvitePolicyOverride {
    enabled?: boolean;
    reward_mode?: 'duration' | 'cash';
    reward_ratio?: number;
    max_reward_order_count?: number;
    min_withdraw_amount?: number;
    package_rules?: Record<string, {
        reward_mode?: 'duration' | 'cash';
        reward_ratio?: number;
        max_reward_order_count?: number;
        min_withdraw_amount?: number;
    }>;
}

export interface User {
    id: number;
    username?: string;
    email: string;
    tel?: string;
    created_at: string;
    status: 0 | 1;
    preferences?: Record<string, any>;
    inviter_user?: number | string;
    inviter_code?: string;
    invite_bound_at?: string;
    remarks?: string;
    xy_uuid_token?: string;
    wechat_openid?: string;
    inviter?: AdminUserSummary | null;
    membership?: {
        status: 'active' | 'frozen' | 'free';
        package_id?: number | null;
        package_name?: string | null;
        category?: string | null;
        level: string;
        expires_at?: string | null;
        remaining_minutes?: number | null;
        active_count: number;
        frozen_count: number;
    };
    cash_summary?: {
        paid_orders: number;
        paid_amount: number;
    };
}

export interface CreateUserRequest {
    email: string;
    password: string;
    username?: string;
    preferences?: Record<string, any>;
    status?: 0 | 1;
    inviter_user?: number;
    invite_policy_override?: InvitePolicyOverride | Record<string, any>;
    remarks?: string;
}

export interface UpdateUserRequest {
    id: number;
    username?: string;
    email?: string;
    preferences?: Record<string, any>;
    status?: 0 | 1;
    inviter_user?: number;
    invite_policy_override?: InvitePolicyOverride | Record<string, any>;
    remarks?: string;
}

export interface UserQueryParams extends CommonQueryParams {
    id?: number;
    username?: string;
    email?: string;
    status?: 0 | 1;
    inviter_user?: number;
    preferences?: Record<string, any>;
    remarks?: string;
}

export interface AdminUserSummary {
    id: number;
    username?: string | null;
    email?: string | null;
    tel?: string | null;
    status: 0 | 1;
    created_at?: string | null;
}

export interface AdminPackageSummary {
    id: number;
    package_name: string;
    category: string;
    level: string;
    price: number;
    duration: number;
    priority: number;
    status: 0 | 1;
    introduce?: string | null;
    remarks?: string | null;
}

export interface RelatedOrderSummary {
    id: number;
    order_id: string;
    trade_no?: string | null;
    status: 'pending' | 'paid' | 'failed';
    base_amount?: number | null;
    payable_amount?: number | null;
    paid_amount?: number | null;
    paid_at?: string | null;
}

// 用户套餐记录类型
export interface UserPackage {
    id: number;
    user_id: number;
    package_id: number;
    order_id?: string;
    created_at: string;
    status: 'active' | 'frozen' | 'expired';
    way?: string;
    remaining_duration?: number;
    remarks?: string;
    user?: AdminUserSummary | null;
    package?: AdminPackageSummary | null;
    related_order?: RelatedOrderSummary | null;
}

export interface UserPackageQueryParams extends CommonQueryParams {
    id?: number;
    user_id?: number;
    package_id?: number;
    created_at?: string;
    status?: 'active' | 'frozen' | 'expired';
    remaining_duration?: number;
    remarks?: string;
}

// CDK管理相关类型
export interface CDK {
    id: number;
    cdk: string;
    status: 'used' | 'unused' | 'disabled';
    created_at: string;
    used_at?: string;
    user_id?: number;
    user_username?: string;
    user_email?: string;
    package_id: number;
    package_name?: string;
    remarks?: string;
    expires_at?: string | null;
    distributor_id?: number | null;
    distributor_name?: string;
    batch_id?: string | null;
    max_uses?: number;
    use_count?: number;
    created_by?: string;
    latest_source_domain?: string | null;
    redemption_count?: number;
}

export interface SourceDomainStats {
    total: number;
    domains: Array<{ domain: string | null; label: string; count: number }>;
}

export interface CreateCDKRequest {
    number: number;
    package_id: number;
    status?: 'used' | 'unused' | 'disabled';
    remarks?: string;
    expires_days?: number;       // 有效期天数（0=永不过期）
    distributor_id?: number | null;  // 归属分销商（null=自营）
    prefix?: string;             // CDK前缀
    max_uses?: number;           // 每码可用次数
}

export interface UpdateCDKRequest {
    id: number;
    status?: 'used' | 'unused' | 'disabled';
    package_id?: number;
    remarks?: string;
    expires_days_extend?: number;  // 延期天数
}

export interface CDKQueryParams extends CommonQueryParams {
    id?: number;
    cdk?: string;
    status?: 'used' | 'unused' | 'disabled';
    created_at?: string;
    used_at?: string;
    user_id?: number;
    package_id?: number;
    distributor_id?: number;
    batch_id?: string;
    is_expired?: boolean;
    remarks?: string;
    source_domain?: string;
}

export type ArticleStatus = 'draft' | 'published';

export interface ArticleSummary {
    identifier: string;
    title: string;
    description: string;
    status: ArticleStatus;
    created_at: string;
    updated_at: string;
    published_at?: string | null;
    revision: string;
}

export interface Article extends ArticleSummary {
    version: 1;
    format: 'markdown';
    content: string;
}

export interface SaveArticleRequest {
    identifier: string;
    title: string;
    description?: string;
    content: string;
    status: ArticleStatus;
    revision?: string;
}

// 系统配置相关类型
export interface SystemConfig {
    id: number;
    key: string;
    value: string;
    description: string;
    group: string;
    editable: boolean;
    type: 'str' | 'int' | 'bool' | 'json';
    required: boolean;
    created_at: string;
    updated_at: string;
}

export interface UpdateConfigRequest {
    key: string;
    value: string;
}

// 订单管理相关类型
export interface Order {
    id: number;
    user_id: number;
    package_id: number;
    order_id: string;
    trade_no?: string;
    created_at: string;
    status: 'pending' | 'paid' | 'failed';
    way?: string;
    remarks?: string;
    invoice_requested?: boolean;
    invoice_status?: 'not_requested' | 'awaiting_payment' | 'pending_issue' | 'processing' | 'issued' | 'cancelled' | 'payment_exception' | null;
    base_amount?: number | null;
    payable_amount?: number | null;
    paid_amount?: number | null;
    invoice_snapshot?: Record<string, unknown> | null;
    promotion_code?: string | null;
    discount_amount?: number | null;
    promotion_snapshot?: Record<string, unknown> | null;
    user?: AdminUserSummary | null;
    package?: AdminPackageSummary | null;
    source_domain?: string | null;
    cdk_id?: number | null;
}

export interface UpdateOrderRequest {
    id: number;
    status?: 'pending' | 'paid' | 'failed';
    remarks?: string;
}

export interface OrderQueryParams extends CommonQueryParams {
    id?: number;
    user_id?: number;
    package_id?: number;
    order_id?: string;
    status?: 'pending' | 'paid' | 'failed';
    created_at?: string;
    way?: string;
    remarks?: string;
    source_domain?: string;
}
export interface InvoiceRecord {
    id: number;
    order_id: string;
    user_id: number;
    user_email: string;
    package_name: string;
    order_status: 'pending' | 'paid' | 'failed';
    invoice_status: 'awaiting_payment' | 'pending_issue' | 'processing' | 'issued' | 'cancelled' | 'payment_exception';
    base_amount: number;
    surcharge_amount: number;
    payable_amount: number;
    paid_amount: number;
    discount_amount?: number;
    invoice_base_amount?: number;
    promotion_code?: string | null;
    title: string;
    tax_number: string;
    delivery_workdays?: number;
    created_at?: string | null;
    paid_at?: string | null;
    invoice_issued_at?: string | null;
    remarks?: string | null;
    invoice_status_history?: Array<{
        from: string;
        to: string;
        at: string;
    }>;
}

export interface InvoiceQueryParams extends CommonQueryParams {
    invoice_status?: string;
    order_status?: string;
    ids?: string;
}

export type AdminTeamStatus = 'pending' | 'active' | 'expired' | 'cancelled';
export type AdminTeamMemberStatus = 'invited' | 'active' | 'suspended' | 'removed' | 'left';

export interface AdminTeamUserSummary {
    id: number;
    username?: string | null;
    email?: string | null;
    status?: number;
}

export interface AdminTeamPackageSummary {
    id: number;
    package_name: string;
    category: string;
    level: string;
    price: number;
    duration: number;
}

export interface AdminTeamMemberCounts {
    active: number;
    suspended: number;
    invited: number;
    removed: number;
    left: number;
}

export interface AdminTeamRecord {
    id: number;
    team_name: string;
    owner: AdminTeamUserSummary | null;
    package: AdminTeamPackageSummary | null;
    seat_count: number;
    status: AdminTeamStatus;
    starts_at?: string | null;
    expires_at?: string | null;
    pending_package_id?: number | null;
    pending_seat_count?: number | null;
    pending_effective_at?: string | null;
    member_counts: AdminTeamMemberCounts;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface AdminTeamMember {
    id: number;
    user_id: number;
    username?: string | null;
    email?: string | null;
    role: 'owner' | 'member';
    status: AdminTeamMemberStatus;
    inviter?: AdminTeamUserSummary | null;
    invited_at?: string | null;
    invite_expires_at?: string | null;
    joined_at?: string | null;
    left_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface AdminTeamOrder {
    id: number;
    order_id: string;
    order_type: 'team_initial' | 'team_change' | 'team_renewal';
    status: 'pending' | 'paid' | 'failed';
    package_id: number;
    old_package_id?: number | null;
    new_package_id?: number | null;
    old_seat_count?: number | null;
    new_seat_count?: number | null;
    payable_amount?: number | null;
    paid_amount?: number | null;
    paid_at?: string | null;
    created_at?: string | null;
}

export interface AdminTeamDetailData {
    team: AdminTeamRecord;
    pending_package: AdminTeamPackageSummary | null;
    members: AdminTeamMember[];
    orders: AdminTeamOrder[];
}

export interface AdminTeamQueryParams extends CommonQueryParams {
    status?: AdminTeamStatus;
    package_id?: number;
}

// 分页数据类型
export interface PaginatedData<T> {
    list: T[];
    total: number;
    current_page: number;
    page_size: number;
} 

// 可筛选运营总览
export interface DashboardQueryParams {
    start_date?: string;
    end_date?: string;
    granularity?: 'auto' | 'hour' | 'day';
    package_id?: number;
    user_status?: 'all' | 'active' | 'disabled';
}

export interface DashboardPeriod {
    start_date: string;
    end_date: string;
    previous_start_date: string;
    previous_end_date: string;
    granularity: 'hour' | 'day';
    package_id: number | null;
    user_status: 'all' | 'active' | 'disabled';
    timezone: string;
}

export interface DashboardSummary {
    new_users: number;
    paid_orders: number;
    revenue: number;
    paid_users: number;
    first_paid_users: number;
    package_grants: number;
    cdk_redemptions: number;
    average_order_value: number;
    arppu: number;
    payment_success_rate: number;
    repeat_purchase_rate: number;
    new_user_paid_conversion: number;
}

export interface DashboardTrendPoint {
    bucket: string;
    new_users: number;
    paid_orders: number;
    revenue: number;
    paid_users: number;
    first_paid_users: number;
    package_grants: number;
    cdk_redemptions: number;
    average_order_value: number;
}

export interface DashboardPackagePerformance {
    package_id: number;
    package_name: string;
    category: string;
    level: string;
    paid_orders: number;
    revenue: number;
    average_order_value: number;
}

export interface DashboardInventory {
    total_users: number;
    active_users: number;
    disabled_users: number;
    active_package_records: number;
    active_package_users: number;
    frozen_package_records: number;

    unused_cdks: number;
    disabled_cdks: number;
    pending_orders: number;
    packages_on_sale: number;
    lifetime_paid_orders: number;
    lifetime_paid_users: number;
    lifetime_revenue: number;
}

export interface DashboardData {
    period: DashboardPeriod;
    summary: DashboardSummary;
    previous_summary: DashboardSummary;
    trend: DashboardTrendPoint[];
    previous_trend: DashboardTrendPoint[];
    dimensions: {
        order_status: Array<{ key: 'pending' | 'paid' | 'failed'; label: string; count: number }>;
        acquisition_sources: Array<{ key: 'purchase' | 'exchange' | 'other'; label: string; count: number }>;
        top_packages: DashboardPackagePerformance[];
    };
    inventory: DashboardInventory;
    package_options: Array<{
        id: number;
        package_name: string;
        category: string;
        level: string;
        status: 0 | 1;
    }>;
    meta: {
        generated_at: string;
        max_range_days: number;
        revenue_definition: string;
        package_filter_note: string;
    };
}


export interface InvitePolicyConfig {
    enabled: boolean;
    bind_only_on_register: boolean;
    reward_only_paid_purchase: boolean;
    exclude_exchange_orders: boolean;
    default_policy: {
        reward_mode: 'duration' | 'cash';
        reward_ratio: string | number;
        max_reward_order_count: number;
        min_withdraw_amount: string | number;
    };
    package_rules: Record<string, any>;
}

export interface InvitePolicyResponseData {
    policy: InvitePolicyConfig;
    docs?: Record<string, any>;
}

export interface InviteRewardRecord {
    id: number;
    order_id: string;
    user_id: number;
    invitee_email?: string;
    inviter_id: number;
    package_id: number;
    package_name: string;
    package_price: number;
    status: 'pending' | 'paid' | 'failed';
    invite_reward_status?: string;
    invite_reward_mode?: 'duration' | 'cash';
    invite_reward_ratio?: number | null;
    invite_reward_order_index?: number | null;
    invite_reward_days?: number;
    invite_reward_amount?: number;
    invite_reward_processed_at?: string | null;
    invite_withdraw_ticket_id?: number | null;
    created_at: string;
    invite_reward_meta?: Record<string, any>;
    invite_reward_remark?: string;
}

export interface InviteRewardQueryParams extends CommonQueryParams {
    inviter_id?: number;
    user_id?: number;
    invite_reward_status?: string;
    invite_reward_mode?: 'duration' | 'cash';
}

export interface WorkOrder {
    id: number;
    user_id: number;
    ticket_type: string;
    status: string;
    title: string;
    content?: string;
    amount?: number;
    extra_data?: Record<string, any>;
    admin_remark?: string;
    handled_admin?: string;
    handled_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface WorkOrderQueryParams extends CommonQueryParams {
    ticket_type?: string;
    status?: string;
    user_id?: number;
}

export interface UpdateWorkOrderRequest {
    id: number;
    status?: string;
    admin_remark?: string;
}
