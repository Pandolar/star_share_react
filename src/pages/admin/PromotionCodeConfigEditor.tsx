import React, { useMemo } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  NumberInput,
  Select,
  SelectItem,
  Switch,
} from '@heroui/react';
import { Plus, TicketPercent, Trash2 } from 'lucide-react';

interface PackageOption {
  id: number;
  package_name: string;
  category: string;
  level: string;
}

interface PromotionRule {
  code: string;
  name: string;
  enabled: boolean;
  discount_type: 'rate' | 'fixed';
  discount_value: number;
  scope_type: 'all' | 'packages' | 'levels';
  package_ids: number[];
  levels: string[];
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number;
  per_user_limit: number;
}

interface PromotionConfig {
  enabled: boolean;
  codes: PromotionRule[];
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  packages: PackageOption[];
}

const EMPTY_CONFIG: PromotionConfig = { enabled: false, codes: [] };

const newRule = (): PromotionRule => ({
  code: '',
  name: '',
  enabled: true,
  discount_type: 'rate',
  discount_value: 8,
  scope_type: 'all',
  package_ids: [],
  levels: [],
  starts_at: null,
  ends_at: null,
  max_uses: 0,
  per_user_limit: 0,
});

const parseConfig = (value: string): { config: PromotionConfig; error: string } => {
  try {
    const parsed = JSON.parse(value || '{}');
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.codes)) {
      return { config: EMPTY_CONFIG, error: '现有配置结构无效，请重新保存。' };
    }
    return {
      config: {
        enabled: parsed.enabled === true,
        codes: parsed.codes.map((item: Partial<PromotionRule>) => ({ ...newRule(), ...item })),
      },
      error: '',
    };
  } catch {
    return { config: EMPTY_CONFIG, error: '现有配置不是合法 JSON，请重新保存。' };
  }
};

const inputDateTime = (value: string | null) => String(value || '').replace(' ', 'T').slice(0, 16);

export const PromotionCodeConfigEditor: React.FC<Props> = ({ value, onChange, disabled = false, packages }) => {
  const parsed = useMemo(() => parseConfig(value), [value]);
  const config = parsed.config;
  const levels = useMemo(
    () => Array.from(new Set(packages.map((item) => item.level).filter(Boolean))).sort(),
    [packages],
  );

  const emit = (next: PromotionConfig) => onChange(JSON.stringify(next, null, 2));
  const updateRule = (index: number, patch: Partial<PromotionRule>) => {
    const codes = config.codes.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...patch } : rule);
    emit({ ...config, codes });
  };
  const removeRule = (index: number) => emit({
    ...config,
    codes: config.codes.filter((_, ruleIndex) => ruleIndex !== index),
  });

  const duplicateCodes = new Set(
    config.codes
      .map((rule) => rule.code.trim().toUpperCase())
      .filter((code, index, all) => code && all.indexOf(code) !== index),
  );

  return (
    <div className="space-y-4">
      {parsed.error && <Alert isVisible color="danger" title="优惠码配置需要修复" description={parsed.error} />}
      <div className="flex flex-col gap-3 rounded-lg bg-default-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 font-medium"><TicketPercent className="h-4 w-4 text-secondary" />优惠码总开关</div>
          <p className="mt-1 text-sm text-default-500">关闭后前端不显示入口，后端也拒绝任何优惠码下单。</p>
        </div>
        <Switch
          aria-label="优惠码总开关"
          isSelected={config.enabled}
          onValueChange={(enabled) => emit({ ...config, enabled })}
          isDisabled={disabled}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">优惠码规则</p>
          <p className="text-sm text-default-500">按代码逐条配置；一个优惠码只能命中一条规则。</p>
        </div>
        <Button
          size="sm"
          color="secondary"
          variant="flat"
          startContent={<Plus className="h-4 w-4" />}
          onPress={() => emit({ ...config, codes: [...config.codes, newRule()] })}
          isDisabled={disabled || config.codes.length >= 200}
        >
          新增优惠码
        </Button>
      </div>

      {config.codes.length === 0 && (
        <Alert isVisible color="default" title="暂未配置优惠码" description="开启总开关前，请先新增至少一条可用规则。" />
      )}

      {config.codes.map((rule, index) => {
        const normalizedCode = rule.code.trim().toUpperCase();
        const invalidCode = normalizedCode !== '' && !/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(normalizedCode);
        const duplicateCode = duplicateCodes.has(normalizedCode);
        const invalidDiscount = rule.discount_type === 'rate'
          ? !(rule.discount_value > 0 && rule.discount_value < 10)
          : !(rule.discount_value > 0 && rule.discount_value <= 100000);
        const missingScope = (rule.scope_type === 'packages' && rule.package_ids.length === 0)
          || (rule.scope_type === 'levels' && rule.levels.length === 0);
        return (
          <Card key={`${index}-${rule.code}`} shadow="sm">
            <CardBody className="gap-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Chip size="sm" color={rule.enabled ? 'success' : 'default'} variant="flat">{rule.enabled ? '启用' : '停用'}</Chip>
                  <span className="font-medium">{rule.name || normalizedCode || `优惠码 ${index + 1}`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    size="sm"
                    aria-label={`优惠码 ${normalizedCode || index + 1} 状态`}
                    isSelected={rule.enabled}
                    onValueChange={(enabled) => updateRule(index, { enabled })}
                    isDisabled={disabled}
                  />
                  <Button
                    isIconOnly
                    size="sm"
                    color="danger"
                    variant="light"
                    aria-label={`删除优惠码 ${normalizedCode || index + 1}`}
                    onPress={() => removeRule(index)}
                    isDisabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  label="优惠码"
                  placeholder="例如 SUMMER2026"
                  value={rule.code}
                  onValueChange={(code) => updateRule(index, { code: code.toUpperCase() })}
                  isDisabled={disabled}
                  isRequired
                  isInvalid={invalidCode || duplicateCode}
                  errorMessage={duplicateCode ? '优惠码重复' : invalidCode ? '3-32位字母、数字、下划线或短横线' : undefined}
                  description="用户输入时不区分大小写"
                />
                <Input
                  label="活动名称"
                  placeholder="例如 暑期八折"
                  value={rule.name}
                  onValueChange={(name) => updateRule(index, { name })}
                  isDisabled={disabled}
                  isRequired
                />
                <Select
                  label="优惠方式"
                  selectedKeys={[rule.discount_type]}
                  onSelectionChange={(keys) => updateRule(index, { discount_type: String(Array.from(keys)[0] || 'rate') as PromotionRule['discount_type'] })}
                  isDisabled={disabled}
                >
                  <SelectItem key="rate">按折扣</SelectItem>
                  <SelectItem key="fixed">立减金额</SelectItem>
                </Select>
                <NumberInput
                  label={rule.discount_type === 'rate' ? '折扣（N折）' : '立减金额（元）'}
                  value={Number(rule.discount_value)}
                  onValueChange={(discount_value) => updateRule(index, { discount_value: Number.isNaN(discount_value) ? 0 : discount_value })}
                  minValue={rule.discount_type === 'rate' ? 0.1 : 0.01}
                  maxValue={rule.discount_type === 'rate' ? 9.9 : 100000}
                  step={rule.discount_type === 'rate' ? 0.1 : 1}
                  isDisabled={disabled}
                  isInvalid={invalidDiscount}
                  errorMessage={invalidDiscount ? (rule.discount_type === 'rate' ? '须大于0且小于10' : '须大于0且不超过100000') : undefined}
                  description={rule.discount_type === 'rate' ? '例如 8 表示八折' : '最终支付金额最低为 0.01 元'}
                />
                <Select
                  label="适用范围"
                  selectedKeys={[rule.scope_type]}
                  onSelectionChange={(keys) => updateRule(index, { scope_type: String(Array.from(keys)[0] || 'all') as PromotionRule['scope_type'] })}
                  isDisabled={disabled}
                >
                  <SelectItem key="all">全部在售套餐</SelectItem>
                  <SelectItem key="packages">指定一个或多个套餐</SelectItem>
                  <SelectItem key="levels">指定一个或多个套餐等级</SelectItem>
                </Select>
                {rule.scope_type === 'packages' && (
                  <Select
                    label="指定套餐"
                    selectionMode="multiple"
                    selectedKeys={new Set(rule.package_ids.map(String))}
                    onSelectionChange={(keys) => updateRule(index, {
                      package_ids: (keys === 'all' ? packages.map((item) => item.id) : Array.from(keys).map(Number)).filter((id) => Number.isInteger(id) && id > 0),
                    })}
                    isDisabled={disabled}
                    isInvalid={missingScope}
                    errorMessage={missingScope ? '至少选择一个套餐' : undefined}
                  >
                    {packages.map((item) => <SelectItem key={String(item.id)} textValue={`${item.package_name} ${item.level}`}>{item.package_name} · {item.category}/{item.level}</SelectItem>)}
                  </Select>
                )}
                {rule.scope_type === 'levels' && (
                  <Select
                    label="指定套餐等级"
                    selectionMode="multiple"
                    selectedKeys={new Set(rule.levels)}
                    onSelectionChange={(keys) => updateRule(index, { levels: keys === 'all' ? levels : Array.from(keys).map(String) })}
                    isDisabled={disabled}
                    isInvalid={missingScope}
                    errorMessage={missingScope ? '至少选择一个等级' : undefined}
                  >
                    {levels.map((level) => <SelectItem key={level}>{level}</SelectItem>)}
                  </Select>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-default-700">有效期与次数限制</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Input
                    type="datetime-local"
                    label="开始时间"
                    value={inputDateTime(rule.starts_at)}
                    onValueChange={(starts_at) => updateRule(index, { starts_at: starts_at || null })}
                    isDisabled={disabled}
                    description="留空表示立即生效"
                  />
                  <Input
                    type="datetime-local"
                    label="结束时间"
                    value={inputDateTime(rule.ends_at)}
                    onValueChange={(ends_at) => updateRule(index, { ends_at: ends_at || null })}
                    isDisabled={disabled}
                    description="留空表示长期有效"
                  />
                  <NumberInput
                    label="总使用次数"
                    value={Number(rule.max_uses || 0)}
                    onValueChange={(max_uses) => updateRule(index, { max_uses: Math.max(0, Math.trunc(max_uses || 0)) })}
                    minValue={0}
                    step={1}
                    isDisabled={disabled}
                    description="0 表示不限"
                  />
                  <NumberInput
                    label="单用户次数"
                    value={Number(rule.per_user_limit || 0)}
                    onValueChange={(per_user_limit) => updateRule(index, { per_user_limit: Math.max(0, Math.trunc(per_user_limit || 0)) })}
                    minValue={0}
                    step={1}
                    isDisabled={disabled}
                    description="0 表示不限"
                  />
                </div>
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
};
