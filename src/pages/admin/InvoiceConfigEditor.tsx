import React, { useMemo } from 'react';
import { Alert, NumberInput, Switch } from '@heroui/react';
import { ReceiptText } from 'lucide-react';

interface InvoiceConfig { enabled: boolean; min_package_amount: number; surcharge_rate: number; delivery_workdays: number }
interface Props { value: string; onChange: (value: string) => void; disabled?: boolean }
const FALLBACK: InvoiceConfig = { enabled: true, min_package_amount: 100, surcharge_rate: 0.08, delivery_workdays: 10 };

export const InvoiceConfigEditor: React.FC<Props> = ({ value, onChange, disabled }) => {
  const parsed = useMemo(() => {
    try {
      const source = JSON.parse(value || '{}');
      return { config: { ...FALLBACK, ...source } as InvoiceConfig, error: '' };
    } catch { return { config: FALLBACK, error: '现有开票配置不是合法JSON，请重新保存。' }; }
  }, [value]);
  const emit = (patch: Partial<InvoiceConfig>) => onChange(JSON.stringify({ ...parsed.config, ...patch }, null, 2));
  const points = Number(parsed.config.surcharge_rate || 0) * 100;

  return <div className="space-y-4">
    {parsed.error && <Alert color="danger" title="开票配置需要修复" description={parsed.error} />}
    <Alert color={parsed.config.enabled ? 'success' : 'default'} variant="flat" title="开票功能总开关" description="关闭后用户端不展示开票入口，后端也拒绝创建开票订单。" startContent={<ReceiptText className="h-5 w-5" />} endContent={<Switch aria-label="开票功能总开关" isSelected={parsed.config.enabled} onValueChange={(enabled) => emit({ enabled })} isDisabled={disabled} />} />
    <div className="grid gap-3 sm:grid-cols-3">
      <NumberInput label="最低开票套餐金额（元）" value={Number(parsed.config.min_package_amount)} onValueChange={(min_package_amount) => emit({ min_package_amount: Math.max(0, min_package_amount || 0) })} minValue={0} step={1} isDisabled={disabled} description="按套餐原价判断是否达到门槛" />
      <NumberInput label="开票加价点数" value={points} onValueChange={(nextPoints) => emit({ surcharge_rate: Math.max(0, Math.min(100, nextPoints || 0)) / 100 })} minValue={0} maxValue={100} step={0.1} isDisabled={disabled} description={`当前加 ${Number(points.toFixed(4))} 个点`} />
      <NumberInput label="预计发送工作日" value={Number(parsed.config.delivery_workdays)} onValueChange={(delivery_workdays) => emit({ delivery_workdays: Math.max(1, Math.min(365, Math.trunc(delivery_workdays || 1))) })} minValue={1} maxValue={365} step={1} isDisabled={disabled} />
    </div>
  </div>;
};
