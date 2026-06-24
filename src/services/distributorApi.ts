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
    created_at: string;
    updated_at: string;
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
    distributor: DistributorInfo;
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
                    window.location.href = '/distributor-login';
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
        const response = await this.api.put('/password', data);
        return response.data;
    }

    /**
     * 登出
     */
    logout() {
        localStorage.removeItem('dtoken');
        localStorage.removeItem('distributor');
        window.location.href = '/distributor-login';
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
