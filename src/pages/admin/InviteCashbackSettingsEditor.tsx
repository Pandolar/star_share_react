import React, { useMemo, useState } from 'react';
import { Alert, Button, Card, CardBody, Input, NumberInput, Switch, Textarea } from '@heroui/react';
import { Plus, Trash2 } from 'lucide-react';
import { InviteCashbackCampaign, InviteCashbackConfig, InviteCashbackPackageRule } from '../../types/admin';

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const createCampaign = (): InviteCashbackCampaign => ({
  id: '', name: '', enabled: false, auto_enroll_eligible: false, starts_at: '', ends_at: '',
  eligibility: { min_account_age_days: 0, min_cash_paid_amount: 0, min_package_duration_days: 0 },
  cashback: { default_rate: 0, min_order_basis_amount: 0, max_reward_orders_per_invitee: 0, package_rules: {} },
  invitee_reward: { enabled: false, duration_ratio: 0 },
  copywriting: { headline: '', share_template: '', ended_message: '' },
});
const fallback: InviteCashbackConfig = { enabled: false, withdrawal: { enabled: false, min_amount: 100, notice: '提现暂未开放' }, purchase_credit: { enabled: false }, campaigns: [] };
const localValue = (value: string) => value ? value.slice(0, 16) : '';
const isoValue = (value: string) => value ? new Date(value).toISOString() : '';

export const InviteCashbackSettingsEditor: React.FC<Props> = ({ value, onChange, disabled }) => {
  const [packageIds, setPackageIds] = useState<Record<number, string>>({});
  const parsed = useMemo(() => {
    try {
      const source = JSON.parse(value || '{}');
      return { config: { ...fallback, ...source, withdrawal: { ...fallback.withdrawal, ...(source.withdrawal || {}) }, purchase_credit: { ...fallback.purchase_credit, ...(source.purchase_credit || {}) }, campaigns: Array.isArray(source.campaigns) ? source.campaigns : [] } as InviteCashbackConfig, error: '' };
    } catch {
      return { config: fallback, error: '现有返现活动配置不是合法 JSON，请切换原始 JSON 修复。' };
    }
  }, [value]);
  const emit = (config: InviteCashbackConfig) => onChange(JSON.stringify(config, null, 2));
  const updateCampaign = (index: number, updater: (campaign: InviteCashbackCampaign) => InviteCashbackCampaign) => emit({ ...parsed.config, campaigns: parsed.config.campaigns.map((campaign, current) => current === index ? updater(campaign) : campaign) });
  const updateRule = (index: number, packageId: string, updater: (rule: InviteCashbackPackageRule) => InviteCashbackPackageRule) => updateCampaign(index, campaign => ({ ...campaign, cashback: { ...campaign.cashback, package_rules: { ...campaign.cashback.package_rules, [packageId]: updater(campaign.cashback.package_rules[packageId]) } } }));

  return <div className="space-y-5">
    {parsed.error && <Alert color="danger" title="返现活动配置需要修复" description={parsed.error} />}
    <Alert color={parsed.config.enabled ? 'success' : 'default'} title="自营限时返现" description="白牌和代理站不参与；总开关与每场活动默认关闭。" endContent={<Switch aria-label="返现总开关" isSelected={parsed.config.enabled} onValueChange={enabled => emit({ ...parsed.config, enabled })} isDisabled={disabled} />} />
    <div className="grid gap-3 md:grid-cols-2">
      <Switch isSelected={parsed.config.withdrawal.enabled} onValueChange={enabled => emit({ ...parsed.config, withdrawal: { ...parsed.config.withdrawal, enabled } })} isDisabled={disabled}>开放提现</Switch>
      <Switch isSelected={parsed.config.purchase_credit.enabled} onValueChange={enabled => emit({ ...parsed.config, purchase_credit: { enabled } })} isDisabled={disabled}>允许返现余额抵扣个人套餐</Switch>
      <NumberInput label="最低提现金额" value={parsed.config.withdrawal.min_amount} minValue={0} onValueChange={min_amount => emit({ ...parsed.config, withdrawal: { ...parsed.config.withdrawal, min_amount: min_amount || 0 } })} isDisabled={disabled} />
      <Input label="提现提示" value={parsed.config.withdrawal.notice} onValueChange={notice => emit({ ...parsed.config, withdrawal: { ...parsed.config.withdrawal, notice } })} isDisabled={disabled} />
    </div>
    <div className="flex items-center justify-between"><h4 className="font-medium">活动列表</h4><Button size="sm" color="primary" variant="flat" startContent={<Plus className="h-4 w-4" />} onPress={() => emit({ ...parsed.config, campaigns: [...parsed.config.campaigns, createCampaign()] })} isDisabled={disabled}>新增活动</Button></div>
    {parsed.config.campaigns.map((campaign, index) => <Card key={`${campaign.id}-${index}`} shadow="none" className="border border-divider"><CardBody className="space-y-4">
      <div className="flex items-center justify-between"><strong>{campaign.name || `活动 ${index + 1}`}</strong><Button isIconOnly size="sm" color="danger" variant="light" aria-label="删除活动" onPress={() => emit({ ...parsed.config, campaigns: parsed.config.campaigns.filter((_, current) => current !== index) })} isDisabled={disabled}><Trash2 className="h-4 w-4" /></Button></div>
      <div className="grid gap-3 md:grid-cols-3">
        <Input label="活动 ID" value={campaign.id} onValueChange={id => updateCampaign(index, current => ({ ...current, id }))} isDisabled={disabled} />
        <Input label="活动名称" value={campaign.name} onValueChange={name => updateCampaign(index, current => ({ ...current, name }))} isDisabled={disabled} />
        <Switch isSelected={campaign.enabled} onValueChange={enabled => updateCampaign(index, current => ({ ...current, enabled }))} isDisabled={disabled}>启用活动</Switch>
        <Switch isSelected={campaign.auto_enroll_eligible === true} onValueChange={auto_enroll_eligible => updateCampaign(index, current => ({ ...current, auto_enroll_eligible }))} isDisabled={disabled}>符合资格用户默认开启</Switch>
        <Input type="datetime-local" label="开始时间" value={localValue(campaign.starts_at)} onValueChange={starts_at => updateCampaign(index, current => ({ ...current, starts_at: isoValue(starts_at) }))} isDisabled={disabled} />
        <Input type="datetime-local" label="结束时间" value={localValue(campaign.ends_at)} onValueChange={ends_at => updateCampaign(index, current => ({ ...current, ends_at: isoValue(ends_at) }))} isDisabled={disabled} />
        <NumberInput label="注册满天数" value={campaign.eligibility.min_account_age_days} minValue={0} onValueChange={amount => updateCampaign(index, current => ({ ...current, eligibility: { ...current.eligibility, min_account_age_days: Math.trunc(amount || 0) } }))} isDisabled={disabled} />
        <NumberInput label="累计现金实付" value={campaign.eligibility.min_cash_paid_amount} minValue={0} onValueChange={amount => updateCampaign(index, current => ({ ...current, eligibility: { ...current.eligibility, min_cash_paid_amount: amount || 0 } }))} isDisabled={disabled} />
        <NumberInput label="累计套餐时长（天）" value={campaign.eligibility.min_package_duration_days} minValue={0} onValueChange={amount => updateCampaign(index, current => ({ ...current, eligibility: { ...current.eligibility, min_package_duration_days: Math.trunc(amount || 0) } }))} isDisabled={disabled} />
        <NumberInput label="默认返现比例" value={campaign.cashback.default_rate} minValue={0} maxValue={1} step={0.01} description="0.08 表示 8%" onValueChange={default_rate => updateCampaign(index, current => ({ ...current, cashback: { ...current.cashback, default_rate: default_rate || 0 } }))} isDisabled={disabled} />
        <NumberInput label="最低返现订单金额" value={campaign.cashback.min_order_basis_amount || 0} minValue={0} step={0.01} description="按净套餐实付判断；低于该值跳过，0 表示不限" onValueChange={min_order_basis_amount => updateCampaign(index, current => ({ ...current, cashback: { ...current.cashback, min_order_basis_amount: min_order_basis_amount || 0 } }))} isDisabled={disabled} />
        <NumberInput label="每个下级最多奖励订单" value={campaign.cashback.max_reward_orders_per_invitee} minValue={0} description="0 表示不限" onValueChange={count => updateCampaign(index, current => ({ ...current, cashback: { ...current.cashback, max_reward_orders_per_invitee: Math.trunc(count || 0) } }))} isDisabled={disabled} />
        <Switch isSelected={campaign.invitee_reward.enabled} onValueChange={enabled => updateCampaign(index, current => ({ ...current, invitee_reward: { ...current.invitee_reward, enabled } }))} isDisabled={disabled}>被邀请人返时长</Switch>
        <NumberInput label="被邀请人时长比例" value={campaign.invitee_reward.duration_ratio} minValue={0} maxValue={1} step={0.01} onValueChange={duration_ratio => updateCampaign(index, current => ({ ...current, invitee_reward: { ...current.invitee_reward, duration_ratio: duration_ratio || 0 } }))} isDisabled={disabled} />
      </div>
      <div className="space-y-2"><div className="flex items-end gap-2"><Input label="套餐 ID" value={packageIds[index] || ''} onValueChange={packageId => setPackageIds(current => ({ ...current, [index]: packageId }))} isDisabled={disabled} /><Button variant="flat" onPress={() => { const packageId = (packageIds[index] || '').trim(); if (!/^\d+$/.test(packageId) || campaign.cashback.package_rules[packageId]) return; updateRule(index, packageId, () => ({ enabled: true, rate: campaign.cashback.default_rate })); setPackageIds(current => ({ ...current, [index]: '' })); }} isDisabled={disabled}>添加套餐覆盖</Button></div>{Object.entries(campaign.cashback.package_rules).map(([packageId, rule]) => <div key={packageId} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-lg bg-default-100 p-2"><span>#{packageId}</span><NumberInput size="sm" aria-label={`套餐 ${packageId} 比例`} value={rule.rate} minValue={0} maxValue={1} step={0.01} onValueChange={rate => updateRule(index, packageId, current => ({ ...current, rate: rate || 0 }))} /><Switch size="sm" isSelected={rule.enabled} onValueChange={enabled => updateRule(index, packageId, current => ({ ...current, enabled }))}>启用</Switch><Button isIconOnly size="sm" variant="light" color="danger" aria-label="删除套餐覆盖" onPress={() => updateCampaign(index, current => { const package_rules = { ...current.cashback.package_rules }; delete package_rules[packageId]; return { ...current, cashback: { ...current.cashback, package_rules } }; })}><Trash2 className="h-4 w-4" /></Button></div>)}</div>
      <div className="grid gap-3 md:grid-cols-3"><Input label="活动标题" value={campaign.copywriting.headline} onValueChange={headline => updateCampaign(index, current => ({ ...current, copywriting: { ...current.copywriting, headline } }))} isDisabled={disabled} /><Textarea label="分享文案" value={campaign.copywriting.share_template} onValueChange={share_template => updateCampaign(index, current => ({ ...current, copywriting: { ...current.copywriting, share_template } }))} minRows={2} isDisabled={disabled} /><Textarea label="结束提示" value={campaign.copywriting.ended_message} onValueChange={ended_message => updateCampaign(index, current => ({ ...current, copywriting: { ...current.copywriting, ended_message } }))} minRows={2} isDisabled={disabled} /></div>
    </CardBody></Card>)}
  </div>;
};
