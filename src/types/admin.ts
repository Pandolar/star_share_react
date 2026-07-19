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
    invoice_status?: 'not_requested' | 'awaiting_payment' | 'pending_issue' | 'issued' | 'cancelled' | 'payment_exception' | null;
    base_amount?: number | null;
    payable_amount?: number | null;
    paid_amount?: number | null;
    invoice_snapshot?: Record<string, unknown> | null;
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
}

export interface InvoiceRecord {
    id: number;
    order_id: string;
    user_id: number;
    user_email: string;
    package_name: string;
    order_status: 'pending' | 'paid' | 'failed';
    invoice_status: 'awaiting_payment' | 'pending_issue' | 'issued' | 'cancelled' | 'payment_exception';
    base_amount: number;
    surcharge_amount: number;
    payable_amount: number;
    paid_amount: number;
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
}

// 分页数据类型
export interface PaginatedData<T> {
    list: T[];
    total: number;
    current_page: number;
    page_size: number;
} 

// 仪表盘数据类型
export interface DashboardUsers {
    total: number;
    active: number;
    disabled: number;
    with_inviter: number;
    new_today: number;
    new_yesterday: number;
    new_7d: number;
    new_30d: number;
    first_paid_users_today: number;
    first_paid_users_7d: number;
    timeseries_7d_hourly: Array<{ ts: string; count: number }>;
    timeseries_30d_daily: Array<{ date: string; count: number }>;
}

export interface DashboardOrders {
    total: number;
    pending: number;
    paid: number;
    failed: number;
    paid_today: number;
    paid_yesterday: number;
    paid_7d: number;
    paid_30d: number;
    by_hour_7d: Array<{ ts: string; count: number }>;
    by_day_30d: Array<{ date: string; count: number }>;
}

export interface DashboardRevenue {
    total: number;
    today: number;
    yesterday: number;
    last_7d: number;
    last_30d: number;
    by_hour_7d: Array<{ ts: string; amount: number }>;
    by_day_30d: Array<{ date: string; amount: number }>;
    paid_user_count: number;
    arpu: number;
    arppu: number;
    conversion_rate: number; // 0 ~ 1
}

export interface DashboardPackages {
    active_count: number;
    frozen_count: number;
    expired_count: number;
    ways: { purchase?: number; exchange?: number; other?: number };
    active_users_distinct: number;
    top_by_sales: Array<{ package_id: number; package_name: string; count: number }>;
    top_by_revenue: Array<{ package_id: number; package_name: string; amount: number }>;
}

export interface DashboardCDK {
    unused: number;
    used: number;
    disabled: number;
    used_today: number;
    used_7d: number;
}

export interface DashboardMeta {
    generated_at: string; // ISO Asia/Shanghai
}

export interface DashboardData {
    users: DashboardUsers;
    orders: DashboardOrders;
    revenue: DashboardRevenue;
    packages: DashboardPackages;
    cdk: DashboardCDK;
    meta: DashboardMeta;
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
