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
export interface User {
    id: number;
    username?: string;
    email: string;
    tel?: string;
    created_at: string;
    status: 0 | 1;
    preferences?: Record<string, any>;
    inviter_user?: number;
    inviter_code?: string;
    remarks?: string;
    wechat_openid?: string;
}

export interface CreateUserRequest {
    email: string;
    password: string;
    username?: string;
    preferences?: Record<string, any>;
    status?: 0 | 1;
    inviter_user?: number;
    remarks?: string;
}

export interface UpdateUserRequest {
    id: number;
    username?: string;
    email?: string;
    preferences?: Record<string, any>;
    status?: 0 | 1;
    inviter_user?: number;
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
    package_id: number;
    remarks?: string;
}

export interface CreateCDKRequest {
    number: number;
    package_id: number;
    status?: 'used' | 'unused' | 'disabled';
    remarks?: string;
}

export interface UpdateCDKRequest {
    id: number;
    status?: 'used' | 'unused' | 'disabled';
    package_id?: number;
    remarks?: string;
}

export interface CDKQueryParams extends CommonQueryParams {
    id?: number;
    cdk?: string;
    status?: 'used' | 'unused' | 'disabled';
    created_at?: string;
    used_at?: string;
    user_id?: number;
    package_id?: number;
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
    type: 'str' | 'int' | 'bool';
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

// 分页数据类型
export interface PaginatedData<T> {
    list: T[];
    total: number;
    current_page: number;
    page_size: number;
} 