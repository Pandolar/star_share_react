import axios from 'axios';
import type { AxiosInstance } from 'axios';
import md5 from 'md5';
import { storage as storageConfig } from '../config';
import type {
    AdminApiResponse,
    Package,
    CreatePackageRequest,
    UpdatePackageRequest,
    PackageQueryParams,
    User,
    CreateUserRequest,
    UpdateUserRequest,
    UserQueryParams,
    UserPackage,
    UserPackageQueryParams,
    CDK,
    CreateCDKRequest,
    UpdateCDKRequest,
    CDKQueryParams,
    SystemConfig,
    UpdateConfigRequest,
    Order,
    UpdateOrderRequest,
    OrderQueryParams,
    InvitePolicyResponseData,
    InviteCashbackConfig,
    InviteCashbackResponseData,
    InviteRewardRecord,
    InviteRewardQueryParams,
    WorkOrder,
    WorkOrderQueryParams,
    UpdateWorkOrderRequest,
    InvoiceRecord,
    InvoiceQueryParams,
    AuditLogQueryParams,
    AuditLogResponseData,
    AuditLogRetentionPolicy,
    DashboardData,
    DashboardQueryParams,
    Article,
    ArticleSummary,
    SaveArticleRequest,
    SourceDomainStats,
    AdminTeamDetailData,
    AdminTeamQueryParams,
    AdminTeamRecord,
} from '../types/admin';

/**
 * 管理后台API服务类
 * 处理所有与后台管理相关的API请求
 */
class AdminApiService {
    private api: AxiosInstance;
    private readonly tokenKey: string;

    constructor() {
        // 读取存储key（默认使用配置中的 key）
        this.tokenKey = (storageConfig && storageConfig.tokenKey) || 'admin_token';

        // 创建axios实例
        this.api = axios.create({
            baseURL: process.env.REACT_APP_API_BASE_URL || '',
            timeout: 30000,
        });

        // 请求拦截器 - 添加认证token
        this.api.interceptors.request.use(
            (config) => {
                const adminToken = this.getAdminToken();
                if (adminToken) {
                    config.headers.admin_token = adminToken;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // 响应拦截器 - 处理认证错误
        this.api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.data?.code === 20009) {
                    // 权限不足，清除token并跳转到登录页
                    this.clearAdminToken();
                    window.location.href = '/star-admin/login';
                }
                return Promise.reject(error);
            }
        );
    }

    /**
     * 获取管理员token
     */
    private getAdminToken(): string | null {
        try {
            const fromLocal = localStorage.getItem(this.tokenKey);
            if (fromLocal) return fromLocal;
        } catch (_) {
            // ignore
        }

        // 尝试从 cookie 读取（作为兜底方案）
        try {
            const name = `${this.tokenKey}=`;
            const decodedCookie = decodeURIComponent(document.cookie || '');
            const ca = decodedCookie.split(';');
            for (let c of ca) {
                while (c.charAt(0) === ' ') c = c.substring(1);
                if (c.indexOf(name) === 0) {
                    return c.substring(name.length, c.length);
                }
            }
        } catch (_) {
            // ignore
        }
        return null;
    }

    /**
     * 保存管理员token
     */
    private setAdminToken(token: string): void {
        // 优先写入 localStorage，失败则写入 cookie
        let written = false;
        try {
            const testKey = `__ls_test___${Date.now()}`;
            localStorage.setItem(testKey, '1');
            localStorage.removeItem(testKey);
            localStorage.setItem(this.tokenKey, token);
            written = true;
        } catch (_) {
            written = false;
        }

        // 同步写入 cookie 作为兜底（即便 localStorage 成功也写入，增强稳健性）
        try {
            const days = 7; // 有效期 7 天
            const d = new Date();
            d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
            const expires = `expires=${d.toUTCString()}`;
            // SameSite=Lax 兼容大多数场景；开发环境不强制 Secure
            document.cookie = `${this.tokenKey}=${encodeURIComponent(token)}; ${expires}; path=/; SameSite=Lax`;
        } catch (_) {
            // ignore
        }

        if (!written) {
            // 作为最后手段再尝试 sessionStorage（某些浏览器隐私模式允许）
            try {
                sessionStorage.setItem(this.tokenKey, token);
            } catch (_) {
                // ignore
            }
        }
    }

    /**
     * 清除管理员token
     */
    private clearAdminToken(): void {
        try { localStorage.removeItem(this.tokenKey); } catch (_) {}
        try { sessionStorage.removeItem(this.tokenKey); } catch (_) {}
        try {
            // 通过设置过期时间清除 cookie
            document.cookie = `${this.tokenKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
        } catch (_) {
            // ignore
        }
    }

    /**
     * 构建查询参数字符串
     */
    private buildQueryString(params: Record<string, any>): string {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, String(value));
            }
        });
        return searchParams.toString();
    }

    // ==================== 认证相关 ====================

    /**
     * 管理员登录
     */
    async login(username: string, password: string): Promise<AdminApiResponse<{ admin_token: string }>> {
        // 使用MD5加密密码
        const hashedPassword = md5(password);

        const response = await this.api.post('/star/login', {
            username,
            password: hashedPassword,
        });
        if (response.data.code === 20000 && response.data.data?.admin_token) {
            this.setAdminToken(response.data.data.admin_token);
        }

        return response.data;
    }

    /**
     * 检查管理员token有效性
     */
    async checkToken(): Promise<AdminApiResponse> {
        const response = await this.api.post('/star/check_token');
        return response.data;
    }

    /**
     * 管理员登出
     */
    logout(): void {
        this.clearAdminToken();
    }

    // ==================== 套餐管理 ====================

    /**
     * 创建套餐
     */
    async createPackage(data: CreatePackageRequest): Promise<AdminApiResponse<Package>> {
        const response = await this.api.post('/star/package', data);
        return response.data;
    }

    /**
     * 查询套餐列表
     */
    async getPackages(params: PackageQueryParams = {}): Promise<AdminApiResponse<Package[]>> {
        const queryString = this.buildQueryString(params);
        const response = await this.api.get(`/star/package?${queryString}`);
        return response.data;
    }

    /**
     * 更新套餐
     */
    async updatePackage(data: UpdatePackageRequest): Promise<AdminApiResponse> {
        const response = await this.api.put('/star/package', data);
        return response.data;
    }

    /**
     * 删除套餐
     */
    async deletePackage(id: number): Promise<AdminApiResponse> {
        const response = await this.api.delete('/star/package', { data: { id } });
        return response.data;
    }

    // ==================== 用户管理 ====================

    /**
     * 创建用户
     */
    async createUser(data: CreateUserRequest): Promise<AdminApiResponse<User>> {
        const response = await this.api.post('/star/user', data);
        return response.data;
    }

    /**
     * 查询用户列表
     */
    async getUsers(params: UserQueryParams = {}): Promise<AdminApiResponse<User[]>> {
        const queryString = this.buildQueryString(params);
        const response = await this.api.get(`/star/user?${queryString}`);
        return response.data;
    }

    /**
     * 更新用户
     */
    async updateUser(data: UpdateUserRequest): Promise<AdminApiResponse> {
        const response = await this.api.put('/star/user', data);
        return response.data;
    }

    /**
     * 删除用户
     */
    async deleteUser(id: number): Promise<AdminApiResponse> {
        const response = await this.api.delete('/star/user', { data: { id } });
        return response.data;
    }

    /**
     * 清除用户限速
     */
    async clearUserLimit(userId: number): Promise<AdminApiResponse> {
        const response = await this.api.get(`/star/clear_user_limit?user_id=${userId}`);
        return response.data;
    }

    async refreshUserPackages(userId: number): Promise<AdminApiResponse<{ user_id: number; packages: Record<string, unknown> }>> {
        const response = await this.api.post('/star/refresh_user_packages', { user_id: userId });
        return response.data;
    }

    // ==================== 用户套餐记录 ====================

    /**
     * 查询用户套餐记录
     */
    async getUserPackages(params: UserPackageQueryParams = {}): Promise<AdminApiResponse<UserPackage[]>> {
        const queryString = this.buildQueryString(params);
        const response = await this.api.get(`/star/user_packages?${queryString}`);
        return response.data;
    }

    // ==================== CDK管理 ====================

    /**
     * 查询CDK列表
     */
    async getCDKs(params: CDKQueryParams = {}): Promise<AdminApiResponse<CDK[]>> {
        const queryString = this.buildQueryString(params);
        const response = await this.api.get(`/star/cdk?${queryString}`);
        return response.data;
    }

    async getCDKSourceStats(): Promise<AdminApiResponse<SourceDomainStats>> {
        const response = await this.api.get('/star/cdk/source_stats');
        return response.data;
    }

    /**
     * 批量生成CDK
     */
    async createCDKs(data: CreateCDKRequest): Promise<AdminApiResponse<{ batch_id: string; count: number }>> {
        const response = await this.api.post('/star/cdk', data);
        return response.data;
    }

    /**
     * 更新CDK
     */
    async updateCDK(data: UpdateCDKRequest): Promise<AdminApiResponse> {
        const response = await this.api.put('/star/cdk', data);
        return response.data;
    }

    /**
     * 删除CDK（支持单个ID、ID列表或批次）
     */
    async deleteCDK(id: number): Promise<AdminApiResponse> {
        const response = await this.api.delete('/star/cdk', { data: { ids: [id] } });
        return response.data;
    }

    /**
     * 批量删除CDK（按ID列表或批次ID）
     */
    async deleteCDKs(params: { ids?: number[]; batch_id?: string }): Promise<AdminApiResponse> {
        const response = await this.api.delete('/star/cdk', { data: params });
        return response.data;
    }

    /**
     * 导出CDK（full=完整模式，distribute=分发模式）
     */
    async exportCDKs(params: {
        distributor_id?: number | null;
        status?: string;
        batch_id?: string;
        package_id?: number;
        mode?: 'full' | 'distribute';
    }): Promise<Blob> {
        const response = await this.api.post('/star/cdk/export', params, { responseType: 'blob' });
        return response.data;
    }

    /**
     * 获取CDK使用日志
     */
    async getCDKUsageLog(params: {
        cdk_id?: number;
        user_id?: number;
        distributor_id?: number;
        cdk_code?: string;
        page?: number;
        page_size?: number;
    } = {}): Promise<AdminApiResponse<any[]>> {
        const queryString = this.buildQueryString(params);
        const response = await this.api.get(`/star/cdk/usage_log?${queryString}`);
        return response.data;
    }

    /**
     * 统一审计日志：支持类型、用户、关联ID和全文筛选。
     */
    async getAuditLogs(params: AuditLogQueryParams = {}): Promise<AdminApiResponse<AuditLogResponseData>> {
        const queryString = this.buildQueryString(params);
        const response = await this.api.get(`/star/audit_logs?${queryString}`);
        return response.data;
    }

    async updateAuditLogRetention(retention: AuditLogRetentionPolicy): Promise<AdminApiResponse<{
        retention: AuditLogRetentionPolicy;
        deleted: number;
        deleted_by_type: Record<string, number>;
    }>> {
        const response = await this.api.put('/star/audit_logs/retention', { retention });
        return response.data;
    }

    // ==================== 文章管理 ====================

    async getArticles(querystring = ''): Promise<AdminApiResponse<ArticleSummary[]>> {
        const query = querystring ? `?${this.buildQueryString({ querystring })}` : '';
        const response = await this.api.get(`/star/articles${query}`);
        return response.data;
    }

    async getArticle(identifier: string): Promise<AdminApiResponse<Article>> {
        const response = await this.api.get(`/star/articles/${encodeURIComponent(identifier)}`);
        return response.data;
    }

    async createArticle(data: SaveArticleRequest): Promise<AdminApiResponse<Article>> {
        const response = await this.api.post('/star/articles', data);
        return response.data;
    }

    async updateArticle(currentIdentifier: string, data: SaveArticleRequest): Promise<AdminApiResponse<Article>> {
        const response = await this.api.put(`/star/articles/${encodeURIComponent(currentIdentifier)}`, data);
        return response.data;
    }

    async deleteArticle(identifier: string, revision: string): Promise<AdminApiResponse> {
        const response = await this.api.delete(`/star/articles/${encodeURIComponent(identifier)}`, { data: { revision } });
        return response.data;
    }

    // ==================== 系统配置管理 ====================

    /**
     * 获取系统配置列表
     */
    async getConfigs(): Promise<AdminApiResponse<SystemConfig[]>> {
        const response = await this.api.get('/star/config');
        return response.data;
    }

    /**
     * 更新系统配置
     */
    async updateConfig(data: UpdateConfigRequest): Promise<AdminApiResponse> {
        const response = await this.api.put('/star/config', data);
        return response.data;
    }

    async reloadLimitConfig(): Promise<AdminApiResponse<{ reloaded: boolean }>> {
        const response = await this.api.get('/star/reload_limit_config');
        return response.data;
    }

    /**
     * 定向补偿：给指定用户补 N 天指定等级会员
     */
    async grantCompensation(data: { user_id: number; level: string; days: number; category: string }): Promise<AdminApiResponse> {
        const response = await this.api.post('/star/compensation_manual', data);
        return response.data;
    }

    // ==================== 订单管理 ====================

    /**
     * 查询订单列表
     */
    async getOrders(params: OrderQueryParams = {}): Promise<AdminApiResponse<Order[]>> {
        const queryString = this.buildQueryString(params);
        const response = await this.api.get(`/star/order?${queryString}`);
        return response.data;
    }

    async getOrderSourceStats(): Promise<AdminApiResponse<SourceDomainStats>> {
        const response = await this.api.get('/star/order/source_stats');
        return response.data;
    }

    /**
     * 更新订单
     */
    async updateOrder(data: UpdateOrderRequest): Promise<AdminApiResponse> {
        const response = await this.api.put('/star/order', data);
        return response.data;
    }

    async fulfillOrder(id: number): Promise<AdminApiResponse<{
        id: number;
        order_id: string;
        status: 'paid';
        user_id: number;
        package_id: number;
        invite_reward_processed: boolean;
    }>> {
        const response = await this.api.post('/star/order/fulfill', { id });
        return response.data;
    }

    /**
     * 删除订单
     */
    async deleteOrder(id: number): Promise<AdminApiResponse> {
        const response = await this.api.delete('/star/order', { data: { id } });
        return response.data;
    }

    async getInvoices(params: InvoiceQueryParams = {}): Promise<AdminApiResponse<InvoiceRecord[]>> {
        const queryString = this.buildQueryString(params);
        const response = await this.api.get(`/star/invoices?${queryString}`);
        return response.data;
    }

    async updateInvoiceStatus(id: number, invoice_status: 'processing' | 'issued', remarks?: string): Promise<AdminApiResponse> {
        const response = await this.api.put('/star/invoices', { id, invoice_status, remarks });
        return response.data;
    }

    async updateInvoiceStatuses(ids: number[], invoice_status: 'processing' | 'issued', remarks?: string): Promise<AdminApiResponse> {
        const response = await this.api.put('/star/invoices', { ids, invoice_status, remarks });
        return response.data;
    }

    async exportInvoices(params: InvoiceQueryParams = {}): Promise<Blob> {
        const queryString = this.buildQueryString(params);
        const response = await this.api.get(`/star/invoices/export?${queryString}`, { responseType: 'blob' });
        return response.data;
    }


    // ==================== 邀请管理 ====================

    /**
     * 获取邀请规则
     */
    async getInvitePolicy(): Promise<AdminApiResponse<InvitePolicyResponseData>> {
        const response = await this.api.get('/star/invite_policy');
        return response.data;
    }

    /**
     * 更新邀请规则
     */
    async updateInvitePolicy(policy: Record<string, any>): Promise<AdminApiResponse> {
        const response = await this.api.put('/star/invite_policy', { policy });
        return response.data;
    }

    /** 获取限时邀请返现活动配置 */
    async getInviteCashback(): Promise<AdminApiResponse<InviteCashbackResponseData>> {
        const response = await this.api.get('/star/invite_cashback');
        return response.data;
    }

    /** 更新限时邀请返现活动配置 */
    async updateInviteCashback(config: InviteCashbackConfig): Promise<AdminApiResponse<InviteCashbackResponseData>> {
        const response = await this.api.put('/star/invite_cashback', { config });
        return response.data;
    }

    /**
     * 获取邀请奖励流水
     */
    async getInviteRewards(params: InviteRewardQueryParams = {}): Promise<AdminApiResponse<InviteRewardRecord[]>> {
        const queryString = this.buildQueryString(params);
        const response = await this.api.get(`/star/invite_reward?${queryString}`);
        return response.data;
    }

    /**
     * 获取工单列表
     */
    async getWorkorders(params: WorkOrderQueryParams = {}): Promise<AdminApiResponse<WorkOrder[]>> {
        const queryString = this.buildQueryString(params);
        const response = await this.api.get(`/star/workorder?${queryString}`);
        return response.data;
    }

    /**
     * 更新工单
     */
    async updateWorkorder(data: UpdateWorkOrderRequest): Promise<AdminApiResponse> {
        const response = await this.api.put('/star/workorder', data);
        return response.data;
    }

    // ==================== 仪表盘 ====================

    /**
     * 获取仪表盘汇总数据
     */
    async getDashboard(params: DashboardQueryParams = {}): Promise<AdminApiResponse<DashboardData>> {
        const queryString = this.buildQueryString(params);
        const response = await this.api.get(`/star/dashboard?${queryString}`);
        return response.data;
    }

    // ==================== 团队管理 ====================

    async getTeams(params: AdminTeamQueryParams = {}): Promise<AdminApiResponse<AdminTeamRecord[]>> {
        const queryString = this.buildQueryString(params);
        const response = await this.api.get(`/star/teams?${queryString}`);
        return response.data;
    }

    async getTeamDetail(teamId: number): Promise<AdminApiResponse<AdminTeamDetailData>> {
        const response = await this.api.get(`/star/teams/${teamId}`);
        return response.data;
    }

    async manageTeamMember(teamId: number, memberId: number, action: 'suspend' | 'resume' | 'remove' | 'revoke'): Promise<AdminApiResponse> {
        const response = await this.api.post(`/star/teams/${teamId}/members/${memberId}/${action}`);
        return response.data;
    }

    async cancelPendingTeam(teamId: number): Promise<AdminApiResponse> {
        const response = await this.api.post(`/star/teams/${teamId}/cancel`);
        return response.data;
    }

    // ==================== 分销商管理 ====================

    /**
     * 获取分销商列表
     */
    async getDistributors(params: { current_page?: number; page_size?: number; querystring?: string } = {}): Promise<AdminApiResponse<any>> {
        const queryString = this.buildQueryString(params);
        const response = await this.api.get(`/star/distributors?${queryString}`);
        return response.data;
    }

    /**
     * 创建分销商
     */
    async createDistributor(data: {
        username: string;
        password: string;
        domains: string[];
        remarks?: string;
        level?: number;
        default_cdk_expire_days?: number;
        expires_at?: string | null;
        can_login?: boolean;
        can_generate_cdk?: boolean;
        can_edit_notice?: boolean;
    }): Promise<AdminApiResponse> {
        const response = await this.api.post('/star/distributors', data);
        return response.data;
    }

    /**
     * 更新分销商
     */
    async updateDistributor(data: {
        id: number;
        username?: string;
        password?: string;
        status?: number;
        domains?: string[];
        remarks?: string;
        level?: number;
        default_cdk_expire_days?: number;
        expires_at?: string | null;
        can_login?: boolean;
        can_generate_cdk?: boolean;
        can_edit_notice?: boolean;
    }): Promise<AdminApiResponse> {
        const response = await this.api.put('/star/distributors', data);
        return response.data;
    }

    /**
     * 删除分销商
     */
    async deleteDistributor(id: number): Promise<AdminApiResponse> {
        const response = await this.api.delete('/star/distributors', { data: { id } });
        return response.data;
    }

    /**
     * 分销商余额：充值/扣减（amount 正=充值，负=扣减）
     */
    async rechargeDistributorBalance(data: { distributor_id: number; amount: number; remarks?: string }): Promise<AdminApiResponse> {
        const response = await this.api.post('/star/distributor/balance', data);
        return response.data;
    }

    /**
     * 分销商余额流水
     */
    async getDistributorBalanceLog(params: { distributor_id: number; current_page?: number; page_size?: number }): Promise<AdminApiResponse<any>> {
        const queryString = this.buildQueryString(params);
        const response = await this.api.get(`/star/distributor/balance?${queryString}`);
        return response.data;
    }

    /**
     * 折扣信息：等级默认折扣 + 指定分销商的个体折扣
     * 返回 { level_discounts: {...}, distributor: {id, discount_config}|null }
     */
    async getDistributorDiscounts(params: { distributor_id?: number | null } = {}): Promise<AdminApiResponse<any>> {
        const queryString = this.buildQueryString(params);
        const response = await this.api.get(`/star/distributor/discounts?${queryString}`);
        return response.data;
    }

    /**
     * 保存某分销商的个体折扣配置
     * discount_config: {"overall": 0.8, "packages": {"2": 0.6}}
     */
    async saveDistributorDiscount(data: {
        distributor_id: number;
        discount_config: { overall?: number; packages?: Record<string, number> };
    }): Promise<AdminApiResponse> {
        const response = await this.api.put('/star/distributor/discounts', data);
        return response.data;
    }

    /**
     * 保存等级默认折扣（整体覆盖）
     * level_discounts: {"1": {"overall": 0.9, "packages": {"2": 0.85}}, ...}
     */
    async saveLevelDiscounts(level_discounts: Record<string, { overall?: number; packages?: Record<string, number> }>): Promise<AdminApiResponse> {
        const response = await this.api.put('/star/distributor/discounts', { level_discounts });
        return response.data;
    }
}

// 创建单例实例
const adminApiService = new AdminApiService();

export default adminApiService;
