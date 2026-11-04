import React, { useEffect, useState } from 'react';
import { Alert, Button, Select, SelectItem } from '@heroui/react';
import siteApi, { siteData } from '../../services/siteApi';
import type { DistributorOption } from '../../types/site';

interface Props {
  value: number | null;
  isDisabled?: boolean;
  onChange: (distributorId: number | null) => void;
}
export default function AdminDistributorSelect({ value, isDisabled = false, onChange }: Props) {
  const [options, setOptions] = useState<DistributorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await siteApi.listDistributorOptions();
      setOptions(siteData(response));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '代理选项加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  if (loading) return <Select label="所属代理" selectedKeys={[value === null ? 'unassigned' : String(value)]} isDisabled description="正在加载代理选项…"><SelectItem key={value === null ? 'unassigned' : String(value)}>{value === null ? '未分配' : `已选代理 #${value}`}</SelectItem></Select>;

  if (error) return <Alert color="danger" title="无法加载代理选项" description={error} endContent={<Button size="sm" variant="flat" onPress={() => void load()}>重试</Button>} />;


  return <Select
    label="所属代理"
    selectedKeys={[value === null ? 'unassigned' : String(value)]}
    isDisabled={isDisabled || loading}
    disallowEmptySelection
    onChange={(event) => onChange(event.target.value === 'unassigned' ? null : Number(event.target.value))}
    description="更改归属不改变历史订单。"
  >
    {[
      <SelectItem key="unassigned">未分配</SelectItem>,
      ...options.map((option) => {
        const enabled = option.status === 1;
        return <SelectItem key={String(option.id)} textValue={`${option.username} · #${option.id} · ${option.parent_distributor_id === null ? '一级代理' : '二级代理'}`} isDisabled={!enabled}>{option.username} · #{option.id} · {option.parent_distributor_id === null ? '一级代理' : '二级代理'}{enabled ? '' : '（已禁用）'}</SelectItem>;
      }),
    ]}
  </Select>;
}
