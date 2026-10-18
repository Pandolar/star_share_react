import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, CardBody, Chip, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Switch, Tab, Tabs, Textarea } from '@heroui/react';
import type { DistributorSite, SiteEditPermission } from '../../types/site';
import { siteFeatureLabels, sitePermissionLabels } from '../../types/site';
import { UserMarkdown } from '../UserMarkdown';

interface Props {
  site: DistributorSite;
  distributor?: boolean;
  canManage?: boolean;
  canFinancial?: boolean;
  busy: boolean;
  onSave: (changes: Partial<DistributorSite>) => Promise<boolean>;
}

const fieldLabels: Record<string, string> = {
  name: '站点名称', distributor_id: '所属代理', status: '经营状态', branding: '品牌展示', sales_mode: '销售方式',
  domains: '域名', logo_url: 'Logo', customer_service_url: '客服链接', notice_mode: '公告来源', notice: '公告内容',
  features: '站点功能', feature_limits: '功能许可', permissions: '编辑权限', commission_enabled: '计佣开关',
  commission_mode: '佣金方式', commission_rate: '佣金比例', allow_reward_stacking: '邀请奖励叠加',
};

export default function SiteEditor({ site, distributor = false, canManage = true, canFinancial = false, busy, onSave }: Props) {
  const [draft, setDraft] = useState<DistributorSite>(site);
  const [domainText, setDomainText] = useState(site.domains.join('\n'));
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { setDraft(site); setDomainText(site.domains.join('\n')); }, [site]);
  const allowed = (permission: SiteEditPermission) => canManage && (!distributor || site.permissions[permission] === true);
  const patch = (change: Partial<DistributorSite>) => setDraft((current) => ({ ...current, ...change }));
  const changed: Partial<DistributorSite> = {};
  const keys: Array<keyof DistributorSite> = ['name', 'status', 'distributor_id', 'branding', 'sales_mode', 'logo_url', 'customer_service_url', 'notice_mode', 'notice', 'features', 'feature_limits', 'permissions', 'commission_enabled', 'commission_mode', 'commission_rate', 'allow_reward_stacking'];
  for (const key of keys) {
    if (JSON.stringify(draft[key]) !== JSON.stringify(site[key])) Object.assign(changed, { [key]: draft[key] });
  }
  const domains = Array.from(new Set(domainText.split(/[\n,，]+/).map((value) => value.trim().toLowerCase()).filter(Boolean)));
  if (!distributor && JSON.stringify(domains) !== JSON.stringify(site.domains)) changed.domains = domains;
  const hasChanges = Object.keys(changed).length > 0;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2"><Chip variant="flat">版本 {site.revision}</Chip><Chip color={site.status === 'active' ? 'success' : 'warning'} variant="flat">{site.status === 'active' ? '正常经营' : '暂停新销售'}</Chip>{site.domains.map((domain) => <Chip key={domain} size="sm" variant="bordered">{domain}</Chip>)}</div>
      <Button color="primary" isDisabled={!hasChanges || !canManage || busy} onPress={() => setConfirm(true)}>预览并发布变更</Button>
    </div>
    {distributor && <div className="flex flex-wrap gap-2">{Object.entries(sitePermissionLabels).map(([key, label]) => <Chip key={key} size="sm" variant="flat" color={site.permissions[key as SiteEditPermission] ? 'success' : 'default'}>{label}：{site.permissions[key as SiteEditPermission] ? '可编辑' : '管理员锁定'}</Chip>)}</div>}
    <Tabs aria-label="站点配置分类" variant="underlined">
      <Tab key="base" title="基础与品牌"><Card shadow="none"><CardBody className="grid gap-5 p-5 md:grid-cols-2">
        <Input label="站点名称" value={draft.name} maxLength={120} isReadOnly={!allowed('edit_branding')} onValueChange={(name) => patch({ name })} />
        <Select label="品牌展示" selectedKeys={[draft.branding]} isDisabled={!allowed('edit_branding')} onChange={(event) => patch({ branding: event.target.value as DistributorSite['branding'] })}><SelectItem key="white_label">白牌 · 使用本站品牌</SelectItem><SelectItem key="branded">联营 · 保留主站品牌</SelectItem></Select>
        <Input label="Logo 地址" placeholder="/img/logo.png 或 https://…" value={draft.logo_url || ''} isReadOnly={!allowed('edit_branding')} onValueChange={(logo_url) => patch({ logo_url })} />
        <Input label="客服地址" placeholder="留空使用已启用的内置客服" value={draft.customer_service_url || ''} isReadOnly={!allowed('edit_branding')} onValueChange={(customer_service_url) => patch({ customer_service_url })} />
        <Select label="销售方式" selectedKeys={[draft.sales_mode]} isDisabled={distributor || !canManage} onChange={(event) => patch({ sales_mode: event.target.value as DistributorSite['sales_mode'] })}><SelectItem key="cdk">纯 CDK 兑换</SelectItem><SelectItem key="online">在线购买与续费</SelectItem><SelectItem key="hybrid">在线购买＋CDK</SelectItem></Select>
        <Select label="经营状态" selectedKeys={[draft.status]} isDisabled={distributor || !canManage} onChange={(event) => patch({ status: event.target.value as DistributorSite['status'] })}><SelectItem key="active">正常经营</SelectItem><SelectItem key="paused">暂停新销售</SelectItem></Select>
        {!distributor && <Input label="所属代理 ID" type="number" value={draft.distributor_id?.toString() || ''} isReadOnly={!canFinancial} description="留空为未分配站点；更改归属不改变历史订单。" onValueChange={(value) => patch({ distributor_id: value ? Number(value) : null })} />}
        {!distributor && <Textarea label="访问域名" value={domainText} onValueChange={setDomainText} isReadOnly={!canManage} description="每行一个已配置好的域名；本功能不修改 DNS 或网关。" />}
        <Alert className="md:col-span-2" color="default" title="账号与权益保持共享" description="站点控制展示和新交易，不限制用户跨站登录。暂停销售不会撤销已购权益或已有有效卡密。代理站不提供跨节点测速跳转。" />
      </CardBody></Card></Tab>
      <Tab key="notice" title="站点公告"><Card shadow="none"><CardBody className="gap-5 p-5">
        <Select label="公告来源" className="max-w-sm" selectedKeys={[draft.notice_mode]} isDisabled={!allowed('edit_notice')} onChange={(event) => patch({ notice_mode: event.target.value as DistributorSite['notice_mode'] })}><SelectItem key="custom">自定义公告</SelectItem><SelectItem key="inherit">继承主站公告</SelectItem><SelectItem key="hidden">不显示公告</SelectItem></Select>
        {draft.notice_mode === 'inherit' && <Alert color="warning" title="继承的公告可能含主站链接" description="白牌站建议自定义公告；此处不对管理员提供的内容做跨站隐藏。" />}
        {draft.notice_mode === 'custom' && <div className="grid gap-5 lg:grid-cols-2"><Textarea label="公告内容" minRows={10} maxLength={20000} value={draft.notice || ''} isReadOnly={!allowed('edit_notice')} onValueChange={(notice) => patch({ notice })} description="支持 Markdown，不执行 HTML 或脚本。" /><div className="rounded-xl border border-default-200 p-5"><h3 className="mb-4 font-medium">发布预览</h3>{draft.notice ? <UserMarkdown>{draft.notice}</UserMarkdown> : <p className="text-default-400">公告内容为空</p>}</div></div>}
      </CardBody></Card></Tab>
      <Tab key="features" title="功能与权限"><Card shadow="none"><CardBody className="gap-5 p-5">
        <p className="text-sm text-default-500">主站总开关、管理员许可和本站选择共同决定结果。邀请入口与实际发奖分别控制。</p>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-default-200 text-left"><th className="py-3">功能</th>{!distributor && <th>管理员许可</th>}<th>本站选择</th><th>已发布结果</th></tr></thead><tbody>{Object.entries(siteFeatureLabels).map(([key, label]) => <tr key={key} className="border-b border-default-100"><td className="py-3 font-medium">{label}</td>{!distributor && <td><Switch size="sm" aria-label={`${label}许可`} isSelected={draft.feature_limits?.[key] !== false} isDisabled={!canManage} onValueChange={(value) => patch({ feature_limits: { ...draft.feature_limits, [key]: value } })} /></td>}<td><Switch size="sm" aria-label={`${label}开关`} isSelected={draft.features?.[key] ?? (key === 'register' || key === 'customer_service')} isDisabled={!allowed('edit_features') || draft.feature_limits?.[key] === false} onValueChange={(value) => patch({ features: { ...draft.features, [key]: value } })} /></td><td><Chip size="sm" variant="flat" color={site.effective_features?.[key] ? 'success' : 'default'}>{site.effective_features?.[key] ? '开启' : '关闭'}</Chip></td></tr>)}</tbody></table></div>
        {!distributor && <div><h3 className="mb-4 font-semibold">允许代理修改</h3><div className="flex flex-wrap gap-6">{Object.entries(sitePermissionLabels).map(([key, label]) => <Switch key={key} size="sm" isSelected={draft.permissions?.[key as SiteEditPermission] === true} isDisabled={!canManage || (key === 'edit_prices' && !canFinancial)} onValueChange={(value) => patch({ permissions: { ...draft.permissions, [key]: value } })}>{label}</Switch>)}</div><p className="mt-3 text-xs text-default-500">撤销编辑权限只锁定编辑，不删除已发布内容。代理不能修改销售方式、域名、归属或财务规则。</p></div>}
      </CardBody></Card></Tab>
      <Tab key="commission" title="分佣规则"><Card shadow="none"><CardBody className="gap-5 p-5">
        <Switch isSelected={draft.commission_enabled} isDisabled={distributor || !canFinancial} onValueChange={(commission_enabled) => patch({ commission_enabled })}>在线销售计佣</Switch>
        <Select label="佣金方式" className="max-w-md" selectedKeys={[draft.commission_mode || 'rate']} isDisabled={distributor || !canFinancial} onChange={(event) => patch({ commission_mode: event.target.value as DistributorSite['commission_mode'] })} description="按站点二选一，仅管理员可改；写入新订单后固定，历史订单不重算。">
          <SelectItem key="rate">比例分成 · 按实付百分比计提</SelectItem>
          <SelectItem key="margin">差价归代理 · 平台每单只留固定成本</SelectItem>
        </Select>
        {(draft.commission_mode || 'rate') === 'rate' ? <>
          <Input label="佣金比例（%）" type="number" min="0" max="100" step="0.01" className="max-w-sm" value={String(Number(draft.commission_rate || 0) * 100)} isReadOnly={distributor || !canFinancial} onValueChange={(value) => patch({ commission_rate: String(Number(value) / 100) })} description="代理佣金 = 实付金额 × 比例。比例随卖价等比分成：代理卖价越高双方收入同比越高。" />
          <Alert color="primary" title="比例分成怎么算" description="例：主站价 ¥100、比例 50%，代理定价 ¥160 → 代理佣金 ¥80，平台净得 ¥80。若代理提价到 ¥200 → 佣金 ¥100，平台 ¥100。想让平台恰好净得固定成本（如 ¥50），比例 = 1 − 成本÷代理定价（50÷160 → 68.75%），但代理改价后平台净额会跟着变。" />
        </> : <>
          <Alert color="primary" title="差价归代理怎么算" description="平台每单固定留存 = “套餐与价格”页该套餐的“平台固定收入（进货价）”× 份数；代理佣金 = 实付金额 − 邀请奖励现金成本 − 平台固定收入，下限为 0。代理无论卖多少钱平台只收固定数，超出部分全部归代理，佣金比例输入框在此方式下不生效。例：进货价设 ¥50、代理定价 ¥160 → 代理佣金 ¥110，平台只收 ¥50；代理提价到 ¥200 → 佣金 ¥150，平台仍 ¥50。实付不足覆盖进货价时订单直接拒绝。" />
          <Alert color="warning" title="别忘了设置每个套餐的进货价" description="差价方式下请到“套餐与价格”页为每个已授权套餐填写“平台固定收入（进货价）”，默认为 0 表示平台不保底、全部实付都计为代理佣金。建议同时设置最低/最高售价边界，控制代理定价范围。" />
        </>}
        <Switch isSelected={draft.allow_reward_stacking} isDisabled={distributor || !canFinancial} onValueChange={(allow_reward_stacking) => patch({ allow_reward_stacking })}>明确允许邀请奖励与代理佣金叠加</Switch>
        <Alert color="warning" title="只影响新建结账" description="方式和费率写入订单后固定；有效支付才计佣，CDK 兑换不重复计佣。佣金页提供月度对账与退款冲减，打款在群聊线下沟通，不清零累计值；采购余额独立。" />
      </CardBody></Card></Tab>
    </Tabs>
    <Modal isOpen={confirm} onClose={() => !busy && setConfirm(false)} isDismissable={!busy}>
      <ModalContent><ModalHeader>确认发布站点变更</ModalHeader><ModalBody><p>站点：{site.name} · 基于版本 {site.revision}</p><ul className="list-inside list-disc space-y-2">{Object.keys(changed).map((key) => <li key={key}>{fieldLabels[key] || key}</li>)}</ul><p className="text-sm text-default-500">保存后立即生效并记录修改前后值，历史订单不重新计价。</p></ModalBody><ModalFooter><Button variant="flat" isDisabled={busy} onPress={() => setConfirm(false)}>返回检查</Button><Button color="primary" isLoading={busy} onPress={async () => { if (await onSave(changed)) setConfirm(false); }}>确认发布</Button></ModalFooter></ModalContent>
    </Modal>
  </div>;
}
