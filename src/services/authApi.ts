import axios, { AxiosResponse } from 'axios';
import { toast } from '../utils/toast';

// API响应的统一结构
interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

// 登录成功后返回的数据结构
export interface LoginResponse {
  xuserid: string;
  xtoken: string;
  xy_uuid_token: string;
}

// 微信二维码获取响应数据结构
export interface WechatQRResponse {
  qr_code_url: string;
  ticket: string;
}

// 微信登录状态检查响应数据结构
export interface WechatLoginStatusResponse {
  // 用户选择绑定已有账号时返回
  wechat_temp_token?: string;
  // 用户直接登录成功时返回
  xuserid?: string;
  xtoken?: string;
  xy_uuid_token?: string;
}

// 微信绑定请求数据结构
export interface WechatBindRequest {
  is_bind?: boolean;
  wechat_temp_token: string;
  xuserid?: number;
  xtoken?: string;
}

// 创建一个配置好的axios实例
const authApi = axios.create({
  baseURL: '/u', // 接口统一前缀
  timeout: 10000, // 请求超时时间
  headers: { 'Content-Type': 'application/json' },
});

// 响应拦截器 - 关键在于它改变了返回值的类型
authApi.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { code, msg, data } = response.data;
    if (code === 20000) {
      // 成功时，不再返回整个AxiosResponse，而是只返回data部分
      return data;
    } else {
      // 失败时，抛出错误，由catch块处理
      toast.error(msg || '操作失败');
      return Promise.reject(new Error(msg || 'Error'));
    }
  },
  (error) => {
    // 处理网络层面的错误
    if (error.response) {
      const status = error.response.status;
      let message = `请求错误: ${status}`;
      if (status === 404) {
        message = '请求的资源未找到 (404)';
      } else if (status === 500) {
        message = '服务器内部错误 (500)';
      } else if (status === 504) {
        message = '请求超时，请稍后重试 (504)';
      }
      toast.error(message);
    } else if (error.request) {
      toast.error('网络连接失败，请检查您的网络');
    } else {
      toast.error('请求发送失败');
    }
    return Promise.reject(error);
  }
);

/**
 * 发送邮箱验证码
 */
export const sendEmailCode = (email: string, type_: 'register' | 'back_password' = 'register'): Promise<void> => {
  // 类型断言：告诉TypeScript，拦截器处理后的返回值是Promise<void>
  return authApi.post('/send_email', { email, type_ }) as unknown as Promise<void>;
};

/**
 * 用户注册
 */
export const registerUser = (email: string, email_code: string, password: string): Promise<LoginResponse> => {
  const encodedPassword = btoa(password.trim());
  // 类型断言：告诉TypeScript，拦截器处理后的返回值是Promise<LoginResponse>
  return authApi.post('/register', { email, email_code, password: encodedPassword }) as unknown as Promise<LoginResponse>;
};

/**
 * 用户登录
 */
export const loginUser = (email: string, password: string): Promise<LoginResponse> => {
  const encodedPassword = btoa(password.trim());
  // 类型断言：告诉TypeScript，拦截器处理后的返回值是Promise<LoginResponse>
  return authApi.post('/login', { email, password: encodedPassword }) as unknown as Promise<LoginResponse>;
};

/**
 * 检查用户Token是否有效
 */
export const checkToken = (xuserid: string, xtoken: string): Promise<ApiResponse> => {
  const instance = axios.create({
    baseURL: '/u',
    timeout: 10000,
  });
  return instance.get('/check_xtoken', {
    headers: {
      'xuserid': xuserid,
      'xtoken': xtoken
    }
  }).then(response => response.data);
};

/**
 * 找回密码
 */
export const resetPassword = (email: string, email_code: string, password: string): Promise<void> => {
  const encodedPassword = btoa(password.trim());
  // 类型断言：告诉TypeScript，拦截器处理后的返回值是Promise<void>
  return authApi.post('/back_password', { email, email_code, password: encodedPassword }) as unknown as Promise<void>;
};

/**
 * 获取微信登录二维码
 */
export const getWechatQRCode = (): Promise<WechatQRResponse> => {
  // 类型断言：告诉TypeScript，拦截器处理后的返回值是Promise<WechatQRResponse>
  return authApi.get('/wechat_login_qr') as unknown as Promise<WechatQRResponse>;
};

/**
 * 检查微信二维码登录状态
 * 这个函数需要处理多种状态码，所以不使用authApi的拦截器
 * @returns Promise<WechatLoginStatusResponse | null> - 返回token数据或null（用户未扫码）
 */
export const checkWechatLoginStatus = (ticket: string): Promise<WechatLoginStatusResponse | null> => {
  const instance = axios.create({
    baseURL: '/u',
    timeout: 10000,
  });

  return instance.get('/qr_login_status', { params: { ticket } }).then(response => {
    const { code, msg, data } = response.data;
    if (code === 20000) {
      if (data && (data.wechat_temp_token || (data.xuserid && data.xtoken && data.xy_uuid_token))) {
        // 情况1: 获取到wechat_temp_token，用户扫码选择绑定已有账号
        // 情况2: 直接获取到登录凭据，用户扫码直接登录成功
        return data;
      } else {
        // code 20000 但没有有效数据，说明用户还没扫码，返回null继续轮询
        return null;
      }
    } else if (code === 20001) {
      // 二维码过期，抛出特定错误
      throw new Error(msg || '二维码已过期');
    } else {
      // 其他错误
      throw new Error(msg || '未知错误');
    }
  });
};

/**
 * 微信绑定/登录
 */
export const wechatBind = (data: WechatBindRequest): Promise<LoginResponse> => {
  // 类型断言：告诉TypeScript，拦截器处理后的返回值是Promise<LoginResponse>
  return authApi.post('/wechat_bind', data) as unknown as Promise<LoginResponse>;
};

export default authApi;
