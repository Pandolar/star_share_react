import axios, { AxiosInstance } from 'axios';

/**
 * 分销商 API 响应格式
 */
export interface DistributorApiResponse<T = any> {
    code: number;
    msg?: string;
    data?: T;
    total?: number;
}

/**
 * 分销商信息
 */
export interface DistributorInfo {
    id: number;
    username: string;
    status: number;
    domains: string | string[];
    notice: string;
    notice_id: string;
    remarks: string;
    balance?: number;
    level?: number;
    default_cdk_expire_days?: number;
    expires_at?: string | null;
    discount_active?: boolean;
    permissions?: DistributorPermissions;
    can_generate_cdk?: boolean;
    parent_distributor_id?: number | null;
    created_at: string | null;
    updated_at: string | null;
}

/**
 * 分销商权限
 */
export interface DistributorPermissions {
    can_login: boolean;
    can_generate_cdk: boolean;
}

export interface SubAccount {
    id: number;
    username: string;
    status: number;
    remarks: string | null;
    created_at: string | null;
    site_count: number;
    pending_sites: number;
}

export interface SubCommissionConfig {
    id: number;
    child_id: number;
    package_id: number | null;
    mode: 'fixed' | 'parent_rate';
    value: string;
    revision: number;
    updated_by: string | null;
    updated_at: string | null;
}

export interface SubSiteApproval {
    id: number;
    name: string;
    distributor_id: number;
    branding: string;
    domains: string[];
    created_at: string | null;
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
    expires_at?: string | null;
    discount_active?: boolean;
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
    discount_active?: boolean;
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
    discount_active?: boolean;
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
 * 分销商名下的卡密（只读）
 */
export interface DistributorCdk {
    id: number;
    cdk: string;
    status: 'used' | 'unused' | 'disabled';
    package_id: number;
    package_name?: string;
    batch_id?: string | null;
    created_at: string;
    used_at?: string | null;
    expires_at?: string | null;
    use_count?: number;
    max_uses?: number;
    remarks?: string | null;
}

export interface DistributorCdkStats {
    total: number;
    used: number;
    unused: number;
    expired: number;
}

export interface DistributorCdkQuery {
    current_page?: number;
    page_size?: number;
    querystring?: string;
    status?: 'used' | 'unused' | 'disabled';
    package_id?: number;
    batch_id?: string;
    order_column?: string;
    order?: 'asc' | 'desc';
}

/**
 * 分销商 API 服务类
 */
class DistributorApiService {
    private api: AxiosInstance;

    private redirectingToLogin = false;
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
                const isPublicLogin = config.url === '/login';
                if (dtoken && !isPublicLogin) {
                    config.headers['dtoken'] = dtoken;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Business responses use HTTP 200; normalize expired sessions before callers render stale errors.
        this.api.interceptors.response.use((response) => {
            if (Number(response.data?.code) === 20009) {
                this.handleExpiredSession(response.data?.msg);
                return Promise.reject(new Error('登录状态已失效，请重新登录'));
            }
            return response;
        });

        // 响应拦截器：处理401未授权
        this.api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    this.handleExpiredSession(error.response?.data?.msg);
                    return Promise.reject(new Error('登录状态已失效，请重新登录'));
                }
                return Promise.reject(error);
            }
        );
    }

    private clearSession(): void {
        localStorage.removeItem('dtoken');
        localStorage.removeItem('distributor');
    }
    private handleExpiredSession(serverMessage?: string): void {
        this.clearSession();
        if (this.redirectingToLogin || window.location.pathname === '/distributor/login') return;
        this.redirectingToLogin = true;
        sessionStorage.setItem('distributorLoginNotice', serverMessage || '登录状态已失效，请重新登录');
        window.location.assign('/distributor/login');
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
     * 查看当前分销商名下的卡密
     */
    async getCdks(params: DistributorCdkQuery = {}): Promise<DistributorApiResponse<DistributorCdk[]>> {
        const response = await this.api.get('/cdk', { params });
        return response.data;
    }

    /**
     * 查看当前分销商的卡密汇总
     */
    async getCdkStats(): Promise<DistributorApiResponse<DistributorCdkStats>> {
        const response = await this.api.get('/cdk/stats');
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
     * 登出当前设备
     */
    // ==================== 二级代理（仅一级可用） ====================

    async getSubAccounts(): Promise<DistributorApiResponse<SubAccount[]>> {
        const response = await this.api.get('/sub_accounts');
        return response.data;
    }

    async createSubAccount(data: { username: string; password: string; remarks?: string }): Promise<DistributorApiResponse<SubAccount>> {
        const response = await this.api.post('/sub_accounts', data);
        return response.data;
    }

    async updateSubAccountStatus(id: number, action: 'enable' | 'disable'): Promise<DistributorApiResponse<SubAccount>> {
        const response = await this.api.put('/sub_accounts', { id, action });
        return response.data;
    }

    async getSubCommissions(): Promise<DistributorApiResponse<SubCommissionConfig[]>> {
        const response = await this.api.get('/sub_commissions');
        return response.data;
    }

    async saveSubCommission(data: { child_id: number; package_id?: number | null; mode: 'fixed' | 'parent_rate'; value: string; revision: number }): Promise<DistributorApiResponse<SubCommissionConfig>> {
        const response = await this.api.put('/sub_commissions', data);
        return response.data;
    }

    async deleteSubCommission(data: { child_id: number; package_id?: number | null }): Promise<DistributorApiResponse> {
        const response = await this.api.post('/sub_commissions', { ...data, action: 'delete' });
        return response.data;
    }

    async getSubSiteApprovals(): Promise<DistributorApiResponse<SubSiteApproval[]>> {
        const response = await this.api.get('/sub_site_approvals');
        return response.data;
    }

    async reviewSubSite(id: number, action: 'approve' | 'reject'): Promise<DistributorApiResponse> {
        const response = await this.api.post('/sub_site_approvals', { id, action });
        return response.data;
    }

    async proposeSite(data: { name: string; domain: string }): Promise<DistributorApiResponse<{ id: number; status: string }>> {
        const response = await this.api.post('/sites', data);
        return response.data;
    }

    async logout(): Promise<void> {
        try {
            await this.api.post('/logout');
        } catch {
            // Local logout still completes if the session already expired or the network is unavailable.
        } finally {
            this.clearSession();
            window.location.assign('/distributor/login');
        }
    }

    clearLocalSession(notice?: string): void {
        this.clearSession();
        if (notice) sessionStorage.setItem('distributorLoginNotice', notice);
        window.location.assign('/distributor/login');
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
