import React, { useMemo, useState } from 'react';
import { Alert, Button, NumberInput, Select, SelectItem } from '@heroui/react';
import { BadgePercent, Plus, Trash2 } from 'lucide-react';

interface DiscountRule { overall?: number; packages?: Record<string, number> }
interface PackageOption { id: number; package_name: string }
interface Props { value: string; onChange: (value: string) => void; disabled?: boolean; packages?: PackageOption[] }

const toPercent = (rate: unknown) => Number.isFinite(Number(rate)) ? Number(rate) * 100 : undefined;
const toRate = (percent: number) => Math.max(0.01, Math.min(100, percent)) / 100;

const LevelDiscountBlock: React.FC<{ level: string; rule: DiscountRule; packages: PackageOption[]; disabled?: boolean; onChange: (rule: DiscountRule) => void; onDelete: () => void }> = ({ level, rule, packages, disabled, onChange, onDelete }) => {
  const [newPackageId, setNewPackageId] = useState('');
  const packageRates = rule.packages || {};
  const available = packages.filter((item) => !(String(item.id) in packageRates));
  const packageName = (id: string) => packages.find((item) => String(item.id) === id)?.package_name || `套餐 #${id}`;
  const updatePackage = (id: string, rate?: number) => {
    const next = { ...packageRates };
    if (rate === undefined) delete next[id]; else next[id] = rate;
    onChange({ ...rule, packages: next });
  };
  return <div className="space-y-3 rounded-lg border border-divider p-3">
    <div className="flex items-center justify-between"><div><p className="font-medium">分销商等级 {level}</p><p className="text-xs text-default-500">套餐专属折扣优先于本等级整体折扣</p></div><Button isIconOnly color="danger" variant="light" aria-label={`删除分销商等级 ${level}`} onPress={onDelete} isDisabled={disabled}><Trash2 className="h-4 w-4" /></Button></div>
    <NumberInput label="整体折扣（%）" value={toPercent(rule.overall)} onValueChange={(percent) => onChange({ ...rule, overall: Number.isNaN(percent) ? undefined : toRate(percent) })} minValue={1} maxValue={100} step={1} isDisabled={disabled} description="例如 80 表示按原价的 80% 结算；留空表示不设整体折扣" />
    <div className="space-y-2"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><p className="text-sm font-medium">套餐专属折扣</p><div className="flex gap-2"><Select aria-label={`等级 ${level} 选择套餐`} placeholder="选择套餐" className="w-52" selectedKeys={newPackageId ? [newPackageId] : []} onSelectionChange={(keys) => setNewPackageId(String(Array.from(keys)[0] || ''))} isDisabled={disabled || available.length === 0}>{available.map((item) => <SelectItem key={String(item.id)}>{item.package_name}</SelectItem>)}</Select><Button size="sm" variant="flat" startContent={<Plus className="h-4 w-4" />} onPress={() => { if (!newPackageId) return; updatePackage(newPackageId, rule.overall || 1); setNewPackageId(''); }} isDisabled={disabled || !newPackageId}>添加</Button></div></div>
      {Object.entries(packageRates).map(([id, rate]) => <div key={id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto]"><div className="flex items-center rounded-lg bg-default-100 px-3 text-sm">{packageName(id)}</div><NumberInput aria-label={`${packageName(id)}折扣百分比`} value={toPercent(rate)} onValueChange={(percent) => updatePackage(id, toRate(percent || 1))} minValue={1} maxValue={100} step={1} isDisabled={disabled} endContent="%" /><Button isIconOnly color="danger" variant="light" aria-label={`删除${packageName(id)}折扣`} onPress={() => updatePackage(id)} isDisabled={disabled}><Trash2 className="h-4 w-4" /></Button></div>)}
      {Object.keys(packageRates).length === 0 && <p className="rounded-lg border border-dashed border-divider p-3 text-center text-sm text-default-500">当前没有套餐专属折扣</p>}
    </div>
  </div>;
};

export const DistributorLevelDiscountsEditor: React.FC<Props> = ({ value, onChange, disabled, packages = [] }) => {
  const [newLevel, setNewLevel] = useState<number | undefined>();
  const parsed = useMemo(() => {
    try { const source = JSON.parse(value || '{}'); return { config: source && typeof source === 'object' && !Array.isArray(source) ? source as Record<string, DiscountRule> : {}, error: '' }; }
    catch { return { config: {} as Record<string, DiscountRule>, error: '现有分销商等级折扣不是合法JSON，请重新保存。' }; }
  }, [value]);
  const emit = (config: Record<string, DiscountRule>) => onChange(JSON.stringify(config, null, 2));
  const entries = Object.entries(parsed.config).sort(([a], [b]) => Number(a) - Number(b));
  return <div className="space-y-4">
    {parsed.error && <Alert color="danger" title="分销等级折扣需要修复" description={parsed.error} />}
    <Alert color="primary" variant="flat" title="等级默认折扣" description="分销商个体折扣优先于这里的等级默认值；等级内的套餐专属折扣又优先于整体折扣。未配置时按原价结算。" startContent={<BadgePercent className="h-5 w-5" />} />
    <div className="flex items-end gap-2"><NumberInput label="新增分销商等级" value={newLevel} onValueChange={(level) => setNewLevel(Number.isNaN(level) ? undefined : Math.max(1, Math.trunc(level)))} minValue={1} step={1} className="max-w-52" isDisabled={disabled} /><Button color="primary" variant="flat" startContent={<Plus className="h-4 w-4" />} onPress={() => { if (!newLevel || String(newLevel) in parsed.config) return; emit({ ...parsed.config, [String(newLevel)]: { overall: 1, packages: {} } }); setNewLevel(undefined); }} isDisabled={disabled || !newLevel || String(newLevel) in parsed.config}>添加等级</Button></div>
    {entries.map(([level, rule]) => <LevelDiscountBlock key={level} level={level} rule={rule || {}} packages={packages} disabled={disabled} onChange={(nextRule) => emit({ ...parsed.config, [level]: nextRule })} onDelete={() => { const next = { ...parsed.config }; delete next[level]; emit(next); }} />)}
    {entries.length === 0 && <p className="rounded-lg border border-dashed border-divider p-4 text-center text-sm text-default-500">尚未配置等级默认折扣，所有等级按原价结算</p>}
  </div>;
};
