import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, CardBody, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Pagination, Select, SelectItem, Spinner, Tab, Tabs, Textarea } from '@heroui/react';
import { Plus, RefreshCw } from 'lucide-react';
import siteApi, { siteData } from '../../services/siteApi';
import type { DistributorSite, SiteAuditLog, SitePackage, SitePackagePatch } from '../../types/site';
import { showToast } from '../../components/Toast';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import SiteEditor from '../../components/site/SiteEditor';
import SitePackageEditor from '../../components/site/SitePackageEditor';
import CommissionWorkspace from '../../components/site/CommissionWorkspace';

export default function SitesManagePage() {
  const { can } = useAdminAuth();
  const [rows, setRows] = useState<DistributorSite[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<DistributorSite | null>(null);
  const [packages, setPackages] = useState<SitePackage[]>([]);
  const [audit, setAudit] = useState<SiteAuditLog[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [domains, setDomains] = useState('');
  const [preset, setPreset] = useState('white_cdk');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await siteApi.listSites({ current_page: page, page_size: 20, status: status || undefined, querystring: search || undefined });
      setRows(siteData(response)); setTotal(response.total || 0);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '站点加载失败'); }
    finally { setLoading(false); }
  }, [page, status, search]);
  useEffect(() => { void load(); }, [load]);

  const open = async (id: number) => {
    setLoading(true); setError('');
    try {
      const [siteResponse, packageResponse] = await Promise.all([siteApi.getSite(id), siteApi.getSitePackages(id)]);
      setDetail(siteData(siteResponse)); setPackages(siteData(packageResponse).items); setAuditPage(1);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '详情加载失败'); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    if (!detail) return;
    let active = true;
    siteApi.getSiteAudit(detail.id, { current_page: auditPage, page_size: 20 }).then((response) => {
      const data = siteData(response);
      if (active) { setAudit(data); setAuditTotal(response.total || 0); }
    }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : '变更记录加载失败'); });
    return () => { active = false; };
  }, [detail, auditPage]);

  const save = async (changes: Partial<DistributorSite>): Promise<boolean> => {
    if (!detail) return false;
    setBusy(true);
    try {
      const next = siteData(await siteApi.updateSite({ id: detail.id, revision: detail.revision, ...changes }));
      setDetail(next); showToast('站点配置已发布', 'success'); await load(); return true;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '发布失败'; setError(message); showToast(message, 'error');
      return false;
    } finally { setBusy(false); }
  };
  const savePackages = async (items: SitePackagePatch[]): Promise<boolean> => {
    if (!detail) return false;
    setBusy(true);
    try {
      const next = siteData(await siteApi.updateSitePackages(detail.id, detail.revision, items));
      setPackages(next.items); setDetail({ ...detail, revision: next.site_revision }); showToast('套餐变更已发布', 'success'); return true;
    } catch (caught) { const message = caught instanceof Error ? caught.message : '套餐保存失败'; setError(message); showToast(message, 'error'); return false; }
    finally { setBusy(false); }
  };
  const create = async () => {
    setBusy(true);
    try {
      const next = siteData(await siteApi.createSite({
        name: name.trim(), distributor_id: owner ? Number(owner) : null,
        domains: domains.split(/[\n,，]+/).map((value) => value.trim()).filter(Boolean),
        branding: preset === 'branded_online' ? 'branded' : 'white_label',
        sales_mode: preset === 'white_cdk' ? 'cdk' : preset === 'white_hybrid' ? 'hybrid' : 'online',
        notice_mode: 'custom', notice: '', features: { register: true, customer_service: true },
        feature_limits: {}, permissions: {}, commission_enabled: false, commission_rate: '0', allow_reward_stacking: false,
      }));
      setCreateOpen(false); setName(''); setOwner(''); setDomains(''); await load(); await open(next.id); showToast('站点已创建，请授权套餐和代理编辑权限', 'success');
    } catch (caught) { showToast(caught instanceof Error ? caught.message : '创建失败', 'error'); }
    finally { setBusy(false); }
  };

  return <section className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">代理站点管理</h1><p className="mt-1 text-sm text-default-500">展示、销售渠道、套餐与代理权限分别管理。</p></div><div className="flex gap-2"><Button variant="flat" aria-label="刷新站点" isLoading={loading} onPress={() => detail ? void open(detail.id) : void load()}><RefreshCw size={16} />刷新</Button>{can('site.manage') && <Button color="primary" startContent={<Plus size={16} />} onPress={() => setCreateOpen(true)}>创建站点</Button>}</div></header>
    {error && <Alert color="danger" title="操作未完成" description={error} />}
    {detail ? <Card><CardBody className="gap-5 p-5"><div className="flex items-center gap-4"><Button variant="flat" size="sm" onPress={() => { setDetail(null); setError(''); }}>返回站点列表</Button><h2 className="text-xl font-semibold">{detail.name}</h2><span className="text-sm text-default-400">#{detail.id} · {detail.owner_name || '未分配代理'}</span></div><Tabs aria-label="站点经营详情" variant="underlined">
      <Tab key="settings" title="站点配置"><SiteEditor site={detail} canManage={can('site.manage')} canFinancial={can('site.financial.manage')} busy={busy} onSave={save} /></Tab>
      <Tab key="packages" title="套餐与价格"><SitePackageEditor site={detail} items={packages} canManage={can('site.manage')} canFinancial={can('site.financial.manage')} busy={busy} onSave={savePackages} /></Tab>
      {can('commission.read') && <Tab key="finance" title="销售与佣金"><CommissionWorkspace fixedSiteId={detail.id} /></Tab>}
      <Tab key="audit" title="变更记录"><div className="space-y-4 py-4">{audit.map((entry) => <details key={entry.id} className="rounded-xl border border-default-200 p-4"><summary className="cursor-pointer text-sm">{entry.created_at} · {entry.actor_type} #{entry.actor_id} · {entry.action}</summary><div className="mt-4 grid gap-3 md:grid-cols-2"><div><p className="mb-2 font-medium">修改前</p><pre className="max-h-80 overflow-auto rounded-lg bg-default-50 p-3 text-xs">{JSON.stringify(entry.before_data, null, 2)}</pre></div><div><p className="mb-2 font-medium">修改后</p><pre className="max-h-80 overflow-auto rounded-lg bg-default-50 p-3 text-xs">{JSON.stringify(entry.after_data, null, 2)}</pre></div></div></details>)}{!audit.length && <p className="text-default-500">暂无变更记录</p>}<Pagination page={auditPage} total={Math.max(1, Math.ceil(auditTotal / 20))} onChange={setAuditPage} /></div></Tab>
    </Tabs></CardBody></Card> : <Card><CardBody className="gap-4 p-5"><div className="flex flex-wrap gap-3"><Input label="搜索站点、域名或代理" className="max-w-md" value={search} onValueChange={(value) => { setSearch(value); setPage(1); }} /><Select label="状态" className="max-w-xs" selectedKeys={[status || 'all']} onChange={(event) => { setStatus(event.target.value === 'all' ? '' : event.target.value); setPage(1); }}><SelectItem key="all">全部</SelectItem><SelectItem key="active">正常经营</SelectItem><SelectItem key="paused">暂停新销售</SelectItem></Select></div>{loading && <Spinner size="sm" />}<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-default-200"><th className="py-3">站点</th><th>代理</th><th>域名</th><th>模式</th><th>状态</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-default-100"><td className="py-4 font-medium">{row.name}<span className="ml-2 text-xs text-default-400">#{row.id}</span></td><td>{row.owner_name || '未分配'}</td><td className="max-w-xs break-all">{row.domains.join('、')}</td><td>{row.branding === 'white_label' ? '白牌' : '联营'} · {{ cdk: '纯CDK', online: '在线', hybrid: '在线＋CDK' }[row.sales_mode]}</td><td>{row.status === 'active' ? '正常' : '暂停'}</td><td><Button size="sm" variant="flat" onPress={() => void open(row.id)}>管理</Button></td></tr>)}</tbody></table></div>{!rows.length && !loading && <p className="py-6 text-center text-default-500">暂无站点，请创建或调整筛选。</p>}<Pagination page={page} total={Math.max(1, Math.ceil(total / 20))} onChange={setPage} /></CardBody></Card>}
    <Modal isOpen={createOpen} onClose={() => !busy && setCreateOpen(false)} isDismissable={!busy}><ModalContent><ModalHeader>创建代理站点</ModalHeader><ModalBody><Input label="站点名称" isRequired value={name} onValueChange={setName} /><Input label="所属代理 ID" type="number" value={owner} onValueChange={setOwner} isReadOnly={!can('site.financial.manage')} description="未分配时可先配置站点；绑定代理需要财务配置权限。" /><Textarea label="访问域名" isRequired value={domains} onValueChange={setDomains} description="每行一个已配置好的域名。新域名精确匹配，不修改网关。" /><Select label="初始预设" selectedKeys={[preset]} onChange={(event) => setPreset(event.target.value)}><SelectItem key="white_cdk">白牌 · 纯CDK</SelectItem><SelectItem key="white_online">白牌 · 在线购买</SelectItem><SelectItem key="white_hybrid">白牌 · 在线＋CDK</SelectItem><SelectItem key="branded_online">联营 · 在线购买</SelectItem></Select><Alert color="default" title="新站点默认不授权套餐、不计佣" description="创建后进入详情设置套餐、价格边界、代理权限和佣金比例。" /></ModalBody><ModalFooter><Button variant="flat" isDisabled={busy} onPress={() => setCreateOpen(false)}>取消</Button><Button color="primary" isLoading={busy} isDisabled={!name.trim() || !domains.trim()} onPress={() => void create()}>创建并配置</Button></ModalFooter></ModalContent></Modal>
  </section>;
}
