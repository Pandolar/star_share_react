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

export default authApi;
