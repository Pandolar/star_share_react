import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, CardBody, Input, NumberInput, Select, SelectItem, Switch } from '@heroui/react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import csCommandApi from '../../services/csCommandApi';
import type { ConnectionProfile, ConnectionState } from '../../types/csCommand';

const secretFields = [
  { flag: 'app_key_configured', field: 'app_key', label: '对客回复应用密钥', hint: 'Dify 客服对话应用的 Service API Key，用于回答普通咨询。' },
  { flag: 'command_app_key_configured', field: 'command_app_key', label: '指令理解工作流密钥', hint: '独立的指令工作流 Key，负责解析管理员安排、区分问题；不能直接执行操作。' },
  { flag: 'mine_app_key_configured', field: 'mine_app_key', label: '知识提炼工作流密钥', hint: '从已解决的人工会话提炼知识候选，仍需审核。' },
  { flag: 'dataset_key_configured', field: 'dataset_key', label: '共享知识库密钥', hint: '用于访问 Dify 知识库，需同时填写知识库 ID。' },
] as const;

export const CsAiConnectionsPanel: React.FC = () => {
  const { can } = useAdminAuth();
  const canWrite = can('config.update') && can('customer_service.ai.manage');
  const [state, setState] = useState<ConnectionState | null>(null);
  const [profile, setProfile] = useState<ConnectionProfile>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [clears, setClears] = useState<string[]>([]);
  const [tested, setTested] = useState('');
  const [historyRevision, setHistoryRevision] = useState('none');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const mounted = useRef(true);

  const accept = (next: ConnectionState) => {
    setState(next); setProfile(next.profile); setSecrets({}); setClears([]); setTested('');
  };
  useEffect(() => {
    mounted.current = true;
    void csCommandApi.getConnections().then((next) => { if (mounted.current) accept(next); })
      .catch((caught) => { if (mounted.current) setError(caught instanceof Error ? caught.message : '模型连接加载失败'); });
    return () => { mounted.current = false; };
  }, []);

  const run = async (operation: () => Promise<unknown>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setNotice('');
    try { await operation(); }
    catch (caught) { if (mounted.current) setError(caught instanceof Error ? caught.message : '连接操作未完成'); }
    finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  };
  const payload = { revision: state?.revision, profile: { ...profile, ...secrets }, clear_fields: clears };

  if (!state) return <div className="mt-3 space-y-3">{error ? <>
    <Alert color="danger" title="无法读取模型连接" description={error} />
    <Button onPress={() => void run(async () => { accept(await csCommandApi.getConnections()); })}>重新加载</Button>
  </> : <p className="text-sm text-default-500">正在读取模型连接…</p>}</div>;

  return <section className="mt-3 min-w-0 space-y-4">
    <Alert color={state.effective_source === 'unconfigured' ? 'warning' : 'default'}
      title={state.active ? '当前使用已测试并启用的连接' : state.effective_source === 'environment' ? '当前使用服务器环境配置' : '尚未配置可用连接'}
      description={`正在使用的地址：${state.active_base_url || state.environment?.base_url || '未设置'}。仅保存草稿不会切换正在工作的连接，也不会开启自动接待。`} />
    {state.draft_differs && <Alert color="warning" title="有尚未启用的连接草稿" description="当前接待仍使用上方显示的连接。核对并测试后，再明确切换。" />}
    {state.encryption_ready === false && <Alert color="warning" title="服务器尚未准备好密钥加密保护" description="运维需要先设置 CS_AI_ENCRYPTION_KEY，才能把密钥加密保存到后台；已有环境连接仍可继续使用。配置主密钥的方法见配套部署说明，不要把主密钥粘贴在这里。" />}
    {!canWrite && <Alert color="default" title="你可以查看连接状态" description="更改密钥、测试或切换连接需要系统配置权限，请联系系统管理员。" />}
    {error && <Alert color="danger" title="未完成连接操作" description={error} />}
    {notice && !error && <Alert color="success" title={notice} />}
    <Card shadow="none" className="border border-divider"><CardBody className="gap-4 p-4">
      <div><h3 className="font-semibold">填写 Dify 服务连接</h3><p className="mt-1 text-sm text-default-500">这里填写 Dify 的应用和知识库凭据。上游大模型的供应商、模型名和调用 Key 在 Dify 的“模型供应商”中设置，两者不要混填。</p></div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Dify 服务 API 地址" value={profile.base_url || ''} isDisabled={busy || !canWrite}
          onValueChange={(base_url) => { setProfile({ ...profile, base_url }); setTested(''); }}
          placeholder="https://dify.example.com/v1" description={`通常以 /v1 结尾；允许的服务主机：${state.allowed_hosts?.join('、') || '由服务器运维配置'}。`} />
        <NumberInput label="单次模型请求超时（秒）" minValue={1} maxValue={120} step={1} value={profile.timeout_seconds || 45} isDisabled={busy || !canWrite}
          onValueChange={(value) => { setProfile({ ...profile, timeout_seconds: Math.max(1, Math.trunc(value || 1)) }); setTested(''); }} />
        <Input label="共享知识库 ID" value={profile.dataset_id || ''} isDisabled={busy || !canWrite}
          onValueChange={(dataset_id) => { setProfile({ ...profile, dataset_id }); setTested(''); }} description="知识库标识不是密钥；限定站点的标准答复不会上传到共享知识库。" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">{secretFields.map((item) => <div key={item.field} className="space-y-2 rounded-lg border border-divider p-3">
        <Input type="password" autoComplete="new-password" label={item.label} value={secrets[item.field] || ''}
          isDisabled={busy || !canWrite || clears.includes(item.field)}
          placeholder={profile[item.flag] ? '已有密钥，留空保留，不会显示原文' : '填写 Dify Service API Key'}
          description={item.hint} onValueChange={(value) => { setSecrets({ ...secrets, [item.field]: value }); setTested(''); }} />
        <Switch size="sm" isSelected={clears.includes(item.field)} isDisabled={busy || !canWrite}
          onValueChange={(selected) => { setClears((current) => selected ? [...current.filter((field) => field !== item.field), item.field] : current.filter((field) => field !== item.field)); setTested(''); }}>
          在草稿中清除此密钥
        </Switch>
      </div>)}</div>
      <p className="text-xs text-default-500">更换服务地址时，需要重新填写或明确清除已有密钥，防止把旧凭据发给另一个服务。清除草稿中的密钥也需测试并切换后才影响正在工作的连接。</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="flat" isLoading={busy} isDisabled={!canWrite}
          onPress={() => void run(async () => { const result = await csCommandApi.testConnections(payload); setTested(result.ok ? result.fingerprint : ''); setNotice(result.message || '已完成连接测试'); })}>测试这份连接草稿</Button>
        <Button variant="flat" isDisabled={busy || !canWrite || state.encryption_ready === false}
          onPress={() => void run(async () => { accept(await csCommandApi.saveConnections({ ...payload, active: false })); setNotice('仅保存了加密草稿，当前连接没有切换。'); })}>仅保存草稿，不切换</Button>
        <Button color="primary" isDisabled={busy || !canWrite || !tested || state.encryption_ready === false}
          onPress={() => void run(async () => { accept(await csCommandApi.saveConnections({ ...payload, active: true })); setNotice('连接已重新验证并切换，自动接待开关保持原状。'); })}>确认切换到已测试连接</Button>
      </div>
      {busy && <p className="text-sm text-default-500">正在核对已配置的指令、代答、提炼和知识库服务；不会发送客户消息或更新正式知识，请稍候。</p>}
    </CardBody></Card>
    <Card shadow="none" className="border border-divider"><CardBody className="gap-3 p-4">
      <h3 className="font-semibold">需要回退时</h3>
      <p className="text-sm text-default-500">切换前的连接会保留加密备份，最多10份。回退也会先重新测试，不会盲目启用失效密钥。</p>
      <Select label="历史生效连接备份" items={[{ id: 'none', name: '请选择历史版本' }, ...(state.history || []).map((item) => ({ id: String(item.revision), name: `版本 ${item.revision} · ${item.base_url}` }))]}
        selectedKeys={[historyRevision]} isDisabled={busy || !canWrite} onSelectionChange={(keys) => { const value = Array.from(keys)[0]; if (value !== undefined) setHistoryRevision(String(value)); }}>
        {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
      </Select>
      <div className="flex flex-wrap gap-2">
        <Button variant="flat" isDisabled={busy || !canWrite || historyRevision === 'none' || state.encryption_ready === false}
          onPress={() => void run(async () => { accept(await csCommandApi.saveConnections({ revision: state.revision, action: 'restore', restore_revision: Number(historyRevision), active: true })); setHistoryRevision('none'); setNotice('历史连接已通过测试并重新启用。'); })}>重新测试并切回所选版本</Button>
        <Button variant="light" isDisabled={busy || !canWrite || !state.active}
          onPress={() => void run(async () => { accept(await csCommandApi.saveConnections({ revision: state.revision, action: 'use_environment' })); setNotice('已明确切回服务器环境连接，后台草稿仍保留。'); })}>明确切回服务器环境配置</Button>
      </div>
    </CardBody></Card>
  </section>;
};
