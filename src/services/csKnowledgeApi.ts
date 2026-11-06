import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { storage } from '../config';

export interface KnowledgeCandidate { id:number; question:string; answer:string; status:string; source:string; frequency:number; revision:number; dify_document_id?:string|null; conversation_id?:number|null; source_message_id?:number|null; updated_at?:string; last_error?:string|null; evidence?: unknown[]; similar_variants?: unknown[]; [key:string]: unknown }
export interface KnowledgeUsage { message_id:number; conversation_id:number; time?:string; disposition:string; excerpt:string; answer?:string; citation?: unknown; draft_id?:number }
export interface KnowledgeDetail { candidate: KnowledgeCandidate; usages: KnowledgeUsage[] }
export interface KnowledgeSources { message_id:number; conversation_id:number; answer:string; citations:Array<{document_id?:string; document_name?:string; content?:string}>; candidate_ids:number[] }
interface Response<T> { code:number; msg?:string; data?:T; total?:number }
const unwrap = <T>(r:Response<T>): { data:T; total?:number } => { if (r.code !== 20000 || r.data === undefined) throw new Error(r.msg || '请求失败'); return { data:r.data, total:r.total }; };
class CsKnowledgeApi {
 private client:AxiosInstance;
 constructor(){ this.client=axios.create({baseURL:process.env.REACT_APP_API_BASE_URL || '', timeout:45000}); this.client.interceptors.request.use(c=>{const token=localStorage.getItem(storage.tokenKey); if(token)c.headers.admin_token=token; return c;}); }
 async list(params:Record<string,unknown>={}) { return unwrap((await this.client.get<Response<KnowledgeCandidate[]>>('/star/cs_kb_candidates',{params})).data); }
 async detail(id:number, params:Record<string,unknown>={}) { return unwrap((await this.client.get<Response<KnowledgeDetail>>(`/star/cs_kb_candidates/${id}`,{params})).data); }
 async act(data:Record<string,unknown>) { return unwrap((await this.client.put<Response<KnowledgeCandidate>>('/star/cs_kb_candidates',data)).data); }
 async messageSources(id:number) { return unwrap((await this.client.get<Response<KnowledgeSources>>(`/star/cs_kb_sources/${id}`)).data); }
 async add(data:{question:string;answer:string}) { return unwrap((await this.client.post<Response<KnowledgeCandidate>>('/star/cs_kb_candidates',data)).data); }
 async dedupe() { return unwrap((await this.client.post<Response<unknown>>('/star/cs_kb_dedupe',{})).data); }
 async mine(data:Record<string,unknown>={}) { return unwrap((await this.client.post<Response<unknown>>('/star/cs_kb_mine',data)).data); }
}
export default new CsKnowledgeApi();
