import config from '../config';
import { getCookie } from '../utils/cookies';

// 请求响应类型定义
interface ApiResponse<T = any> {
    code: number;
    msg: string;
    data: T;
    total?: number;
}

// 请求配置接口
interface RequestConfig extends RequestInit {
    timeout?: number;
}

// 统一使用 utils/cookies 中的实现（支持解码，且与域名策略一致）

// 获取用户认证信息
const getUserAuthHeaders = (): { [key: string]: string } => {
    const xuserid = getCookie('xuserid');
    const xtoken = getCookie('xtoken');
    const xy_uuid_token = getCookie('xy_uuid_token');
    const headers: { [key: string]: string } = {};

    if (xuserid) {
        headers['xuserid'] = xuserid;
    }

    if (xtoken) {
        headers['xtoken'] = xtoken;
    }

    if (xy_uuid_token) {
        headers['xy_uuid_token'] = xy_uuid_token;
    }

    return headers;
};

// 创建用户端请求函数
async function createUserRequest(
    url: string,
    options: RequestConfig = {}
): Promise<ApiResponse> {
    const {
        timeout = config.api.timeout,
        ...fetchOptions
    } = options;

    // 准备请求头
    const headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
        'X-Site-Domain': window.location.hostname, // 白牌模式判定：携带客户实际访问域名
        ...getUserAuthHeaders(), // 添加用户认证头
        ...(fetchOptions.headers as any || {}),
    };

    // 创建超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            headers,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 处理HTTP错误
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // 触发全局认证失败处理（HTTP层鉴权失败）
                const event = new CustomEvent('authFailure', {
                    detail: { message: '登录状态已过期' }
                });
                window.dispatchEvent(event);
            }
            throw new Error(`HTTP Error: ${response.status}`);
        }

        // 解析响应数据
        const data: ApiResponse = await response.json();

        // 检查业务错误码
        if (data.code !== undefined && data.code !== 20000) {
            // 仅当为 20009（登录过期）时触发全局登录失效
            if (Number(data.code) === 20009) {
                const event = new CustomEvent('authFailure', {
                    detail: {
                        message: data.msg || '登录状态已过期，请重新登录',
                        code: data.code
                    }
                });
                window.dispatchEvent(event);
                throw new Error(data.msg || '请求失败');
            }
            // 其他非20000的业务错误，直接返回给调用方处理
            return data;
        }

        return data;
    } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                throw new Error('请求超时');
            }
            throw error;
        }

        throw new Error('网络错误');
    }
}

// 获取用户端API URL
const getUserApiUrl = (path: string): string => {
    const baseUrl = config.api.baseURL.endsWith('/') ? config.api.baseURL.slice(0, -1) : config.api.baseURL;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
};

// 用户认证管理
export const userAuthApi = {
    // 检查是否已登录
    isAuthenticated: (): boolean => {
        const xuserid = getCookie('xuserid');
        const xtoken = getCookie('xtoken');
        const xy_uuid_token = getCookie('xy_uuid_token');
        return !!(xuserid && xtoken && xy_uuid_token);
    },
};

// 公告API
export const announcementApi = {
    // 获取公告信息
    getPublicInfo: async (): Promise<ApiResponse<{ notice: string }>> => {
        return createUserRequest(getUserApiUrl('/u/get_public_info'), {
            method: 'GET',
        });
    },

    // 获取公告信息和Home页面配置信息
    getPublicAndHomeInfo: async (): Promise<ApiResponse<{
        notice: string;
        home_info: import('../types/homeInfo').HomeInfo;
    }>> => {
        return createUserRequest(getUserApiUrl('/u/get_public_info'), {
            method: 'GET',
        });
    },
};

// 站点模式API（自营/白牌）
export const siteModeApi = {
    // 获取当前站点模式，依据访问域名由后端判定
    getSiteMode: async (): Promise<ApiResponse<{
        mode: 'normal' | 'whitelabel';
        is_white_label: boolean;
        enable_register?: boolean;
        enable_wechat_login?: boolean;
        enable_promotion_code?: boolean;
        notice?: string;
        notice_id?: string;
        purchase_url?: string;
        customer_service_url?: string;
        subscription_notice?: string;
    }>> => {
        return createUserRequest(getUserApiUrl('/u/get_site_mode'), {
            method: 'GET',
        });
    },
};

// 用户信息API
export const userInfoApi = {
    // 获取用户信息
    getUserInfo: async (): Promise<ApiResponse<{
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
    }>> => {
        return createUserRequest(getUserApiUrl('/u/get_user_info'), {
            method: 'GET',
        });
    },

    // 发送邮箱验证码
    sendEmailCode: async (email: string): Promise<ApiResponse<any>> => {
        return createUserRequest(getUserApiUrl('/u/send_email'), {
            method: 'POST',
            body: JSON.stringify({
                email,
                type_: 'register'
            }),
        });
    },

    // 修改用户信息
    changeUserInfo: async (params: {
        change_type: 'username' | 'email' | 'password' | 'payment_info' | 'billing_profile';
        username?: string;
        email?: string;
        email_code?: string;
        // 为 change_type='password' 增加字段
        old_password?: string; // base64 编码
        password?: string;     // base64 编码（新密码）
        // 为 change_type='payment_info' 增加字段
        payment_info?: {
            real_name: string;
            account: string;
        };
        billing_profile?: {
            title: string;
            tax_number: string;
            confirmed: boolean;
        };
    }): Promise<ApiResponse<any>> => {
        return createUserRequest(getUserApiUrl('/u/change_user_info'), {
            method: 'POST',
            body: JSON.stringify(params),
        });
    },

    // 微信绑定
    wechatBind: async (params: {
        is_bind: boolean;
        wechat_temp_token: string;
        xuserid?: number;
        xtoken?: string;
    }): Promise<ApiResponse<any>> => {
        return createUserRequest(getUserApiUrl('/u/wechat_bind'), {
            method: 'POST',
            body: JSON.stringify(params),
        });
    },
};

// 补偿活动API
export interface CompensationItem {
    id: string;
    title: string;
    days: number;
    level_mode: 'fixed' | 'follow';
    level: string | null;
    category: string;
    expires_at?: string;
    claimable: boolean;
    reason: string;
}

export const compensationApi = {
    // 获取当前用户可领取的补偿活动
    getAvailable: async (): Promise<ApiResponse<CompensationItem[]>> => {
        return createUserRequest(getUserApiUrl('/u/compensation_available'), {
            method: 'GET',
        });
    },

    // 领取补偿
    claim: async (campaign_id: string): Promise<ApiResponse<any>> => {
        return createUserRequest(getUserApiUrl('/u/compensation_claim'), {
            method: 'POST',
            body: JSON.stringify({ campaign_id }),
        });
    },
};

export interface PackageInfoResponse {
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

export interface InvoiceEligibility {
    eligible: boolean;
    reason: 'invoice_disabled' | 'below_threshold' | 'email_unbound' | 'email_not_allowed' | 'billing_profile_missing' | 'non_self_site' | null;
    original_amount: string;
    min_package_amount: string;
    discount_amount: string;
    promotion_code: string | null;
    base_amount: string;
    surcharge_rate: string;
    surcharge_amount: string;
    payable_amount: string;
    delivery_workdays: number;
    email: string;
    billing_profile: { title: string; tax_number: string } | null;
}

// 套餐API
export const packageUserApi = {
    getPackages: async (): Promise<ApiResponse<PackageInfoResponse[]>> => {
        return createUserRequest(getUserApiUrl('/u/package'), {
            method: 'GET',
        });
    },
};

export interface CreateOrderOptions {
    device?: 'mobile' | 'pc';
    invoice_requested?: boolean;
    checkout_id?: string;
    promotion_code?: string;
    replace_checkout_id?: string;
}

export interface PromotionOrderSnapshot {
    code: string;
    name: string;
    discount_type: 'rate' | 'fixed';
    discount_value: number;
    scope_type: 'all' | 'packages' | 'levels';
    original_amount: string;
    discount_amount: string;
    discounted_amount: string;
}

export interface InvoiceOrderSnapshot {
    title: string;
    tax_number: string;
    email: string;
    original_amount: string;
    discount_amount: string;
    promotion_code: string | null;
    base_amount: string;
    surcharge_rate: string;
    surcharge_amount: string;
    payable_amount: string;
    delivery_workdays: number;
}

// 订单API
export const orderUserApi = {
    createOrder: async (package_id: number, extraData?: CreateOrderOptions): Promise<ApiResponse<{
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
        invoice_snapshot?: InvoiceOrderSnapshot | null;
        discount_amount?: string;
        promotion_code?: string | null;
        promotion_snapshot?: PromotionOrderSnapshot | null;
        expires_at?: string | null;
        expires_in_seconds?: number;
    }>> => {
        return createUserRequest(getUserApiUrl('/u/pay_order'), {
            method: 'POST',
            body: JSON.stringify({ package_id, ...extraData }),
        });
    },

    getInvoiceEligibility: async (package_id: number, promotion_code?: string, checkout_id?: string): Promise<ApiResponse<InvoiceEligibility>> => {
        const query = new URLSearchParams({ package_id: String(package_id) });
        if (promotion_code) query.set('promotion_code', promotion_code);
        if (checkout_id) query.set('checkout_id', checkout_id);
        return createUserRequest(getUserApiUrl(`/u/invoice/eligibility?${query.toString()}`), {
            method: 'GET',
        });
    },

    getCheckoutStatus: async (checkout_id: string): Promise<ApiResponse<{
        paid: boolean;
        winning_order_id: string | null;
        invoice_requested: boolean | null;
        expires_at?: string | null;
        expires_in_seconds?: number;
        orders: Array<{ order_id: string; invoice_requested: boolean; status: string }>;
    }>> => {
        return createUserRequest(getUserApiUrl(`/u/checkout_status?checkout_id=${encodeURIComponent(checkout_id)}`), {
            method: 'GET',
        });
    },

    cancelCheckout: async (checkout_id: string): Promise<ApiResponse<{ cancelled: boolean }>> => {
        return createUserRequest(getUserApiUrl('/u/checkout_cancel'), {
            method: 'POST',
            body: JSON.stringify({ checkout_id }),
        });
    },

    getOrders: async (): Promise<ApiResponse<Array<{
        order_id: string;
        package_id: number;
        package_name: string;
        status: string;
        created_at: string;
        invoice_requested: boolean;
        invoice_status?: string | null;
        payable_amount?: number | null;
    }>>> => {
        return createUserRequest(getUserApiUrl('/u/pay_order'), {
            method: 'GET',
        });
    },

    // 查询订单支付状态
    getPayStatus: async (order_id: string): Promise<ApiResponse<{}>> => {
        return createUserRequest(getUserApiUrl(`/u/get_pay_status?order_id=${order_id}`), {
            method: 'GET',
        });
    },

    // 强制查询订单支付状态
    forceGetPayStatus: async (order_id: string): Promise<ApiResponse<{}>> => {
        return createUserRequest(getUserApiUrl(`/u/force_get_pay_status?order_id=${order_id}`), {
            method: 'GET',
        });
    },
};

// 兑换激活码API
export const exchangeUserApi = {
    // 兑换CDK
    exchangeCdk: async (cdk: string): Promise<ApiResponse<any>> => {
        return createUserRequest(getUserApiUrl('/u/exchange_cdk'), {
            method: 'POST',
            body: JSON.stringify({ cdk }),
        });
    },
};

// 付费重置配额API
export const resetQuotaApi = {
    // 获取重置配额展示信息（是否开放、价格、当前用户是否可重置）
    getInfo: async (): Promise<ApiResponse<{
        enabled: boolean;
        eligible: boolean;
        price: number;
        package_name?: string;
    }>> => {
        return createUserRequest(getUserApiUrl('/u/reset_quota_info'), {
            method: 'GET',
        });
    },

    // 创建重置配额订单（支付成功后清空本周期配额）
    createOrder: async (extraData?: any): Promise<ApiResponse<{
        success: boolean;
        trade_no: string;
        order_id: string;
        payment_url: string | null;
        qr_code: string;
        channel: string;
        pay_type: string;
    }>> => {
        return createUserRequest(getUserApiUrl('/u/reset_quota_order'), {
            method: 'POST',
            body: JSON.stringify({ ...extraData }),
        });
    },
};



// 邀请相关API
export const inviteUserApi = {
    getOverview: async (): Promise<ApiResponse<{
        inviter_id: number;
        inviter_code: string;
        invite_link: string;
        invite_eligible: boolean;
        history_package_value: number;
        min_history_package_value: number;
        invite_ineligible_reason: string;
        invitees_count: number;
        granted_orders_count: number;
        total_duration_days: number;
        cash_summary?: {
            available_amount: number;
            withdraw_pending_amount: number;
            withdraw_done_amount: number;
        };
        reward_policy_summary?: {
            reward_mode: 'duration' | 'cash';
            reward_ratio: number;
            reward_ratio_percent: number;
            invitee_reward_ratio?: number;
            invitee_reward_ratio_percent?: number;
            has_package_specific_rules: boolean;
            min_reward_duration_days: number;
        };
    }>> => {
        return createUserRequest(getUserApiUrl('/u/invite_overview'), {
            method: 'GET',
        });
    },

    getRecords: async (): Promise<ApiResponse<{
        inviter_id: number;
        invitees_count: number;
        invitees: Array<{
            user_id: number;
            masked: string;
            created_at: string;
            orders_by_package: Array<{ package_name: string; count: number }>;
            orders: Array<{
                order_id: string;
                package_id: number;
                package_name: string;
                package_price: number;
                reward_mode?: string;
                reward_status?: string;
                reward_ratio?: number | null;
                reward_amount?: number;
                reward_days?: number;
                reward_order_index?: number | null;
                created_at: string;
            }>;
            total_reward_amount?: number;
            total_reward_days?: number;
        }>;
    }>> => {
        return createUserRequest(getUserApiUrl('/u/get_inviter_data'), {
            method: 'GET',
        });
    },
};

// 额度使用详情类型
export interface LimitUsageItem {
    scope: 'model' | 'group' | 'default';
    name: string;
    mode: 'fixed' | 'sliding';
    mode_label: string;
    limit: number;
    used: number;
    remaining: number;
    window: string;
    reset_in_seconds: number | null;
    reset_in: string | null;
    models: string[];
    model_costs: Record<string, number>;
}

export interface LimitUsageData {
    package_level: string;
    limits: LimitUsageItem[];
    usage_note?: string;
}

// 额度使用API
export const limitUsageApi = {
    // 获取当前用户额度使用详情
    getUsage: async (): Promise<ApiResponse<LimitUsageData>> => {
        return createUserRequest(getUserApiUrl('/u/limit_usage'), {
            method: 'GET',
        });
    },
};

// 导出所有用户端API
const userApi = {
    auth: userAuthApi,
    announcement: announcementApi,
    userInfo: userInfoApi,
    package: packageUserApi,
    order: orderUserApi,
    exchange: exchangeUserApi,
    invite: inviteUserApi,
    limitUsage: limitUsageApi,
};

export default userApi; 
