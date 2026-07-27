import React, { useMemo, useState } from 'react';
import { Alert, Button, Card, CardBody, Chip, NumberInput, Select, SelectItem, Switch } from '@heroui/react';
import { Plus, Trash2, Users } from 'lucide-react';

interface RewardRule {
  enabled?: boolean;
  reward_mode?: 'duration' | 'cash';
  reward_ratio?: number;
  invitee_reward_ratio?: number;
  max_reward_order_count?: number;
  min_withdraw_amount?: number;
}
interface InvitePolicy {
  enabled: boolean;
  bind_only_on_register: boolean;
  reward_only_paid_purchase: boolean;
  exclude_exchange_orders: boolean;
  default_policy: RewardRule;
  package_rules: Record<string, RewardRule>;
}
interface PackageOption { id: number; package_name: string }
interface Props { value: string; onChange: (value: string) => void; disabled?: boolean; packages?: PackageOption[] }

const DEFAULT_RULE: Required<RewardRule> = { enabled: true, reward_mode: 'duration', reward_ratio: 0.1, invitee_reward_ratio: 0.05, max_reward_order_count: 3, min_withdraw_amount: 100 };
const FALLBACK: InvitePolicy = { enabled: true, bind_only_on_register: true, reward_only_paid_purchase: true, exclude_exchange_orders: false, default_policy: DEFAULT_RULE, package_rules: {} };
const numberValue = (value: unknown, fallback: number) => Number.isFinite(Number(value)) ? Number(value) : fallback;

const RuleFields: React.FC<{ rule: RewardRule; onChange: (rule: RewardRule) => void; disabled?: boolean; showEnabled?: boolean }> = ({ rule, onChange, disabled, showEnabled }) => {
  const current = { ...DEFAULT_RULE, ...rule };
  const update = (patch: Partial<RewardRule>) => onChange({ ...rule, ...patch });
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {showEnabled && <div className="flex min-h-14 items-center justify-between rounded-lg border border-divider px-3 sm:col-span-2 lg:col-span-3"><div><p className="text-sm font-medium">启用此套餐奖励</p><p className="text-xs text-default-500">关闭后该套餐订单不发放邀请奖励</p></div><Switch aria-label="启用此套餐奖励" isSelected={current.enabled} onValueChange={(enabled) => update({ enabled })} isDisabled={disabled} /></div>}
    <Select label="邀请人奖励方式" selectedKeys={[current.reward_mode]} onSelectionChange={(keys) => update({ reward_mode: String(Array.from(keys)[0] || 'duration') as 'duration' | 'cash' })} isDisabled={disabled}>
      <SelectItem key="duration">返时长</SelectItem><SelectItem key="cash">返现金</SelectItem>
    </Select>
    <NumberInput label="邀请人奖励比例（%）" value={numberValue(current.reward_ratio, 0.1) * 100} onValueChange={(percent) => update({ reward_ratio: Math.max(0, Math.min(100, percent || 0)) / 100 })} minValue={0} maxValue={100} step={0.1} isDisabled={disabled} />
    <NumberInput label="被邀请人返时长比例（%）" value={numberValue(current.invitee_reward_ratio, 0.05) * 100} onValueChange={(percent) => update({ invitee_reward_ratio: Math.max(0, Math.min(100, percent || 0)) / 100 })} minValue={0} maxValue={100} step={0.1} isDisabled={disabled} />
    <NumberInput label="最多奖励订单数" value={numberValue(current.max_reward_order_count, 3)} onValueChange={(count) => update({ max_reward_order_count: Math.max(0, Math.trunc(count || 0)) })} minValue={0} step={1} isDisabled={disabled} description="0 表示不限制订单数" />
    <NumberInput label="最低提现金额（元）" value={numberValue(current.min_withdraw_amount, 100)} onValueChange={(amount) => update({ min_withdraw_amount: Math.max(0, amount || 0) })} minValue={0} step={1} isDisabled={disabled} description="仅返现金方式使用" />
  </div>;
};

export const InvitePolicyConfigEditor: React.FC<Props> = ({ value, onChange, disabled, packages = [] }) => {
  const [newPackageId, setNewPackageId] = useState('');
  const parsed = useMemo(() => {
    try {
      const source = JSON.parse(value || '{}');
      return { config: { ...FALLBACK, ...source, default_policy: { ...DEFAULT_RULE, ...(source.default_policy || {}) }, package_rules: source.package_rules && typeof source.package_rules === 'object' ? source.package_rules : {} } as InvitePolicy, error: '' };
    } catch { return { config: FALLBACK, error: '现有邀请奖励规则不是合法JSON，请重新保存。' }; }
  }, [value]);
  const emit = (patch: Partial<InvitePolicy>) => onChange(JSON.stringify({ ...parsed.config, ...patch }, null, 2));
  const packageName = (id: string) => packages.find((item) => String(item.id) === id)?.package_name || `套餐 #${id}`;
  const availablePackages = packages.filter((item) => !(String(item.id) in parsed.config.package_rules));
  const addPackage = () => {
    if (!newPackageId) return;
    emit({ package_rules: { ...parsed.config.package_rules, [newPackageId]: { ...parsed.config.default_policy, enabled: true } } });
    setNewPackageId('');
  };

  return <div className="space-y-4">
    {parsed.error && <Alert color="danger" title="邀请奖励规则需要修复" description={parsed.error} />}
    <Alert color={parsed.config.enabled ? 'success' : 'default'} variant="flat" title="邀请奖励总开关" description="关闭后不再对新订单发放邀请人或被邀请人奖励。" startContent={<Users className="h-5 w-5" />} endContent={<Switch aria-label="邀请奖励总开关" isSelected={parsed.config.enabled} onValueChange={(enabled) => emit({ enabled })} isDisabled={disabled} />} />
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="flex items-center justify-between rounded-lg border border-divider p-3"><div><p className="text-sm font-medium">仅注册时绑定</p><p className="text-xs text-default-500">阻止注册后补绑邀请码</p></div><Switch aria-label="仅注册时绑定邀请码" isSelected={parsed.config.bind_only_on_register} onValueChange={(bind_only_on_register) => emit({ bind_only_on_register })} isDisabled={disabled} /></div>
      <div className="flex items-center justify-between rounded-lg border border-divider p-3"><div><p className="text-sm font-medium">仅真实支付订单</p><p className="text-xs text-default-500">排除非支付购买记录</p></div><Switch aria-label="仅真实支付订单奖励" isSelected={parsed.config.reward_only_paid_purchase} onValueChange={(reward_only_paid_purchase) => emit({ reward_only_paid_purchase })} isDisabled={disabled} /></div>
      <div className="flex items-center justify-between rounded-lg border border-divider p-3"><div><p className="text-sm font-medium">排除兑换订单</p><p className="text-xs text-default-500">CDK兑换不计入奖励</p></div><Switch aria-label="排除兑换订单" isSelected={parsed.config.exclude_exchange_orders} onValueChange={(exclude_exchange_orders) => emit({ exclude_exchange_orders })} isDisabled={disabled} /></div>
    </div>
    <div><div className="mb-3 flex items-center gap-2"><h4 className="font-medium">默认奖励规则</h4><Chip size="sm" variant="flat">所有套餐</Chip></div><RuleFields rule={parsed.config.default_policy} onChange={(default_policy) => emit({ default_policy })} disabled={disabled} /></div>
    <div className="space-y-3 border-t border-divider pt-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><h4 className="font-medium">套餐专属规则</h4><p className="text-xs text-default-500">专属规则会覆盖上方默认规则</p></div><div className="flex gap-2"><Select aria-label="选择套餐" placeholder="选择套餐" className="w-52" selectedKeys={newPackageId ? [newPackageId] : []} onSelectionChange={(keys) => setNewPackageId(String(Array.from(keys)[0] || ''))} isDisabled={disabled || availablePackages.length === 0}>{availablePackages.map((item) => <SelectItem key={String(item.id)}>{item.package_name}</SelectItem>)}</Select><Button color="primary" variant="flat" startContent={<Plus className="h-4 w-4" />} onPress={addPackage} isDisabled={disabled || !newPackageId}>添加</Button></div></div>
      {Object.entries(parsed.config.package_rules).map(([id, rule]) => <Card key={id} shadow="none" className="border border-divider"><CardBody className="space-y-3"><div className="flex items-center justify-between"><div><p className="font-medium">{packageName(id)}</p><p className="text-xs text-default-500">套餐 ID: {id}</p></div><Button isIconOnly color="danger" variant="light" aria-label={`删除${packageName(id)}专属规则`} onPress={() => { const next = { ...parsed.config.package_rules }; delete next[id]; emit({ package_rules: next }); }} isDisabled={disabled}><Trash2 className="h-4 w-4" /></Button></div><RuleFields rule={rule} onChange={(nextRule) => emit({ package_rules: { ...parsed.config.package_rules, [id]: nextRule } })} disabled={disabled} showEnabled /></CardBody></Card>)}
      {Object.keys(parsed.config.package_rules).length === 0 && <p className="rounded-lg border border-dashed border-divider p-4 text-center text-sm text-default-500">当前所有套餐都使用默认奖励规则</p>}
    </div>
  </div>;
};
