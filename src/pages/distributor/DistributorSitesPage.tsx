import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, CardBody, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Pagination, Select, SelectItem, Spinner, Tab, Tabs, useDisclosure } from '@heroui/react';
import siteApi, { siteData } from '../../services/siteApi';
import distributorApiService, { DistributorInfo } from '../../services/distributorApi';
import type { DistributorSite, SiteAuditLog, SitePackage, SitePackagePatch } from '../../types/site';
import { showToast } from '../../components/Toast';
import SiteEditor from '../../components/site/SiteEditor';
import SitePackageEditor from '../../components/site/SitePackageEditor';
import CommissionWorkspace from '../../components/site/CommissionWorkspace';

export default function DistributorSitesPage() {
  const [distributor, setDistributor] = useState<DistributorInfo | null>(null);
  const proposeModal = useDisclosure();
  const [proposeForm, setProposeForm] = useState({ name: '', domain: '' });
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
    void distributorApiService.getSettings().then((response) => {
      if (response.code === 20000 && response.data) setDistributor(response.data);
    }).catch(() => undefined);
  }, []);
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

  const isSubAccount = Boolean(distributor?.parent_distributor_id);
  const proposeSite = async () => {
    setBusy(true);
    try {
      const response = await distributorApiService.proposeSite({ name: proposeForm.name.trim(), domain: proposeForm.domain.trim() });
      if (response.code !== 20000) throw new Error(response.msg || '提交失败');
      showToast('站点已提交，等待一级代理审批', 'success');
      proposeModal.onClose();
      setProposeForm({ name: '', domain: '' });
      setRevision((value) => value + 1);
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : '提交失败', 'error');
    } finally {
      setBusy(false);
    }
  };

    return <main className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">站点经营</h1><p className="mt-1 text-sm text-default-500">维护获授权站点的公告、功能、套餐与售价，并查看本站销售。</p></div><div className="flex gap-2">{isSubAccount && <Button color="primary" variant="flat" onPress={proposeModal.onOpen}>申请站点</Button>}<Button variant="flat" isDisabled={busy} onPress={() => setRevision((value) => value + 1)}>重新加载</Button></div></header>
    {error && <Alert color="danger" title="操作未完成" description={error} />}
    {site?.status === 'pending_approval' && <Alert color="warning" title="站点待一级代理审批" description="批准后站点才会对外生效；可以先完善公告与配置，审批通过前不会产生销售。" />}
    <Modal isOpen={proposeModal.isOpen} onOpenChange={proposeModal.onOpenChange} size="sm">
      <ModalContent>
        <ModalHeader>申请站点</ModalHeader>
        <ModalBody className="gap-3">
          <p className="text-xs text-default-500">提交后由一级代理审批，批准后站点才生效。佣金规则沿用一级代理站点的配置。</p>
          <Input label="站点名称" value={proposeForm.name} onValueChange={(value) => setProposeForm((current) => ({ ...current, name: value }))} isRequired />
          <Input label="站点域名" placeholder="如 shop.example.com" value={proposeForm.domain} onValueChange={(value) => setProposeForm((current) => ({ ...current, domain: value }))} isRequired />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={proposeModal.onClose}>取消</Button>
          <Button color="primary" isLoading={busy} isDisabled={!proposeForm.name.trim() || !proposeForm.domain.trim()} onPress={() => void proposeSite()}>提交申请</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
    <div className="space-y-5">
      {sites.length > 0 ? <Select label="当前站点" className="max-w-md" selectedKeys={siteId ? [String(siteId)] : []} onSelectionChange={(keys) => { setSiteId(Number(Array.from(keys)[0])); setAuditPage(1); }} items={sites}>{(item) => <SelectItem key={String(item.id)}>{item.name}</SelectItem>}</Select> : !loading && <Alert color="warning" title="暂无获分配站点" description="管理员分配站点后，可在这里维护公告、价格和功能。历史销售仍可在左侧「佣金对账」查看。" />}
      {loading ? <Spinner label="正在加载站点…" /> : site && <Card><CardBody className="gap-4 p-5"><Tabs aria-label="本站经营项目" variant="underlined"><Tab key="config" title="站点配置"><SiteEditor site={site} distributor busy={busy} onSave={save} /></Tab><Tab key="packages" title="套餐与售价"><SitePackageEditor site={site} items={packages} distributor busy={busy} onSave={savePackages} /></Tab><Tab key="sales" title="本站销售"><CommissionWorkspace distributor fixedSiteId={site.id} /></Tab><Tab key="audit" title="我的修改记录"><div className="space-y-3 py-3">{audit.map((entry) => <details key={entry.id} className="rounded-xl border border-default-200 p-4"><summary>{entry.created_at} · {entry.action}</summary><pre className="mt-3 max-h-80 overflow-auto bg-default-50 p-3 text-xs">{JSON.stringify({ before: entry.before_data, after: entry.after_data }, null, 2)}</pre></details>)}{!audit.length && <p className="text-default-500">暂无本人修改记录</p>}<Pagination page={auditPage} total={Math.max(1, Math.ceil(auditTotal / 20))} onChange={setAuditPage} /></div></Tab></Tabs></CardBody></Card>}
    </div>
  </main>;
}
