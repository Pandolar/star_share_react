import React, { useMemo } from 'react';
import { Alert, Button, Input, Switch, Textarea } from '@heroui/react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';

interface WhiteLabelConfig { enabled: boolean; domains: string[]; notice: string; notice_id: string }
interface Props { value: string; onChange: (value: string) => void; disabled?: boolean }
const FALLBACK: WhiteLabelConfig = { enabled: false, domains: [], notice: '', notice_id: '' };

export const WhiteLabelConfigEditor: React.FC<Props> = ({ value, onChange, disabled }) => {
  const parsed = useMemo(() => {
    try {
      const source = JSON.parse(value || '{}');
      return { config: { ...FALLBACK, ...source, domains: Array.isArray(source.domains) ? source.domains.map(String) : [] } as WhiteLabelConfig, error: '' };
    } catch { return { config: FALLBACK, error: '现有白牌配置不是合法JSON，请重新保存。' }; }
  }, [value]);
  const emit = (patch: Partial<WhiteLabelConfig>) => onChange(JSON.stringify({ ...parsed.config, ...patch }, null, 2));
  const updateDomain = (index: number, domain: string) => emit({ domains: parsed.config.domains.map((item, i) => i === index ? domain : item) });

  return <div className="space-y-4">
    {parsed.error && <Alert color="danger" title="白牌配置需要修复" description={parsed.error} />}
    <Alert color={parsed.config.enabled ? 'success' : 'default'} variant="flat" title="白牌模式总开关" description="开启后，命中下方域名的请求会隐藏品牌、客服、邀请、微信登录和支付入口。" endContent={<Switch aria-label="白牌模式总开关" isSelected={parsed.config.enabled} onValueChange={(enabled) => emit({ enabled })} isDisabled={disabled} />} />
    <div className="space-y-2">
      <div className="flex items-center justify-between"><p className="text-sm font-medium">白牌域名</p><Button size="sm" variant="flat" startContent={<Plus className="h-4 w-4" />} onPress={() => emit({ domains: [...parsed.config.domains, ''] })} isDisabled={disabled}>新增域名</Button></div>
      {parsed.config.domains.map((domain, index) => <div key={index} className="flex items-center gap-2">
        <Input aria-label={`白牌域名 ${index + 1}`} placeholder="partner.example.com" value={domain} onValueChange={(next) => updateDomain(index, next)} isDisabled={disabled} description="填写根域名后，其子域名也会命中" />
        <Button isIconOnly color="danger" variant="light" aria-label={`删除白牌域名 ${index + 1}`} onPress={() => emit({ domains: parsed.config.domains.filter((_, i) => i !== index) })} isDisabled={disabled}><Trash2 className="h-4 w-4" /></Button>
      </div>)}
      {parsed.config.domains.length === 0 && <Alert color="warning" variant="flat" title="尚未配置白牌域名" description="开启白牌模式前至少需要添加一个域名。" />}
    </div>
    <Textarea label="白牌公告" value={parsed.config.notice} onValueChange={(notice) => emit({ notice })} minRows={3} isDisabled={disabled} description="仅对白牌域名访问者展示" />
    <div className="flex items-end gap-2">
      <Input label="公告版本ID" value={parsed.config.notice_id} onValueChange={(notice_id) => emit({ notice_id })} isDisabled={disabled} description="公告内容更新后更换此ID，已读用户才会再次看到" />
      <Button isIconOnly variant="flat" aria-label="生成新的公告版本ID" onPress={() => emit({ notice_id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) })} isDisabled={disabled}><RefreshCw className="h-4 w-4" /></Button>
    </div>
  </div>;
};
