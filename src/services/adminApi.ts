import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import md5 from 'md5';
import {
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
} from '../types/admin';

/**
 * 管理后台API服务类
 * 处理所有与后台管理相关的API请求
 */
class AdminApiService {
    private api: AxiosInstance;

    constructor() {
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
        return localStorage.getItem('admin_token') || null;
    }

    /**
     * 保存管理员token
     */
    private setAdminToken(token: string): void {
        localStorage.setItem('admin_token', token);
    }

    /**
     * 清除管理员token
     */
    private clearAdminToken(): void {
        localStorage.removeItem('admin_token');
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

    /**
     * 批量生成CDK
     */
    async createCDKs(data: CreateCDKRequest): Promise<AdminApiResponse<{ cdk: CDK[] }>> {
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
     * 删除CDK
     */
    async deleteCDK(id: number): Promise<AdminApiResponse> {
        const response = await this.api.delete('/star/cdk', { data: { id } });
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

    // ==================== 订单管理 ====================

    /**
     * 查询订单列表
     */
    async getOrders(params: OrderQueryParams = {}): Promise<AdminApiResponse<Order[]>> {
        const queryString = this.buildQueryString(params);
        const response = await this.api.get(`/star/order?${queryString}`);
        return response.data;
    }

    /**
     * 更新订单
     */
    async updateOrder(data: UpdateOrderRequest): Promise<AdminApiResponse> {
        const response = await this.api.put('/star/order', data);
        return response.data;
    }

    /**
     * 删除订单
     */
    async deleteOrder(id: number): Promise<AdminApiResponse> {
        const response = await this.api.delete('/star/order', { data: { id } });
        return response.data;
    }
}

// 创建单例实例
const adminApiService = new AdminApiService();

export default adminApiService;

// 导出具体的API方法供组件使用
export const {
    login,
    checkToken,
    logout,
    createPackage,
    getPackages,
    updatePackage,
    deletePackage,
    createUser,
    getUsers,
    updateUser,
    deleteUser,
    getUserPackages,
    getCDKs,
    createCDKs,
    updateCDK,
    deleteCDK,
    getConfigs,
    updateConfig,
    getOrders,
    updateOrder,
    deleteOrder,
} = adminApiService; 