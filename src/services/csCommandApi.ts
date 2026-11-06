import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { storage } from '../config';
import type { Batch, CommandSettings, ConnectionState, Directive, DirectivePlan, Task } from '../types/csCommand';

export interface CsResponse<T> { code: number; msg?: string; data?: T; total?: number; }
const unwrap = <T>(response: CsResponse<T>): T => { if (response.code !== 20000 || response.data === undefined) throw new Error(response.msg || '请求失败'); return response.data; };

class CsCommandApi {
  private client: AxiosInstance;
  constructor() {
    this.client = axios.create({ baseURL: process.env.REACT_APP_API_BASE_URL || '', timeout: 45000 });
    this.client.interceptors.request.use((config) => { const token = localStorage.getItem(storage.tokenKey); if (token) config.headers.admin_token = token; return config; });
  }
  private async get<T>(url: string, params?: object) { return unwrap((await this.client.get<CsResponse<T>>(url, { params })).data); }
  private async post<T>(url: string, data?: object) { return unwrap((await this.client.post<CsResponse<T>>(url, data)).data); }
  private async put<T>(url: string, data: object) { return unwrap((await this.client.put<CsResponse<T>>(url, data)).data); }
  getSettings() { return this.get<CommandSettings>('/star/cs_command_settings'); }
  saveSettings(data: CommandSettings) { return this.put<CommandSettings>('/star/cs_command_settings', data); }
  createDirective(data: { text: string; request_key: string; parent_directive_id?: number; thread_id?: string; selected_task_id?: number; conversation_ids?: number[]; manual?: boolean; plan?: DirectivePlan }) { return this.post<Directive>('/star/cs_directives', data); }
  updateDirective(id: number, revision: number, plan: DirectivePlan) { return this.put<Directive>(`/star/cs_directives/${id}`, { revision, plan }); }
  listDirectives(params?: object) { return this.get<Directive[]>('/star/cs_directives', params); }
  applyDirective(id: number, revision: number) { return this.post<{ directive: Directive; task?: Task; batch?: Batch }>(`/star/cs_directives/${id}/apply`, { revision }); }
  listTasks(params?: object) { return this.get<Task[]>('/star/cs_tasks', params); }
  getTask(id: number) { return this.get<Task>(`/star/cs_tasks/${id}`); }
  updateTask(id: number, revision: number, task: Partial<Task>) { return this.put<Task>(`/star/cs_tasks/${id}`, { revision, ...task }); }
  transitionTask(id: number, revision: number, action: string) { return this.post<Task>(`/star/cs_tasks/${id}/transition`, { revision, action }); }
  listBatches(params?: object) { return this.get<Batch[]>('/star/cs_task_batches', params); }
  createBatch(data: object) { return this.post<Batch>('/star/cs_task_batches', data); }
  getBatch(id: number) { return this.get<Batch>(`/star/cs_task_batches/${id}`); }
  actBatch(id: number, revision: number, action: string) { return this.post<Batch>(`/star/cs_task_batches/${id}`, { revision, action }); }
  getConnections() { return this.get<ConnectionState>('/star/cs_ai_connections'); }
  async saveConnections(data: object) { return unwrap((await this.client.put<CsResponse<ConnectionState>>('/star/cs_ai_connections', data, { timeout: 180000 })).data); }
  async testConnections(data: object) { return unwrap((await this.client.post<CsResponse<{ ok: boolean; message: string; fingerprint: string }>>('/star/cs_ai_connections/test', data, { timeout: 180000 })).data); }
}
const csCommandApi = new CsCommandApi();
export default csCommandApi;
