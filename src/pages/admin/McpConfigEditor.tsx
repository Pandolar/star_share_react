import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, Select, SelectItem, Switch } from '@heroui/react';
import { Plus, Trash2 } from 'lucide-react';
import adminApiService from '../../services/adminApi';
import type { AdminPermission, AdministratorAccount } from '../../types/admin';

type Agent = {
  id: string;
  name: string;
  enabled: boolean;
  owner_admin_id: number;
  permissions: string[];
  token?: string;
  token_configured?: boolean;
};
type Config = { enabled: boolean; agents: Agent[] };
const parse = (value: string): Config => {
  try {
    const data = JSON.parse(value || '{}');
    return { enabled: data.enabled === true, agents: Array.isArray(data.agents) ? data.agents : [] };
  } catch {
    return { enabled: false, agents: [] };
  }
};

export const McpConfigEditor: React.FC<{ value: string; onChange: (value: string) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => {
  const config = useMemo(() => parse(value), [value]);
  const [accounts, setAccounts] = useState<AdministratorAccount[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  useEffect(() => {
    if (disabled) return;
    void Promise.all([adminApiService.getAdministratorAccounts({ page_size: 100 }), adminApiService.getAdministratorPermissions()])
      .then(([accountResult, permissionResult]) => {
        if (accountResult.code === 20000) setAccounts(accountResult.data || []);
        if (permissionResult.code === 20000) setPermissions(permissionResult.data || []);
      }).catch(() => {
        setAccounts([]);
        setPermissions([]);
      });
  }, [disabled]);
  const emit = (next: Config) => onChange(JSON.stringify(next, null, 2));
  const patchAgent = (index: number, patch: Partial<Agent>) => emit({
    ...config, agents: config.agents.map((agent, position) => position === index ? { ...agent, ...patch } : agent),
  });
  return (
    <div className="space-y-4 rounded-medium border border-divider p-4">
      <Switch isSelected={config.enabled} onValueChange={(enabled) => emit({ ...config, enabled })} isDisabled={disabled}>启用 MCP 网关</Switch>
      <p className="text-sm text-default-500">默认关闭。每个 Agent 使用独立令牌，实际工具权限为授权列表与绑定管理员当前角色权限的交集；禁用账号或移除角色后即时收窄。令牌保存后仅保留摘要，不会回显。</p>
      <div className="flex items-center justify-between">
        <h3 className="font-medium">第三方 Agent</h3>
        <Button size="sm" variant="flat" startContent={<Plus className="h-4 w-4" />} isDisabled={disabled || config.agents.length >= 100}
          onPress={() => emit({ ...config, agents: [...config.agents, { id: '', name: '', enabled: false, owner_admin_id: 0, permissions: [], token: '' }] })}>
          新增 Agent
        </Button>
      </div>
      {config.agents.map((agent, index) => (
        <div key={`${agent.id}-${index}`} className="space-y-3 rounded-medium border border-divider p-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Input label="Agent ID（字母开头，3–64 位）" value={agent.id} onValueChange={(id) => patchAgent(index, { id })} isDisabled={disabled} />
            <Input label="名称" value={agent.name} onValueChange={(name) => patchAgent(index, { name })} isDisabled={disabled} />
            <Select label="绑定管理员" selectedKeys={agent.owner_admin_id ? [String(agent.owner_admin_id)] : []}
              onSelectionChange={(keys) => patchAgent(index, { owner_admin_id: Number(Array.from(keys)[0]) || 0 })} isDisabled={disabled}>
              {accounts.map((account) => <SelectItem key={String(account.id)}>{account.display_name || account.username}</SelectItem>)}
            </Select>
            <Input label={agent.token_configured ? '轮换令牌（留空保持原令牌）' : '令牌（32–512 位）'}
              type="password" value={agent.token || ''} onValueChange={(token) => patchAgent(index, { token })} isDisabled={disabled} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Switch size="sm" isSelected={agent.enabled} onValueChange={(enabled) => patchAgent(index, { enabled })} isDisabled={disabled}>启用此 Agent</Switch>
            <Button size="sm" color="danger" variant="flat" startContent={<Trash2 className="h-4 w-4" />} isDisabled={disabled}
              onPress={() => emit({ ...config, agents: config.agents.filter((_, position) => position !== index) })}>移除 Agent</Button>
          </div>
          <div className="max-h-48 overflow-y-auto rounded-medium border border-divider p-2">
            <p className="mb-2 text-sm font-medium">允许权限（还需绑定账号当前拥有该权限）</p>
            <div className="grid gap-2 md:grid-cols-2">
              {permissions.filter((permission) => {
                const owner = accounts.find((account) => account.id === agent.owner_admin_id);
                const key = permission.permission_key;
                const restricted = key.startsWith('administrator.') || key.startsWith('mcp.') ||
                  ['config.read', 'config.update', 'config.secret.write', 'config.runtime.reload', 'runtime_log.read', 'audit.read', 'audit.retention.update'].includes(key);
                return !restricted && (owner?.is_superadmin || owner?.permissions.includes(key));
              }).map((permission) => (
                <Switch key={permission.permission_key} size="sm" isSelected={agent.permissions?.includes(permission.permission_key) || false}
                  onValueChange={(checked) => patchAgent(index, { permissions: checked
                    ? [...(agent.permissions || []), permission.permission_key]
                    : (agent.permissions || []).filter((key) => key !== permission.permission_key) })} isDisabled={disabled}>
                  {permission.label} · {permission.permission_key}
                </Switch>
              ))}
            </div>
          </div>
        </div>
      ))}
      <div className="space-y-2 rounded-medium bg-default-100 p-3 text-sm">
        <p className="font-medium">MCP 调用格式</p>
        <p>地址：<code>POST /star/mcp</code>；请求头：<code>Authorization: Bearer &lt;Agent 令牌&gt;</code>、<code>Content-Type: application/json</code>、<code>Accept: application/json, text/event-stream</code>。GET/DELETE 返回 405（无 SSE、无服务端会话）。</p>
        <p>先发送 <code>initialize</code>（protocolVersion: <code>2025-06-18</code>），再发送 <code>notifications/initialized</code> 和 <code>tools/list</code> 获取当前 Agent 可见工具；调用 <code>tools/call</code>，name 为工具名，arguments 与对应后台接口参数一致。每次请求都必须携带 Bearer 令牌；服务端不保留 MCP 会话。</p>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-content1 p-2">{JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'admin_get_star_cs_conversations', arguments: { current_page: 1, page_size: 20 } } }, null, 2)}</pre>
      </div>
    </div>
  );
};
