import React, { useMemo } from 'react';
import { Alert, Button, Input, NumberInput } from '@heroui/react';
import { Plus, Trash2, Wifi } from 'lucide-react';

interface NodeEntry { url: string; weight: number }
interface Props { value: string; onChange: (value: string) => void; disabled?: boolean }

const parseNodes = (value: string): NodeEntry[] => String(value || '')
  .split(/[,，\n]+/)
  .map((raw) => raw.trim())
  .filter(Boolean)
  .map((raw) => {
    const [url, weight] = raw.split('|', 2);
    const parsedWeight = Number(weight);
    return { url: url.trim(), weight: Number.isFinite(parsedWeight) ? Math.max(0, Math.trunc(parsedWeight)) : 0 };
  });

export const SpeedTestNodesEditor: React.FC<Props> = ({ value, onChange, disabled }) => {
  const nodes = useMemo(() => parseNodes(value), [value]);
  const emit = (next: NodeEntry[]) => onChange(next
    .map((node) => node.url.trim() ? (node.weight > 0 ? `${node.url.trim()}|${node.weight}` : node.url.trim()) : '|0')
    .join(','));
  const update = (index: number, patch: Partial<NodeEntry>) => emit(nodes.map((node, i) => i === index ? { ...node, ...patch } : node));

  return <div className="space-y-3">
    <Alert color="primary" variant="flat" title="测速节点选择规则" description="权重大于0的是主节点，会优先并行测速并按权重/延迟选择；权重为0的是备用节点，仅在所有主节点不可用时测速。" startContent={<Wifi className="h-5 w-5" />} />
    {nodes.map((node, index) => <div key={index} className="grid gap-2 rounded-lg border border-divider p-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
      <Input label={`节点 ${index + 1}`} placeholder="例如 node.example.com" value={node.url} onValueChange={(url) => update(index, { url })} isDisabled={disabled} isInvalid={!node.url.trim()} errorMessage={!node.url.trim() ? '节点地址不能为空' : undefined} description="可填写域名或 http(s) URL，测速请求会访问 /u/ping" />
      <NumberInput label="主节点权重" value={node.weight} onValueChange={(weight) => update(index, { weight: Math.max(0, Math.trunc(weight || 0)) })} minValue={0} step={1} isDisabled={disabled} description={node.weight > 0 ? '主节点' : '备用节点'} />
      <Button isIconOnly color="danger" variant="light" aria-label={`删除节点 ${index + 1}`} onPress={() => emit(nodes.filter((_, i) => i !== index))} isDisabled={disabled}><Trash2 className="h-4 w-4" /></Button>
    </div>)}
    {nodes.length === 0 && <Alert color="warning" variant="flat" title="尚未配置测速节点" description="未配置时用户测速页面无法选择访问节点。" />}
    <Button size="sm" color="primary" variant="flat" startContent={<Plus className="h-4 w-4" />} onPress={() => emit([...nodes, { url: '', weight: 0 }])} isDisabled={disabled}>新增节点</Button>
  </div>;
};
