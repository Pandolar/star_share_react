import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Chip, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Pagination, Switch } from '@heroui/react';
import type { DistributorSite, SitePackage, SitePackagePatch } from '../../types/site';

interface Props {
  site: DistributorSite;
  items: SitePackage[];
  distributor?: boolean;
  canManage?: boolean;
  canFinancial?: boolean;
  busy: boolean;
  onSave: (items: SitePackagePatch[]) => Promise<boolean>;
}

export default function SitePackageEditor({ site, items, distributor = false, canManage = true, canFinancial = false, busy, onSave }: Props) {
  const [draft, setDraft] = useState(items);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { setDraft(items); }, [items]);
  const editPrice = canManage && (distributor ? site.permissions.edit_prices === true : canFinancial);
  const editState = canManage && (!distributor || site.permissions.edit_packages === true);
  const visible = useMemo(() => draft.filter((row) => `${row.name} ${row.category} ${row.package_id}`.toLowerCase().includes(search.toLowerCase())), [draft, search]);
  const pages = Math.max(1, Math.ceil(visible.length / 15));
  const current = visible.slice((Math.min(page, pages) - 1) * 15, Math.min(page, pages) * 15);
  const patches: SitePackagePatch[] = [];
  for (const row of draft) {
    const original = items.find((item) => item.package_id === row.package_id);
    if (!original) continue;
    const fields: Array<keyof SitePackagePatch> = ['allowed', 'enabled', 'custom_price', 'min_price', 'max_price', 'min_net_amount'];
    const patch: SitePackagePatch = { package_id: row.package_id };
    for (const field of fields) if (row[field] !== original[field]) Object.assign(patch, { [field]: row[field] });
    if (Object.keys(patch).length > 1) patches.push(patch);
  }
  const change = (id: number, patch: Partial<SitePackage>) => setDraft((rows) => rows.map((row) => row.package_id === id ? { ...row, ...patch } : row));
  const bulk = (enabled: boolean) => setDraft((rows) => rows.map((row) => visible.some((item) => item.package_id === row.package_id) && row.allowed && Number(row.main_price) > 0 ? { ...row, enabled } : row));

  return <div className="space-y-4">
    <Alert color="default" title={site.sales_mode === 'cdk' ? '纯 CDK 模式：这里只控制目录展示' : '本站售价独立于主站和其他代理'} description={`授权控制本站的新销售，不改变套餐权益、已有订阅和已售卡密。自定义售价不影响卡密采购成本；主站下架后不能继续新售。${site.commission_enabled && site.commission_mode === 'margin' ? '当前为差价归代理方式：“平台固定收入（进货价）”即每单平台固定留存，代理无论卖多少钱平台只收这个数，超出部分全部计为代理佣金（预计佣金列未扣优惠与邀请奖励现金成本）。' : ''}`} />
    <div className="flex flex-wrap items-center gap-3"><Input label="搜索套餐" value={search} onValueChange={(value) => { setSearch(value); setPage(1); }} className="max-w-sm" /><Button variant="flat" isDisabled={!editState || busy} onPress={() => bulk(true)}>开启筛选结果</Button><Button variant="flat" isDisabled={!editState || busy} onPress={() => bulk(false)}>关闭筛选结果</Button><Button color="primary" isDisabled={!patches.length || busy} onPress={() => setConfirm(true)}>预览 {patches.length} 项变更</Button></div>
    <div className="overflow-x-auto rounded-xl border border-default-200"><table className="w-full min-w-[950px] text-sm"><thead className="bg-default-50"><tr className="text-left"><th className="p-3">套餐与状态</th>{!distributor && <th className="p-3">授权</th>}<th className="p-3">本站开启</th><th className="p-3">售价来源 / 金额</th><th className="p-3">价格边界</th><th className="p-3">{site.commission_mode === 'margin' ? '平台固定收入（进货价）' : '最低净收入'}</th><th className="p-3">预计佣金</th></tr></thead><tbody>{current.map((row) => {
      const effective = row.custom_price === null ? row.main_price : row.custom_price;
      const estimate = !site.commission_enabled ? 0
        : site.commission_mode === 'margin'
          ? Math.max(0, Number(effective) - Number(row.min_net_amount || 0))
          : Number(effective) * Number(site.commission_rate);
      return <tr key={row.package_id} className="border-t border-default-100 align-top"><td className="p-3"><p className="font-medium">{row.name}</p><p className="my-1 text-xs text-default-500">#{row.package_id} · {row.category} · {row.duration} 天 · 主站 ¥{row.main_price}</p><Chip size="sm" variant="flat" color={row.available ? 'success' : 'default'}>{row.available ? '已发布可售' : row.unavailable_reason || '未开启'}</Chip></td>
        {!distributor && <td className="p-3"><Switch size="sm" aria-label={`${row.name}授权`} isSelected={row.allowed} isDisabled={!canManage || busy || Number(row.main_price) <= 0} onValueChange={(allowed) => change(row.package_id, { allowed, enabled: allowed ? row.enabled : false })} /></td>}
        <td className="p-3"><Switch size="sm" aria-label={`${row.name}开启`} isSelected={row.enabled} isDisabled={!editState || !row.allowed || busy || Number(row.main_price) <= 0} onValueChange={(enabled) => change(row.package_id, { enabled })} /></td>
        <td className="space-y-2 p-3"><Input size="sm" aria-label={`${row.name}自定义售价`} type="number" min="0.01" step="0.01" value={row.custom_price ?? ''} placeholder={`继承 ¥${row.main_price}`} isReadOnly={!editPrice || site.sales_mode === 'cdk'} onValueChange={(value) => change(row.package_id, { custom_price: value === '' ? null : value })} /><Button size="sm" variant="light" isDisabled={!editPrice || row.custom_price === null} onPress={() => change(row.package_id, { custom_price: null })}>恢复继承</Button>{site.sales_mode === 'cdk' && <p className="text-xs text-default-500">客户不显示价格</p>}</td>
        <td className="space-y-2 p-3"><Input size="sm" label="最低售价" type="number" step="0.01" value={row.min_price} isReadOnly={distributor || !canFinancial} onValueChange={(min_price) => change(row.package_id, { min_price })} /><Input size="sm" label="最高售价" placeholder="不限制" type="number" step="0.01" value={row.max_price ?? ''} isReadOnly={distributor || !canFinancial} onValueChange={(value) => change(row.package_id, { max_price: value === '' ? null : value })} /></td>
        <td className="p-3"><Input size="sm" aria-label={`${row.name}最低净收入`} type="number" min="0" step="0.01" value={row.min_net_amount} isReadOnly={distributor || !canFinancial} onValueChange={(min_net_amount) => change(row.package_id, { min_net_amount })} /></td><td className="p-3">{site.sales_mode === 'cdk' ? '不计佣' : `¥${Number.isFinite(estimate) ? estimate.toFixed(2) : '—'}`}<p className="mt-2 text-xs text-default-500">未扣优惠，仅作预览</p></td></tr>;
    })}</tbody></table></div>
    {!current.length && <p className="py-5 text-center text-default-500">暂无匹配套餐</p>}
    <Pagination aria-label="套餐分页" page={Math.min(page, pages)} total={pages} onChange={setPage} />
    <Modal isOpen={confirm} onClose={() => !busy && setConfirm(false)} isDismissable={!busy} scrollBehavior="inside"><ModalContent><ModalHeader>确认发布套餐变更</ModalHeader><ModalBody><p>基于站点版本 {site.revision}，修改 {patches.length} 个套餐：</p>{patches.map((patch) => { const row = draft.find((item) => item.package_id === patch.package_id); return <div key={patch.package_id} className="rounded-lg bg-default-50 p-3"><p className="font-medium">{row?.name}</p><p className="text-sm text-default-600">{Object.entries(patch).filter(([key]) => key !== 'package_id').map(([key, value]) => `${({ allowed: '授权', enabled: '开启', custom_price: '自定义价', min_price: '最低价', max_price: '最高价', min_net_amount: '最低净收入' } as Record<string, string>)[key]}：${value === null ? '继承/不限制' : typeof value === 'boolean' ? (value ? '是' : '否') : value}`).join('；')}</p></div>; })}<p className="text-xs text-default-500">新价格仅影响新订单，有效待付款订单保留原快照。</p></ModalBody><ModalFooter><Button variant="flat" isDisabled={busy} onPress={() => setConfirm(false)}>返回检查</Button><Button color="primary" isLoading={busy} onPress={async () => { if (await onSave(patches)) setConfirm(false); }}>确认发布</Button></ModalFooter></ModalContent></Modal>
  </div>;
}
