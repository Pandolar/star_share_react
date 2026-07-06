import axios, { AxiosInstance } from 'axios';

/**
 * 分销商 API 响应格式
 */
export interface DistributorApiResponse<T = any> {
    code: number;
    msg?: string;
    data?: T;
}

/**
 * 分销商信息
 */
export interface DistributorInfo {
    id: number;
    username: string;
    status: number;
    domains: string;
    notice: string;
    notice_id: string;
    purchase_url: string;
    customer_service_url: string;
    remarks: string;
    balance?: number;
    level?: number;
    default_cdk_expire_days?: number;
    permissions?: DistributorPermissions;
    created_at: string;
    updated_at: string;
}

/**
 * 分销商权限
 */
export interface DistributorPermissions {
    can_login: boolean;
    can_generate_cdk: boolean;
    can_edit_notice: boolean;
    can_edit_links: boolean;
}

/**
 * 登录请求
 */
export interface DistributorLoginRequest {
    username: string;
    password: string;
}

/**
 * 登录响应
 */
export interface DistributorLoginResponse {
    dtoken: string;
    distributor_id: number;
    username: string;
    balance?: number;
    level?: number;
    permissions?: DistributorPermissions;
}

/**
 * 配置请求
 */
export interface DistributorSettingsRequest {
    notice?: string;
    purchase_url?: string;
    customer_service_url?: string;
}

/**
 * 修改密码请求
 */
export interface DistributorChangePasswordRequest {
    old_password: string;
    new_password: string;
}

/**
 * 可生成套餐（含折后单价）
 */
export interface DistributorPackage {
    package_id: number;
    package_name: string;
    category: string;
    level: string;
    duration: number;
    base_price: number;
    discount_rate: number;
    unit_price: number;
}

/**
 * 生成CDK请求
 */
export interface DistributorGenerateRequest {
    package_id: number;
    number: number;
    expires_days?: number | null;
    remarks?: string;
}

/**
 * 生成CDK响应
 */
export interface DistributorGenerateResponse {
    batch_id: string;
    count: number;
    unit_price: number;
    total_cost: number;
    balance_after: number;
    discount_rate: number;
}

/**
 * 余额流水
 */
export interface BalanceLog {
    id: number;
    change_amount: number;
    balance_after: number;
    type: string;
    batch_id?: string | null;
    operator?: string | null;
    remarks?: string | null;
    created_at: string;
}

/**
 * 分销商 API 服务类
 */
class DistributorApiService {
    private api: AxiosInstance;

    constructor() {
        this.api = axios.create({
            baseURL: '/star/distributor',
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // 请求拦截器：自动添加 dtoken
        this.api.interceptors.request.use(
            (config) => {
                const dtoken = localStorage.getItem('dtoken');
                if (dtoken) {
                    config.headers['dtoken'] = dtoken;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // 响应拦截器：处理401未授权
        this.api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    // dtoken 失效，清除并跳转登录
                    localStorage.removeItem('dtoken');
                    localStorage.removeItem('distributor');
                    window.location.href = '/distributor/login';
                }
                return Promise.reject(error);
            }
        );
    }

    /**
     * 分销商登录
     */
    async login(data: DistributorLoginRequest): Promise<DistributorApiResponse<DistributorLoginResponse>> {
        const response = await this.api.post('/login', data);
        return response.data;
    }

    /**
     * 获取分销商配置
     */
    async getSettings(): Promise<DistributorApiResponse<DistributorInfo>> {
        const response = await this.api.get('/settings');
        return response.data;
    }

    /**
     * 更新分销商配置
     */
    async updateSettings(data: DistributorSettingsRequest): Promise<DistributorApiResponse> {
        const response = await this.api.put('/settings', data);
        return response.data;
    }

    /**
     * 修改密码
     */
    async changePassword(data: DistributorChangePasswordRequest): Promise<DistributorApiResponse> {
        const response = await this.api.put('/change_password', data);
        return response.data;
    }

    /**
     * 获取可生成套餐及折后单价
     */
    async getPackages(): Promise<DistributorApiResponse<DistributorPackage[]>> {
        const response = await this.api.get('/packages');
        return response.data;
    }

    /**
     * 用余额自助生成CDK
     */
    async generateCdk(data: DistributorGenerateRequest): Promise<DistributorApiResponse<DistributorGenerateResponse>> {
        const response = await this.api.post('/generate_cdk', data);
        return response.data;
    }

    /**
     * 查看自己的余额及流水
     */
    async getMyBalance(params: { current_page?: number; page_size?: number } = {}): Promise<DistributorApiResponse<{ balance: number; logs: BalanceLog[]; total: number }>> {
        const response = await this.api.get('/my_balance', { params });
        return response.data;
    }

    /**
     * 登出
     */
    logout() {
        localStorage.removeItem('dtoken');
        localStorage.removeItem('distributor');
        window.location.href = '/distributor/login';
    }

    /**
     * 检查是否已登录
     */
    isLoggedIn(): boolean {
        return !!localStorage.getItem('dtoken');
    }

    /**
     * 获取当前分销商信息
     */
    getCurrentDistributor(): DistributorInfo | null {
        const data = localStorage.getItem('distributor');
        return data ? JSON.parse(data) : null;
    }
}

// 创建单例实例
const distributorApiService = new DistributorApiService();

export default distributorApiService;
