import React, { useMemo } from 'react';
import { Alert, Input } from '@heroui/react';
import { BellRing } from 'lucide-react';

interface BarkConfig { server_url: string; device_key: string }
interface Props { value: string; onChange: (value: string) => void; disabled?: boolean }
const FALLBACK: BarkConfig = { server_url: 'https://api.day.app', device_key: '' };

export const BarkConfigEditor: React.FC<Props> = ({ value, onChange, disabled }) => {
  const parsed = useMemo(() => {
    try { return { config: { ...FALLBACK, ...JSON.parse(value || '{}') } as BarkConfig, error: '' }; }
    catch { return { config: FALLBACK, error: '现有 Bark 通知配置不是合法JSON，请重新保存。' }; }
  }, [value]);
  const emit = (patch: Partial<BarkConfig>) => onChange(JSON.stringify({ ...parsed.config, ...patch }, null, 2));
  return <div className="space-y-3">
    {parsed.error && <Alert color="danger" title="Bark 配置需要修复" description={parsed.error} />}
    <Alert color="primary" variant="flat" title="Bark 管理通知" description="用于支付异常、异常到账和待开票订单等运营提醒。设备密钥保存在服务端配置中。" startContent={<BellRing className="h-5 w-5" />} />
    <div className="grid gap-3 sm:grid-cols-2">
      <Input label="Bark 服务器地址" value={parsed.config.server_url} onValueChange={(server_url) => emit({ server_url })} placeholder="https://api.day.app" isDisabled={disabled} />
      <Input label="设备密钥" type="password" value={parsed.config.device_key} onValueChange={(device_key) => emit({ device_key })} placeholder="填写 Bark Device Key" isDisabled={disabled} />
    </div>
  </div>;
};
