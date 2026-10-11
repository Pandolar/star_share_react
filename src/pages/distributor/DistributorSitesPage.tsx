import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, CardBody, Pagination, Select, SelectItem, Spinner, Tab, Tabs } from '@heroui/react';
import { Link } from 'react-router-dom';
import siteApi, { siteData } from '../../services/siteApi';
import type { DistributorSite, SiteAuditLog, SitePackage, SitePackagePatch } from '../../types/site';
import { showToast } from '../../components/Toast';
import SiteEditor from '../../components/site/SiteEditor';
import SitePackageEditor from '../../components/site/SitePackageEditor';
import CommissionWorkspace from '../../components/site/CommissionWorkspace';

export default function DistributorSitesPage() {
  const [sites, setSites] = useState<DistributorSite[]>([]);
  const [siteId, setSiteId] = useState<number | null>(null);
  const [site, setSite] = useState<DistributorSite | null>(null);
  const [packages, setPackages] = useState<SitePackage[]>([]);
  const [audit, setAudit] = useState<SiteAuditLog[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const all: DistributorSite[] = [];
        let page = 1; let total = Infinity;
        while (all.length < total) {
          const response = await siteApi.listDistributorSites({ current_page: page, page_size: 100 });
          const next = siteData(response); if (!next.length) break;
          all.push(...next); total = response.total || all.length; page += 1;
        }
        if (active) { setSites(all); setSiteId((current) => current ?? all[0]?.id ?? null); }
      } catch (caught) { if (active) setError(caught instanceof Error ? caught.message : '站点加载失败'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [revision]);
  useEffect(() => {
    if (!siteId) return;
    let active = true;
    setLoading(true); setError('');
    void Promise.all([siteApi.getDistributorSite(siteId), siteApi.getDistributorSitePackages(siteId)]).then(([a, b]) => {
      const detail = siteData(a); const catalog = siteData(b);
      if (active) { setSite(detail); setPackages(catalog.items); }
    }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : '站点详情加载失败'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [siteId, revision]);
  useEffect(() => {
    if (!siteId) return;
    let active = true;
    void siteApi.getDistributorSiteAudit(siteId, { current_page: auditPage, page_size: 20 }).then((response) => {
      const rows = siteData(response); if (active) { setAudit(rows); setAuditTotal(response.total || 0); }
    }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : '记录加载失败'); });
    return () => { active = false; };
  }, [siteId, auditPage, site?.revision]);

  const save = async (changes: Partial<DistributorSite>): Promise<boolean> => {
    if (!site) return false;
    setBusy(true);
    try { const next = siteData(await siteApi.updateDistributorSite({ id: site.id, revision: site.revision, ...changes })); setSite(next); setSites((rows) => rows.map((row) => row.id === next.id ? next : row)); showToast('站点配置已发布', 'success'); return true; }
    catch (caught) { const message = caught instanceof Error ? caught.message : '发布失败'; setError(message); showToast(message, 'error'); return false; }
    finally { setBusy(false); }
  };
  const savePackages = async (items: SitePackagePatch[]): Promise<boolean> => {
    if (!site) return false;
    setBusy(true);
    try { const next = siteData(await siteApi.updateDistributorSitePackages(site.id, site.revision, items)); setPackages(next.items); setSite({ ...site, revision: next.site_revision }); showToast('套餐变更已发布', 'success'); return true; }
    catch (caught) { const message = caught instanceof Error ? caught.message : '套餐保存失败'; setError(message); showToast(message, 'error'); return false; }
    finally { setBusy(false); }
  };

  return <main className="mx-auto min-h-screen max-w-7xl space-y-6 p-5 sm:p-8">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">站点经营</h1><p className="mt-1 text-sm text-default-500">管理获授权的内容与商品，查看历史销售和月度佣金对账；实际打款在线下沟通。</p></div><div className="flex gap-2"><Button as={Link} to="/distributor/dashboard" variant="flat">账号与卡密采购</Button><Button variant="flat" isDisabled={busy} onPress={() => setRevision((value) => value + 1)}>重新加载</Button></div></header>
    {error && <Alert color="danger" title="操作未完成" description={error} />}
    <Tabs aria-label="代理经营工作区" variant="underlined"><Tab key="sites" title="我的站点"><div className="space-y-5 py-3">
      {sites.length > 0 ? <Select label="当前站点" className="max-w-md" selectedKeys={siteId ? [String(siteId)] : []} onChange={(event) => { setSiteId(Number(event.target.value)); setAuditPage(1); }} items={sites}>{(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}</Select> : !loading && <Alert color="warning" title="暂无获分配站点" description="管理员分配站点后，可在这里维护公告、价格和功能。历史销售仍可在佣金页查看。" />}
      {loading ? <Spinner label="正在加载站点…" /> : site && <Card><CardBody className="gap-4 p-5"><Tabs aria-label="本站经营项目" variant="underlined"><Tab key="config" title="站点配置"><SiteEditor site={site} distributor busy={busy} onSave={save} /></Tab><Tab key="packages" title="套餐与售价"><SitePackageEditor site={site} items={packages} distributor busy={busy} onSave={savePackages} /></Tab><Tab key="sales" title="本站销售"><CommissionWorkspace distributor fixedSiteId={site.id} /></Tab><Tab key="audit" title="我的修改记录"><div className="space-y-3 py-3">{audit.map((entry) => <details key={entry.id} className="rounded-xl border border-default-200 p-4"><summary>{entry.created_at} · {entry.action}</summary><pre className="mt-3 max-h-80 overflow-auto bg-default-50 p-3 text-xs">{JSON.stringify({ before: entry.before_data, after: entry.after_data }, null, 2)}</pre></details>)}{!audit.length && <p className="text-default-500">暂无本人修改记录</p>}<Pagination page={auditPage} total={Math.max(1, Math.ceil(auditTotal / 20))} onChange={setAuditPage} /></div></Tab></Tabs></CardBody></Card>}
    </div></Tab><Tab key="finance" title="月度对账与全部销售"><div className="py-3"><CommissionWorkspace distributor /></div></Tab></Tabs>
  </main>;
}
