import React, { useState } from 'react';
import { Button, Card, CardBody, CardHeader, Input, NumberInput, Switch, Textarea } from '@heroui/react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { InviteCashbackCampaign, InviteCashbackConfig, InviteCashbackPackageRule } from '../../types/admin';

interface Props {
  config: InviteCashbackConfig;
  isLoading: boolean;
  isSaving: boolean;
  onChange: (config: InviteCashbackConfig) => void;
  onSave: () => void;
}

const createCampaign = (): InviteCashbackCampaign => ({
  id: '', name: '', enabled: false, auto_enroll_eligible: false, starts_at: '', ends_at: '',
  eligibility: { min_account_age_days: 0, min_cash_paid_amount: 0, min_package_duration_days: 0 },
  cashback: { default_rate: 0, min_order_basis_amount: 0, max_reward_orders_per_invitee: 0, package_rules: {} },
  invitee_reward: { enabled: false, duration_ratio: 0 },
  copywriting: { headline: '', share_template: '', ended_message: '' },
});

const toLocalDateTime = (value: string) => value ? value.slice(0, 16) : '';
const toIsoDateTime = (value: string) => value ? new Date(value).toISOString() : '';

const InviteCashbackConfigEditor: React.FC<Props> = ({ config, isLoading, isSaving, onChange, onSave }) => {
  const [newPackageIds, setNewPackageIds] = useState<Record<number, string>>({});
  const updateCampaign = (index: number, update: (campaign: InviteCashbackCampaign) => InviteCashbackCampaign) => {
    onChange({ ...config, campaigns: config.campaigns.map((campaign, i) => i === index ? update(campaign) : campaign) });
  };
  const updateRule = (index: number, packageId: string, update: (rule: InviteCashbackPackageRule) => InviteCashbackPackageRule) => {
    updateCampaign(index, campaign => ({ ...campaign, cashback: { ...campaign.cashback, package_rules: { ...campaign.cashback.package_rules, [packageId]: update(campaign.cashback.package_rules[packageId]) } } }));
  };

  return <Card>
    <CardHeader className="flex items-center justify-between gap-3 flex-wrap">
      <div><div className="font-medium">限时邀请返现活动</div><p className="text-sm text-default-500">仅自营站生效；每场活动可选择是否给全部符合资格用户默认开启。</p></div>
      <Button color="primary" startContent={<Save className="w-4 h-4" />} isLoading={isSaving} isDisabled={isLoading} onPress={onSave}>保存返现配置</Button>
    </CardHeader>
    <CardBody className="space-y-6">
      {isLoading ? <div className="py-8 text-center text-default-500">加载返现配置中...</div> : <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Switch isSelected={config.enabled} onValueChange={enabled => onChange({ ...config, enabled })}>启用返现活动</Switch>
          <Switch isSelected={config.withdrawal.enabled} onValueChange={enabled => onChange({ ...config, withdrawal: { ...config.withdrawal, enabled } })}>开放提现</Switch>
          <Switch isSelected={config.purchase_credit.enabled} onValueChange={enabled => onChange({ ...config, purchase_credit: { enabled } })}>允许返现余额抵扣个人套餐</Switch>
          <NumberInput label="最低提现金额" value={config.withdrawal.min_amount} onValueChange={min_amount => onChange({ ...config, withdrawal: { ...config.withdrawal, min_amount: Number.isNaN(min_amount) ? 0 : min_amount } })} minValue={0} step={0.01} />
          <Textarea className="md:col-span-2" label="提现提示" value={config.withdrawal.notice} onValueChange={notice => onChange({ ...config, withdrawal: { ...config.withdrawal, notice } })} minRows={2} />
        </div>
        <div className="flex items-center justify-between"><h2 className="font-medium">活动列表</h2><Button size="sm" variant="flat" color="primary" startContent={<Plus className="w-4 h-4" />} onPress={() => onChange({ ...config, campaigns: [...config.campaigns, createCampaign()] })}>新增活动</Button></div>
        {config.campaigns.map((campaign, index) => <Card key={index} className="border border-default-200">
          <CardHeader className="flex items-center justify-between"><span className="font-medium">活动 {index + 1}</span><Button isIconOnly size="sm" color="danger" variant="light" aria-label="删除活动" onPress={() => onChange({ ...config, campaigns: config.campaigns.filter((_, i) => i !== index) })}><Trash2 className="w-4 h-4" /></Button></CardHeader>
          <CardBody className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="活动 ID" value={campaign.id} onValueChange={id => updateCampaign(index, c => ({ ...c, id }))} description="字母、数字、下划线或连字符" />
              <Input label="活动名称" value={campaign.name} onValueChange={name => updateCampaign(index, c => ({ ...c, name }))} />
              <Switch isSelected={campaign.enabled} onValueChange={enabled => updateCampaign(index, c => ({ ...c, enabled }))}>启用本活动</Switch>
              <Switch isSelected={campaign.auto_enroll_eligible} onValueChange={auto_enroll_eligible => updateCampaign(index, c => ({ ...c, auto_enroll_eligible }))}>符合资格用户默认开启</Switch>
              <Input type="datetime-local" label="开始时间" value={toLocalDateTime(campaign.starts_at)} onValueChange={starts_at => updateCampaign(index, c => ({ ...c, starts_at: toIsoDateTime(starts_at) }))} />
              <Input type="datetime-local" label="结束时间" value={toLocalDateTime(campaign.ends_at)} onValueChange={ends_at => updateCampaign(index, c => ({ ...c, ends_at: toIsoDateTime(ends_at) }))} />
            </div>
            <div><h3 className="text-sm font-medium mb-3">参与资格</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <NumberInput label="注册满天数" value={campaign.eligibility.min_account_age_days} onValueChange={value => updateCampaign(index, c => ({ ...c, eligibility: { ...c.eligibility, min_account_age_days: Number.isNaN(value) ? 0 : value } }))} minValue={0} step={1} />
              <NumberInput label="累计现金实付金额" value={campaign.eligibility.min_cash_paid_amount} onValueChange={value => updateCampaign(index, c => ({ ...c, eligibility: { ...c.eligibility, min_cash_paid_amount: Number.isNaN(value) ? 0 : value } }))} minValue={0} step={0.01} />
              <NumberInput label="累计套餐时长（天）" value={campaign.eligibility.min_package_duration_days} onValueChange={value => updateCampaign(index, c => ({ ...c, eligibility: { ...c.eligibility, min_package_duration_days: Number.isNaN(value) ? 0 : value } }))} minValue={0} step={1} />
            </div></div>
            <div><h3 className="text-sm font-medium mb-3">返现规则</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <NumberInput label="默认返现比例" value={campaign.cashback.default_rate} onValueChange={value => updateCampaign(index, c => ({ ...c, cashback: { ...c.cashback, default_rate: Number.isNaN(value) ? 0 : value } }))} minValue={0} maxValue={1} step={0.01} description="0.15 表示 15%" />
              <NumberInput label="最低返现订单金额" value={campaign.cashback.min_order_basis_amount || 0} onValueChange={value => updateCampaign(index, c => ({ ...c, cashback: { ...c.cashback, min_order_basis_amount: Number.isNaN(value) ? 0 : value } }))} minValue={0} step={0.01} description="按净套餐实付判断；低于该值跳过，0 表示不限" />
              <NumberInput label="每位被邀请人最多奖励订单数" value={campaign.cashback.max_reward_orders_per_invitee} onValueChange={value => updateCampaign(index, c => ({ ...c, cashback: { ...c.cashback, max_reward_orders_per_invitee: Number.isNaN(value) ? 0 : value } }))} minValue={0} step={1} />
            </div></div>
            <div className="mt-3 space-y-2"><div className="flex gap-2 items-end"><Input label="套餐 ID" value={newPackageIds[index] || ''} onValueChange={value => setNewPackageIds(current => ({ ...current, [index]: value }))} /><Button variant="flat" onPress={() => { const packageId = newPackageIds[index]?.trim(); if (!packageId || !/^\d+$/.test(packageId) || campaign.cashback.package_rules[packageId]) return; updateRule(index, packageId, () => ({ enabled: true, rate: campaign.cashback.default_rate })); setNewPackageIds(current => ({ ...current, [index]: '' })); }}>添加套餐覆盖</Button></div>
              {Object.entries(campaign.cashback.package_rules).map(([packageId, rule]) => <div key={packageId} className="grid grid-cols-[auto_1fr_auto] gap-3 items-center rounded-medium bg-default-100 p-3"><span>套餐 #{packageId}</span><NumberInput size="sm" aria-label={`套餐 ${packageId} 返现比例`} value={rule.rate} onValueChange={value => updateRule(index, packageId, current => ({ ...current, rate: Number.isNaN(value) ? 0 : value }))} minValue={0} maxValue={1} step={0.01} /><div className="flex items-center gap-2"><Switch size="sm" isSelected={rule.enabled} onValueChange={enabled => updateRule(index, packageId, current => ({ ...current, enabled }))}>启用</Switch><Button isIconOnly size="sm" variant="light" color="danger" aria-label="删除套餐覆盖" onPress={() => updateCampaign(index, c => { const { [packageId]: _, ...package_rules } = c.cashback.package_rules; return { ...c, cashback: { ...c.cashback, package_rules } }; })}><Trash2 className="w-4 h-4" /></Button></div></div>)}
            </div>
            <div><h3 className="text-sm font-medium mb-3">被邀请人返时长</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Switch isSelected={campaign.invitee_reward.enabled} onValueChange={enabled => updateCampaign(index, c => ({ ...c, invitee_reward: { ...c.invitee_reward, enabled } }))}>启用被邀请人返时长</Switch><NumberInput label="返时长比例" value={campaign.invitee_reward.duration_ratio} onValueChange={value => updateCampaign(index, c => ({ ...c, invitee_reward: { ...c.invitee_reward, duration_ratio: Number.isNaN(value) ? 0 : value } }))} minValue={0} maxValue={1} step={0.01} description="0.15 表示套餐时长的 15%" /></div></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Input label="活动标题" value={campaign.copywriting.headline} onValueChange={headline => updateCampaign(index, c => ({ ...c, copywriting: { ...c.copywriting, headline } }))} /><Textarea label="分享文案" value={campaign.copywriting.share_template} onValueChange={share_template => updateCampaign(index, c => ({ ...c, copywriting: { ...c.copywriting, share_template } }))} minRows={2} description="支持 {campaign_name}、{rate_percent}、{invite_code}、{invite_link}、{starts_at}、{ends_at}" /><Textarea label="结束提示" value={campaign.copywriting.ended_message} onValueChange={ended_message => updateCampaign(index, c => ({ ...c, copywriting: { ...c.copywriting, ended_message } }))} minRows={2} /></div>
          </CardBody>
        </Card>)}
      </>}
    </CardBody>
  </Card>;
};

export default InviteCashbackConfigEditor;
