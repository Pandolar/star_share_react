import md5 from 'md5';
import config, { getAdminApiUrl, getStoredToken, clearStoredToken } from '../config';

// 请求响应类型定义
interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
  total?: number;
}

// 请求配置接口
interface RequestConfig extends RequestInit {
  skipAuth?: boolean;
  timeout?: number;
}

// 创建请求函数
async function createRequest(
  url: string,
  options: RequestConfig = {}
): Promise<ApiResponse> {
  const {
    skipAuth = false,
    timeout = config.api.timeout,
    ...fetchOptions
  } = options;

  // 准备请求头
  const headers: { [key: string]: string } = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as any || {}),
  };

  // 添加认证token（如果不跳过认证）
  if (!skipAuth) {
    const token = getStoredToken();
    if (token) {
      headers['admin_token'] = token;
    }
  }

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
        clearStoredToken();
        window.location.href = config.routes.adminLogin;
        throw new Error('登录已过期，请重新登录');
      }
      throw new Error(`HTTP Error: ${response.status}`);
    }

    // 解析响应数据
    const data: ApiResponse = await response.json();

    // 处理业务错误
    if (data.code !== 20000) {
      if (data.code === 401 || data.code === 403) {
        clearStoredToken();
        window.location.href = config.routes.adminLogin;
      }
      throw new Error(data.msg || '请求失败');
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

// 管理员认证API
export const authApi = {
  // 管理员登录
  login: async (username: string, password: string): Promise<ApiResponse<{ admin_token: string }>> => {
    const hashedPassword = md5(password);

    return createRequest(getAdminApiUrl('/star/login'), {
      method: 'POST',
      body: JSON.stringify({ username, password: hashedPassword }),
      skipAuth: true,
    });
  },
};

// 套餐管理API
export const packageApi = {
  // 获取套餐列表
  list: async (params?: any): Promise<ApiResponse<any[]>> => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return createRequest(getAdminApiUrl(`/star/package${queryString}`), {
      method: 'GET',
    });
  },

  // 创建套餐
  create: async (data: any): Promise<ApiResponse> => {
    return createRequest(getAdminApiUrl('/star/package'), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 更新套餐
  update: async (data: any): Promise<ApiResponse> => {
    return createRequest(getAdminApiUrl('/star/package'), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 删除套餐
  delete: async (id: number): Promise<ApiResponse> => {
    return createRequest(getAdminApiUrl('/star/package'), {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  },
};

// 用户管理API
export const userApi = {
  // 获取用户列表
  list: async (params?: any): Promise<ApiResponse<any[]>> => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return createRequest(getAdminApiUrl(`/star/user${queryString}`), {
      method: 'GET',
    });
  },

  // 创建用户
  create: async (data: any): Promise<ApiResponse> => {
    return createRequest(getAdminApiUrl('/star/user'), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 更新用户
  update: async (data: any): Promise<ApiResponse> => {
    return createRequest(getAdminApiUrl('/star/user'), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 删除用户
  delete: async (id: number): Promise<ApiResponse> => {
    return createRequest(getAdminApiUrl('/star/user'), {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  },
};

// 用户套餐API
export const userPackageApi = {
  // 获取用户套餐列表
  list: async (params?: any): Promise<ApiResponse<any[]>> => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return createRequest(getAdminApiUrl(`/star/user_packages${queryString}`), {
      method: 'GET',
    });
  },
};

// CDK管理API
export const cdkApi = {
  // 获取CDK列表
  list: async (params?: any): Promise<ApiResponse<any[]>> => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return createRequest(getAdminApiUrl(`/star/cdk${queryString}`), {
      method: 'GET',
    });
  },

  // 创建CDK
  create: async (data: any): Promise<ApiResponse> => {
    return createRequest(getAdminApiUrl('/star/cdk'), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 更新CDK
  update: async (data: any): Promise<ApiResponse> => {
    return createRequest(getAdminApiUrl('/star/cdk'), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 删除CDK
  delete: async (id: number): Promise<ApiResponse> => {
    return createRequest(getAdminApiUrl('/star/cdk'), {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  },
};

// 配置管理API
export const configApi = {
  // 获取配置列表
  list: async (): Promise<ApiResponse<any[]>> => {
    return createRequest(getAdminApiUrl('/star/config'), {
      method: 'GET',
    });
  },

  // 更新配置
  update: async (data: { key: string; value: string }): Promise<ApiResponse> => {
    return createRequest(getAdminApiUrl('/star/config'), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// 订单管理API
export const orderApi = {
  // 获取订单列表
  list: async (params?: any): Promise<ApiResponse<any[]>> => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return createRequest(getAdminApiUrl(`/star/order${queryString}`), {
      method: 'GET',
    });
  },

  // 更新订单
  update: async (data: any): Promise<ApiResponse> => {
    return createRequest(getAdminApiUrl('/star/order'), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 删除订单
  delete: async (id: number): Promise<ApiResponse> => {
    return createRequest(getAdminApiUrl('/star/order'), {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  },
};

// 登出API
export const logoutApi = {
  // 管理员登出
  logout: async (): Promise<ApiResponse> => {
    return createRequest(getAdminApiUrl('/star/logout'), {
      method: 'POST',
    });
  },
};

// 下拉数据API
export const dropdownApi = {
  // 获取下拉数据
  getData: async (type: string): Promise<ApiResponse<any[]>> => {
    return createRequest(getAdminApiUrl(`/star/dropdown_data?type=${type}`), {
      method: 'GET',
    });
  },
};

// 导出所有API
export default {
  auth: authApi,
  package: packageApi,
  user: userApi,
  userPackage: userPackageApi,
  cdk: cdkApi,
  config: configApi,
  order: orderApi,
  logout: logoutApi,
  dropdown: dropdownApi,
};