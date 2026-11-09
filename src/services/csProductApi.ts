import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { storage } from '../config';

export interface CsProduct {
  id: number;
  key: string;
  name: string;
  status: 'active' | 'disabled';
  sort_order: number;
  domains: string[];
  widget_key: string | null;
  embed_modes: { sdk: boolean; iframe: boolean; rest: boolean };
  persona: { name?: string; tone?: string; forbidden?: string; escalate?: string };
  config_override: Record<string, unknown>;
  dataset_id: string | null;
  context_url?: string | null;
  has_context_secret?: boolean;
  auto_refresh?: boolean;
  has_app_key: boolean;
  has_dataset_key: boolean;
  has_token_secret: boolean;
  is_default: boolean;
  usage?: { conversations: number; knowledge: number; pending: number };
  token_secret_once?: string | null;
  notice?: string;
  created_at?: string | null;
  updated_at?: string | null;
}

interface Response<T> { code: number; msg?: string; data?: T; total?: number }

const unwrap = <T>(r: Response<T>): { data: T; total?: number } => {
  if (r.code !== 20000 || r.data === undefined) throw new Error(r.msg || '请求失败');
  return { data: r.data, total: r.total };
};

class CsProductApi {
  private client: AxiosInstance;
  constructor() {
    this.client = axios.create({ baseURL: process.env.REACT_APP_API_BASE_URL || '', timeout: 30000 });
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem(storage.tokenKey);
      if (token) config.headers.admin_token = token;
      return config;
    });
  }
  async list() { return unwrap((await this.client.get<Response<CsProduct[]>>('/star/cs_products')).data); }
  async create(data: Partial<CsProduct> & { app_key?: string; dataset_key?: string; context_secret?: string }) {
    return unwrap((await this.client.post<Response<CsProduct>>('/star/cs_products', data)).data);
  }
  async update(data: Partial<CsProduct> & { id: number; app_key?: string; dataset_key?: string; context_secret?: string }) {
    return unwrap((await this.client.put<Response<CsProduct>>('/star/cs_products', data)).data);
  }
  async rotate(id: number, action: 'widget_key' | 'token_secret') {
    return unwrap((await this.client.post<Response<CsProduct>>('/star/cs_products/rotate', { id, action })).data);
  }
  async copyKnowledge(data: { source_product_id: number; target_product_id: number; candidate_ids: number[] }) {
    return unwrap((await this.client.post<Response<{ copied: number; candidate_ids: number[] }>>('/star/cs_kb_copy', data)).data);
  }
  async knowledge(tab: string, productId: number, params: Record<string, unknown> = {}) {
    return unwrap((await this.client.get<Response<Array<Record<string, unknown>>>>('/star/cs_kb_clusters', {
      params: { tab, product_id: productId, current_page: 1, page_size: 200, ...params },
    })).data);
  }
}

const csProductApi = new CsProductApi();
export default csProductApi;
