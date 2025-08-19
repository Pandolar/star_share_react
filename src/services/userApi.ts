import config from '../config';

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

// 从cookies中获取指定名称的值
const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop()?.split(';').shift() || null;
    }
    return null;
};

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
            expiry_date: string;
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
        change_type: 'username' | 'email';
        username?: string;
        email?: string;
        email_code?: string;
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

// 套餐API
export const packageUserApi = {
    // 获取套餐列表
    getPackages: async (): Promise<ApiResponse<Array<{
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
    }>>> => {
        return createUserRequest(getUserApiUrl('/u/package'), {
            method: 'GET',
        });
    },
};

// 订单API
export const orderUserApi = {
    // 创建订单
    createOrder: async (package_id: number): Promise<ApiResponse<{
        success: boolean;
        trade_no: string;
        order_id: string;
        payment_url: string | null;
        qr_code: string;
        channel: string;
        pay_type: string;
    }>> => {
        return createUserRequest(getUserApiUrl('/u/pay_order'), {
            method: 'POST',
            body: JSON.stringify({ package_id }),
        });
    },

    // 获取订单列表
    getOrders: async (): Promise<ApiResponse<Array<{
        order_id: string;
        package_id: number;
        package_name: string;
        status: string;
        created_at: string;
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

// 导出所有用户端API
const userApi = {
    auth: userAuthApi,
    announcement: announcementApi,
    userInfo: userInfoApi,
    package: packageUserApi,
    order: orderUserApi,
    exchange: exchangeUserApi,
};

export default userApi; 