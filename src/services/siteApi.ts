import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { storage } from '../config';
import type { CommissionLedger, CommissionSummary, DistributorSite, PageQuery, SiteAuditLog, SiteOrder, SitePackagePatch, SitePackagesPayload } from '../types/site';

export interface SiteApiResponse<T> { code: number; msg?: string; data?: T; total?: number; }
export function siteData<T>(response: SiteApiResponse<T>): T { if (response.code !== 20000 || response.data === undefined) throw new Error(response.msg || '操作失败'); return response.data; }
const adminWritable = ['name', 'status', 'distributor_id', 'branding', 'sales_mode', 'logo_url', 'customer_service_url', 'notice_mode', 'notice', 'features', 'feature_limits', 'permissions', 'commission_enabled', 'commission_mode', 'commission_rate', 'allow_reward_stacking', 'domains', 'domain_rules'];
const distributorWritable = ['name', 'branding', 'logo_url', 'customer_service_url', 'notice_mode', 'notice', 'features'];
const pickFields = (source: Partial<DistributorSite>, fields: string[]) => Object.fromEntries(Object.entries(source).filter(([key, value]) => fields.includes(key) && value !== undefined));
class SiteApiService {
  private admin: AxiosInstance; private distributor: AxiosInstance;
  constructor() { this.admin = axios.create({ baseURL: process.env.REACT_APP_API_BASE_URL || '', timeout: 30000 }); this.distributor = axios.create({ baseURL: '/star/distributor', timeout: 30000 }); this.admin.interceptors.request.use((config) => { const token = localStorage.getItem(storage.tokenKey || 'admin_token'); if (token) config.headers.admin_token = token; return config; }); this.distributor.interceptors.request.use((config) => { const token = localStorage.getItem('dtoken'); if (token) config.headers.dtoken = token; return config; }); }
  private async get<T>(client: AxiosInstance, url: string, params?: object): Promise<SiteApiResponse<T>> { return (await client.get<SiteApiResponse<T>>(url, { params })).data; }
  private async post<T>(client: AxiosInstance, url: string, data: object): Promise<SiteApiResponse<T>> { return (await client.post<SiteApiResponse<T>>(url, data)).data; }
  private async put<T>(client: AxiosInstance, url: string, data: object): Promise<SiteApiResponse<T>> { return (await client.put<SiteApiResponse<T>>(url, data)).data; }
  listSites(params?: PageQuery) { return this.get<DistributorSite[]>(this.admin, '/star/sites', params); }
  getSite(id: number) { return this.get<DistributorSite>(this.admin, '/star/sites', { id }); }
  createSite(data: Partial<DistributorSite>) { return this.post<DistributorSite>(this.admin, '/star/sites', pickFields(data, adminWritable)); }
  updateSite(data: Partial<DistributorSite> & Pick<DistributorSite, 'id' | 'revision'>) { return this.put<DistributorSite>(this.admin, '/star/sites', { id: data.id, revision: data.revision, ...pickFields(data, adminWritable) }); }
  getSitePackages(site_id: number) { return this.get<SitePackagesPayload>(this.admin, '/star/site_packages', { site_id }); }
  updateSitePackages(site_id: number, revision: number, items: SitePackagePatch[]) { return this.put<SitePackagesPayload>(this.admin, '/star/site_packages', { site_id, revision, items }); }
  getSiteAudit(site_id: number, params?: PageQuery) { return this.get<SiteAuditLog[]>(this.admin, '/star/site_audit', { ...params, site_id }); }
  listDistributorSites(params?: PageQuery) { return this.get<DistributorSite[]>(this.distributor, '/sites', params); }
  getDistributorSite(id: number) { return this.get<DistributorSite>(this.distributor, '/sites', { id }); }
  updateDistributorSite(data: Partial<DistributorSite> & Pick<DistributorSite, 'id' | 'revision'>) { return this.put<DistributorSite>(this.distributor, '/sites', { id: data.id, revision: data.revision, ...pickFields(data, distributorWritable) }); }
  getDistributorSitePackages(site_id: number) { return this.get<SitePackagesPayload>(this.distributor, '/site_packages', { site_id }); }
  updateDistributorSitePackages(site_id: number, revision: number, items: SitePackagePatch[]) { return this.put<SitePackagesPayload>(this.distributor, '/site_packages', { site_id, revision, items }); }
  getDistributorSiteAudit(site_id: number, params?: PageQuery) { return this.get<SiteAuditLog[]>(this.distributor, '/site_audit', { ...params, site_id }); }
  orders(params?: PageQuery, distributor = false) { return this.get<SiteOrder[]>(distributor ? this.distributor : this.admin, distributor ? '/site_orders' : '/star/site_orders', params); }
  ledger(params?: PageQuery, distributor = false) { return this.get<CommissionLedger[]>(distributor ? this.distributor : this.admin, distributor ? '/commissions' : '/star/commissions', params); }
  summary(params?: PageQuery, distributor = false) { return this.get<CommissionSummary>(distributor ? this.distributor : this.admin, distributor ? '/commission_summary' : '/star/commission_summary', params); }
  registerRefund(data: { order_id: number; refund_amount: string; request_key: string; remark: string }) { return this.post<CommissionLedger>(this.admin, '/star/commission_refunds', data); }
}
const siteApi = new SiteApiService();
export default siteApi;
