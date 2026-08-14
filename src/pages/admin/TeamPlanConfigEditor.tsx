import React, { useMemo } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  Input,
  NumberInput,
  Select,
  SelectItem,
  Switch,
} from '@heroui/react';
import { Plus, Trash2, UsersRound } from 'lucide-react';

interface PackageOption {
  id: number;
  package_name: string;
  category: string;
  level: string;
}

interface TeamPlan {
  package_id: number;
  min_seats: number;
  max_seats: number;
  discount_rate: number;
}

interface TeamPlanConfig {
  enabled: boolean;
  min_seats: number;
  max_seats: number;
  plans: TeamPlan[];
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  packages: PackageOption[];
}

const EMPTY_CONFIG: TeamPlanConfig = { enabled: false, min_seats: 2, max_seats: 200, plans: [] };
const newPlan = (): TeamPlan => ({ package_id: 0, min_seats: 2, max_seats: 5, discount_rate: 0.85 });

const parseConfig = (value: string): { config: TeamPlanConfig; error: string } => {
  try {
    const parsed = JSON.parse(value || '{}');
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.plans)) {
      return { config: EMPTY_CONFIG, error: '现有配置结构无效，请重新保存。' };
    }
    return {
      config: {
        enabled: parsed.enabled === true,
        min_seats: Number.isInteger(parsed.min_seats) ? parsed.min_seats : 2,
        max_seats: Number.isInteger(parsed.max_seats) ? parsed.max_seats : 200,
        plans: parsed.plans.map((plan: Partial<TeamPlan>) => ({ ...newPlan(), ...plan })),
      },
      error: '',
    };
  } catch {
    return { config: EMPTY_CONFIG, error: '现有配置不是合法 JSON，请重新保存。' };
  }
};

export const TeamPlanConfigEditor: React.FC<Props> = ({ value, onChange, disabled = false, packages }) => {
  const parsed = useMemo(() => parseConfig(value), [value]);
  const config = parsed.config;
  const emit = (next: TeamPlanConfig) => onChange(JSON.stringify(next, null, 2));
  const updatePlan = (index: number, patch: Partial<TeamPlan>) => emit({
    ...config,
    plans: config.plans.map((plan, planIndex) => planIndex === index ? { ...plan, ...patch } : plan),
  });
  const selectedPackageIds = new Set(config.plans.map((plan) => plan.package_id).filter(Boolean));
  const invalidGlobalSeats = config.min_seats < 2 || config.max_seats > 200 || config.min_seats > config.max_seats;

  return (
    <div className="space-y-4">
      {parsed.error && <Alert isVisible color="danger" title="团队套餐配置需要修复" description={parsed.error} />}
      <div className="flex flex-col gap-3 rounded-lg bg-default-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 font-medium"><UsersRound className="h-4 w-4 text-secondary" />允许新增团队</div>
          <p className="mt-1 text-sm text-default-500">关闭后隐藏新建入口，后端同时拒绝首次团队订单；存量团队权益、成员管理、续费和套餐调整不受影响。</p>
        </div>
        <Switch aria-label="是否允许新增团队" isSelected={config.enabled} onValueChange={(enabled) => emit({ ...config, enabled })} isDisabled={disabled} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <NumberInput
          label="全局最小席位数" value={config.min_seats} minValue={2} maxValue={200} step={1}
          onValueChange={(min_seats) => emit({ ...config, min_seats: Math.trunc(min_seats || 0) })}
          isDisabled={disabled} isInvalid={invalidGlobalSeats} errorMessage={invalidGlobalSeats ? '须为2-200，且不大于最大席位数' : undefined}
        />
        <NumberInput
          label="全局最大席位数" value={config.max_seats} minValue={2} maxValue={200} step={1}
          onValueChange={(max_seats) => emit({ ...config, max_seats: Math.trunc(max_seats || 0) })}
          isDisabled={disabled} isInvalid={invalidGlobalSeats} errorMessage={invalidGlobalSeats ? '须为2-200，且不小于最小席位数' : undefined}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">可购买团队套餐</p>
          <p className="text-sm text-default-500">每个套餐只能配置一次，席位范围必须落在全局范围内。</p>
        </div>
        <Button size="sm" color="secondary" variant="flat" startContent={<Plus className="h-4 w-4" />} onPress={() => emit({ ...config, plans: [...config.plans, newPlan()] })} isDisabled={disabled || config.plans.length >= packages.length}>
          新增套餐
        </Button>
      </div>

      {config.plans.length === 0 && <Alert isVisible color={config.enabled ? 'warning' : 'default'} title="暂未配置团队套餐" description="启用团队订阅前，至少需要新增一个套餐规则。" />}
      {config.plans.map((plan, index) => {
        const duplicate = plan.package_id > 0 && config.plans.some((item, itemIndex) => itemIndex !== index && item.package_id === plan.package_id);
        const invalidSeats = plan.min_seats < config.min_seats || plan.max_seats > config.max_seats || plan.min_seats > plan.max_seats;
        const invalidRate = !(plan.discount_rate > 0 && plan.discount_rate <= 1);
        return (
          <Card key={`${index}-${plan.package_id}`} shadow="sm">
            <CardBody className="gap-4 p-4">
              <div className="flex items-center justify-between gap-2"><span className="font-medium">团队套餐 {index + 1}</span><Button isIconOnly size="sm" color="danger" variant="light" aria-label={`删除团队套餐 ${index + 1}`} onPress={() => emit({ ...config, plans: config.plans.filter((_, itemIndex) => itemIndex !== index) })} isDisabled={disabled}><Trash2 className="h-4 w-4" /></Button></div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Select label="套餐" selectedKeys={plan.package_id ? [String(plan.package_id)] : []} onSelectionChange={(keys) => updatePlan(index, { package_id: Number(Array.from(keys)[0] || 0) })} isDisabled={disabled} isInvalid={!plan.package_id || duplicate} errorMessage={duplicate ? '同一套餐只能配置一次' : !plan.package_id ? '请选择套餐' : undefined}>
                  {packages.map((item) => <SelectItem key={String(item.id)} isDisabled={selectedPackageIds.has(item.id) && item.id !== plan.package_id} textValue={`${item.package_name} ${item.level}`}>{item.package_name} · {item.category}/{item.level}</SelectItem>)}
                </Select>
                <NumberInput label="最小席位" value={plan.min_seats} minValue={config.min_seats} maxValue={config.max_seats} step={1} onValueChange={(min_seats) => updatePlan(index, { min_seats: Math.trunc(min_seats || 0) })} isDisabled={disabled} isInvalid={invalidSeats} errorMessage={invalidSeats ? '须在全局范围内且不大于最大席位' : undefined} />
                <NumberInput label="最大席位" value={plan.max_seats} minValue={config.min_seats} maxValue={config.max_seats} step={1} onValueChange={(max_seats) => updatePlan(index, { max_seats: Math.trunc(max_seats || 0) })} isDisabled={disabled} isInvalid={invalidSeats} errorMessage={invalidSeats ? '须在全局范围内且不小于最小席位' : undefined} />
                <Input label="折扣率" type="number" value={String(plan.discount_rate)} onValueChange={(discount_rate) => updatePlan(index, { discount_rate: Number(discount_rate) })} isDisabled={disabled} isInvalid={invalidRate} errorMessage={invalidRate ? '须大于0且不超过1' : undefined} description="0.85 表示 85 折" />
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
};
