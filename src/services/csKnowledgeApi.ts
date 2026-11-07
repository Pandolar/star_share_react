import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { storage } from '../config';

export interface KnowledgeCandidate { id:number; question:string; answer:string; status:string; source:string; frequency:number; revision:number; dify_document_id?:string|null; conversation_id?:number|null; source_message_id?:number|null; updated_at?:string; last_error?:string|null; evidence?: unknown[]; [key:string]: unknown }
export interface KnowledgeUsage { message_id:number; conversation_id:number; time?:string; disposition:string; excerpt:string; answer?:string; citation?: unknown; draft_id?:number }
export interface KnowledgeDetail { candidate: KnowledgeCandidate; usages: KnowledgeUsage[] }
export interface KnowledgeSources { message_id:number; conversation_id:number; answer:string; citations:Array<{document_id?:string; document_name?:string; content?:string}>; candidate_ids:number[] }
interface Response<T> { code:number; msg?:string; data?:T; total?:number }
export interface KnowledgeBatchItem { id:number; revision:number }
export interface KnowledgeBatchResult { id:number; success:boolean; candidate?:KnowledgeCluster; error?:string }

export interface KnowledgeQuestionVariant { question:string; count:number; similarity:number; first_seen?:string; last_seen?:string }
export interface KnowledgeAnswerVariant { hash:string; answer:string; count:number; has_human:boolean; state:'chosen'|'alternate'|'conflict'; first_seen?:string; last_seen?:string }
export interface KnowledgeCluster extends KnowledgeCandidate {
  questions: KnowledgeQuestionVariant[];
  answers: KnowledgeAnswerVariant[];
  question_variant_count: number;
  answer_variant_count: number;
  cluster_id: number | null;
  conflict_state: 'none' | 'soft' | 'hard';
  auto_state?: string | null;
  blocked: boolean;
  block_hits: number;
  has_human: boolean;
}
export interface KnowledgeClusterDetail extends KnowledgeCluster {
  absorbed: Array<{ id:number; question:string; status:string; frequency:number }>;
  similar_published: Array<{ id:number; question:string; status:string; similarity:number }>;
}
export interface KnowledgeMetrics { pending:number; conflict:number; needs_answer:number; published:number; blocked:number; variants_absorbed:number; auto_7d:number; total:number }
export interface KnowledgeBackfillReport {
  dry_run:boolean; scanned:number; pending_before:number; clusters:number; merged_clusters:number;
  merged:number; conflicts:number; archived:number; blocked:number; pending_after:number;
  examples:Array<{ target_id:number; target_question:string; absorbed:Array<{ id:number; question:string; similarity:number }> }>;
  token:string;
}
export type KnowledgeTab = 'pending'|'conflict'|'needs_answer'|'published'|'blocked'|'rejected';
export interface KnowledgeFilters { tab:KnowledgeTab; source?:string; min_frequency?:string; query?:string }

const unwrap = <T>(r:Response<T>): { data:T; total?:number } => { if (r.code !== 20000 || r.data === undefined) throw new Error(r.msg || '请求失败'); return { data:r.data, total:r.total }; };
class CsKnowledgeApi {
  private client:AxiosInstance;
  constructor(){ this.client=axios.create({baseURL:process.env.REACT_APP_API_BASE_URL || '', timeout:45000}); this.client.interceptors.request.use(c=>{const token=localStorage.getItem(storage.tokenKey); if(token)c.headers.admin_token=token; return c;}); }
  async list(params:Record<string,unknown>={}) { return unwrap((await this.client.get<Response<KnowledgeCandidate[]>>('/star/cs_kb_candidates',{params})).data); }
  async detail(id:number, params:Record<string,unknown>={}) { return unwrap((await this.client.get<Response<KnowledgeDetail>>(`/star/cs_kb_candidates/${id}`,{params})).data); }
  async clusters(params:Record<string,unknown>={}) { return unwrap((await this.client.get<Response<KnowledgeCluster[]>>('/star/cs_kb_clusters',{params})).data); }
  async cluster(id:number) { return unwrap((await this.client.get<Response<KnowledgeClusterDetail>>(`/star/cs_kb_cluster/${id}`)).data); }
  async metrics() { return unwrap((await this.client.get<Response<KnowledgeMetrics>>('/star/cs_kb_metrics')).data); }
  async act(data:Record<string,unknown>) { return unwrap((await this.client.put<Response<KnowledgeCluster>>('/star/cs_kb_candidates',data)).data); }
  async batch(data:{ action:'approve'|'reject'|'merge'|'retry'; items?:KnowledgeBatchItem[]; filters?:Omit<KnowledgeFilters,'tab'> & { tab:KnowledgeTab }; target_id?:number; reason?:string; remember?:boolean; background?:boolean }) {
    return unwrap((await this.client.post<Response<{ action:string; queued:boolean; job_id?:string; total?:number; results?:KnowledgeBatchResult[]; succeeded:number; failed:number }>>('/star/cs_kb_batch',data)).data);
  }
  async batchJob(id:string) { return unwrap((await this.client.get<Response<{ id:string; action:string; status:string; succeeded:number; failed:number; errors:Array<{ id:number; error:string }>; total:number }>>(`/star/cs_kb_batch_job/${id}`)).data); }
  async backfill(data:{ dry_run:boolean; token?:string; archive_miss?:boolean; block_rejected?:boolean }) { return unwrap((await this.client.post<Response<KnowledgeBackfillReport>>('/star/cs_kb_backfill',data)).data); }
  async blocklist(params:Record<string,unknown>={}) { return unwrap((await this.client.get<Response<KnowledgeCluster[]>>('/star/cs_kb_blocklist',{params})).data); }
  async block(id:number, reason?:string) { return unwrap((await this.client.post<Response<KnowledgeCluster>>('/star/cs_kb_blocklist',{ id, reason })).data); }
  async unblock(id:number) { return unwrap((await this.client.delete<Response<KnowledgeCluster>>('/star/cs_kb_blocklist',{ data:{ id } })).data); }
  async messageSources(id:number) { return unwrap((await this.client.get<Response<KnowledgeSources>>(`/star/cs_kb_sources/${id}`)).data); }
  async add(data:{question:string;answer:string}) { return unwrap((await this.client.post<Response<KnowledgeCluster>>('/star/cs_kb_candidates',data)).data); }
  async mine(data:Record<string,unknown>={}) { return unwrap((await this.client.post<Response<unknown>>('/star/cs_kb_mine',data)).data); }
}
const csKnowledgeApi = new CsKnowledgeApi();
export default csKnowledgeApi;
