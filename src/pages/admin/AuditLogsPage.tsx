import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tooltip,
} from '@heroui/react';
import { Eye, FileClock, RefreshCw, Save, Search, Settings2, ShieldCheck } from 'lucide-react';
import adminApiService from '../../services/adminApi';
import { showToast } from '../../components/Toast';
import type { AuditLogCatalogItem, AuditLogRecord, AuditLogRetentionMode, AuditLogRetentionPolicy } from '../../types/admin';

const PAGE_SIZE = 20;

const RETENTION_OPTIONS: Array<{ key: AuditLogRetentionMode; label: string }> = [
  { key: 'forever', label: '永久保留' },
  { key: 'days', label: '按时间保留' },
  { key: 'count', label: '按最新条数保留' },
];

const retentionMode = (policy: AuditLogRetentionPolicy, logType: string): AuditLogRetentionMode => policy[logType]?.mode || 'forever';

const retentionLabel = (policy: AuditLogRetentionPolicy, logType: string): string => {
  const rule = policy[logType];
  if (!rule) return '永久保留';
  return rule.mode === 'days' ? `保留近 ${rule.value} 天` : `保留最新 ${rule.value.toLocaleString('zh-CN')} 条`;
};

const RESULT_LABELS: Record<string, string> = {
  success: '成功',
  invalid_credentials: '账密错误',
  disabled: '账号禁用',
  login_forbidden: '禁止登录',
  logout: '退出登录',
  admin_recharge: '管理员充值',
  login: '登录',
  admin_deduct: '管理员扣减',
  generate_cdk: '生成卡密扣款',
  create: '新增',
  update: '修改',
  rename: '改名',
  publish: '发布',
  unpublish: '撤回',
  delete: '删除',
};

const TYPE_COLORS: Record<string, 'primary' | 'secondary' | 'success' | 'warning'> = {
  distributor_auth: 'warning',
  user_session: 'primary',
  distributor_balance: 'success',
  cdk_usage: 'secondary',
  article_management: 'primary',
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  if (typeof value === 'boolean') return value ? '是' : '否';
  return String(value);
};

const describeLog = (record: AuditLogRecord): string => {
  const data = record.data;
  if (record.type === 'distributor_auth') {
    return `${data.username || '未知账号'} · ${RESULT_LABELS[String(data.result || '')] || data.result || '未知结果'}`;
  }
  if (record.type === 'user_session') {
    return `用户 #${record.user_id ?? '-'} · ${RESULT_LABELS[String(data.action || '')] || data.action || '会话变更'}${data.deleted ? ' · 已清理服务端缓存' : ''}`;
  }
  if (record.type === 'distributor_balance') {
    const amount = Number(data.change_amount || 0);
    return `${RESULT_LABELS[String(data.action || '')] || data.action || '余额变动'} · ${amount >= 0 ? '+' : ''}${amount.toFixed(2)} 元`;
  }
  if (record.type === 'cdk_usage') {
    return `兑换 ${data.cdk_code || `CDK #${record.ref_id ?? '-'}`} · 套餐 #${data.package_id ?? '-'}`;
  }
  if (record.type === 'article_management') {
    const action = RESULT_LABELS[String(data.action || '')] || data.action || '内容变更';
    return `${action}文章 ${data.title || data.identifier || '-'} · /star/doc/${data.identifier || '-'}`;
  }
  return Object.entries(data).slice(0, 2).map(([key, value]) => `${key}: ${formatValue(value)}`).join(' · ') || '无附加信息';
};

const resultColor = (record: AuditLogRecord): 'success' | 'danger' | 'warning' | 'default' => {
  const result = String(record.data.result || record.data.action || '');
  if (result === 'success' || result === 'admin_recharge') return 'success';
  if (result === 'invalid_credentials' || result === 'disabled' || result === 'login_forbidden') return 'danger';
  if (result === 'admin_deduct' || result === 'generate_cdk') return 'warning';
  return 'default';
};

const AuditLogsPage: React.FC = () => {
  const [rows, setRows] = useState<AuditLogRecord[]>([]);
  const [catalog, setCatalog] = useState<AuditLogCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState('all');
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [userIdInput, setUserIdInput] = useState('');
  const [refIdInput, setRefIdInput] = useState('');
  const [userId, setUserId] = useState<number | undefined>();
  const [refId, setRefId] = useState<number | undefined>();
  const [selected, setSelected] = useState<AuditLogRecord | null>(null);
  const [retention, setRetention] = useState<AuditLogRetentionPolicy>({});
  const [retentionDraft, setRetentionDraft] = useState<AuditLogRetentionPolicy>({});
  const [retentionOpen, setRetentionOpen] = useState(false);
  const [retentionSaving, setRetentionSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApiService.getAuditLogs({
        current_page: page,
        page_size: PAGE_SIZE,
        ...(type !== 'all' ? { type } : {}),
        ...(query ? { querystring: query } : {}),
        ...(userId !== undefined ? { user_id: userId } : {}),
        ...(refId !== undefined ? { ref_id: refId } : {}),
      });
      if (response.code !== 20000 || !response.data) {
        showToast(response.msg || '获取审计日志失败', 'error');
        return;
      }
      setRows(Array.isArray(response.data.list) ? response.data.list : []);
      setCatalog(Array.isArray(response.data.catalog) ? response.data.catalog : []);
      setTotal(Number(response.total) || 0);
      const nextRetention = response.data.retention || {};
      setRetention(nextRetention);
      if (!retentionOpen) setRetentionDraft(nextRetention);
    } catch (error: any) {
      showToast(error.response?.data?.msg || '获取审计日志失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, query, refId, retentionOpen, type, userId]);

  useEffect(() => { void load(); }, [load]);

  const totalAcrossTypes = useMemo(() => catalog.reduce((sum, item) => sum + Number(item.count || 0), 0), [catalog]);
  const typeOptions = useMemo(() => [{
    type: 'all', label: '全部日志', group: '全部', description: '查看全部类型的审计和业务日志。', count: totalAcrossTypes,
  }, ...catalog], [catalog, totalAcrossTypes]);

  const applyFilters = () => {
    const parsedUserId = userIdInput.trim() ? Number(userIdInput) : undefined;
    const parsedRefId = refIdInput.trim() ? Number(refIdInput) : undefined;
    if (parsedUserId !== undefined && (!Number.isInteger(parsedUserId) || parsedUserId < 1)) {
      showToast('用户ID必须是正整数', 'warning');
      return;
    }
    if (parsedRefId !== undefined && (!Number.isInteger(parsedRefId) || parsedRefId < 1)) {
      showToast('关联ID必须是正整数', 'warning');
      return;
    }
    setPage(1);
    setQuery(queryInput.trim());
    setUserId(parsedUserId);
    setRefId(parsedRefId);
  };

  const resetFilters = () => {
    setPage(1);
    setType('all');
    setQueryInput('');
    setQuery('');
    setUserIdInput('');
    setRefIdInput('');
    setUserId(undefined);
    setRefId(undefined);
  };

  const openRetention = () => {
    setRetentionDraft(retention);
    setRetentionOpen(true);
  };

  const setRetentionMode = (logType: string, mode: AuditLogRetentionMode) => {
    setRetentionDraft((current) => {
      if (mode === 'forever') {
        const next = { ...current };
        delete next[logType];
        return next;
      }
      return {
        ...current,
        [logType]: { mode, value: mode === 'days' ? 30 : 10000 },
      };
    });
  };

  const setRetentionValue = (logType: string, value: string) => {
    setRetentionDraft((current) => {
      const rule = current[logType];
      if (!rule) return current;
      return { ...current, [logType]: { ...rule, value: Number(value) } };
    });
  };

  const saveRetention = async () => {
    for (const [logType, rule] of Object.entries(retentionDraft)) {
      const maximum = rule.mode === 'days' ? 3650 : 10000000;
      if (!Number.isInteger(rule.value) || rule.value < 1 || rule.value > maximum) {
        showToast(`${catalog.find((item) => item.type === logType)?.label || logType}的保留数值必须是 1-${maximum.toLocaleString('zh-CN')} 的整数`, 'warning');
        return;
      }
    }
    setRetentionSaving(true);
    try {
      const response = await adminApiService.updateAuditLogRetention(retentionDraft);
      if (response.code !== 20000) {
        showToast(response.msg || '保存日志保留策略失败', 'error');
        return;
      }
      const nextRetention = response.data.retention || {};
      setRetention(nextRetention);
      setRetentionDraft(nextRetention);
      setRetentionOpen(false);
      showToast(`保留策略已保存，本次清理 ${Number(response.data.deleted || 0).toLocaleString('zh-CN')} 条历史日志`, 'success');
      await load();
    } catch (error: any) {
      showToast(error.response?.data?.msg || '保存日志保留策略失败', 'error');
    } finally {
      setRetentionSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">审计日志</h1>
            <p className="text-sm text-default-500">统一查看安全审计、资金流水和关键业务记录</p>
          </div>
        </div>
        <div className="flex gap-2"><Tooltip content="按日志类型设置永久、按天或按最新条数保留"><Button variant="flat" startContent={<Settings2 size={16} />} onPress={openRetention}>保留策略</Button></Tooltip><Button variant="flat" startContent={<RefreshCw size={16} />} onPress={load} isLoading={loading}>刷新</Button></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {typeOptions.map((item) => (
          <Card
            key={item.type}
            isPressable
            shadow="sm"
            className={type === item.type ? 'border-2 border-primary bg-primary-50' : 'border border-divider'}
            onPress={() => { setType(item.type); setPage(1); }}
          >
            <CardBody className="gap-1 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{item.label}</span>
                <Chip size="sm" variant="flat" color={TYPE_COLORS[item.type] || 'default'}>{item.count}</Chip>
              </div>
              <p className="text-xs text-default-500 line-clamp-2">{item.description}</p>
              <p className="text-[11px] text-primary-600">{retentionLabel(retention, item.type)}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card shadow="sm"><CardBody className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_12rem_10rem_10rem_auto]">
        <Input
          value={queryInput}
          onValueChange={setQueryInput}
          onKeyDown={(event) => { if (event.key === 'Enter') applyFilters(); }}
          placeholder="搜索账号、IP、卡密、操作人或日志内容"
          startContent={<Search size={16} />}
        />
        <Select selectedKeys={[type]} onSelectionChange={(keys) => { setType(String(Array.from(keys)[0] || 'all')); setPage(1); }} aria-label="日志类型">
          {typeOptions.map((item) => <SelectItem key={item.type}>{item.label}</SelectItem>)}
        </Select>
        <Input value={userIdInput} onValueChange={setUserIdInput} inputMode="numeric" placeholder="用户ID" />
        <Input value={refIdInput} onValueChange={setRefIdInput} inputMode="numeric" placeholder="关联ID" />
        <div className="flex gap-2"><Button color="primary" onPress={applyFilters}>查询</Button><Button variant="flat" onPress={resetFilters}>重置</Button></div>
      </CardBody></Card>

      <Table aria-label="统一审计日志列表" classNames={{ wrapper: 'min-h-80' }}>
        <TableHeader>
          <TableColumn>时间 / 类型</TableColumn>
          <TableColumn>对象</TableColumn>
          <TableColumn>摘要</TableColumn>
          <TableColumn>来源</TableColumn>
          <TableColumn>详情</TableColumn>
        </TableHeader>
        <TableBody isLoading={loading} loadingContent={<Spinner label="加载审计日志中..." />} emptyContent="没有符合条件的日志">
          {rows.map((record) => (
            <TableRow key={record.id}>
              <TableCell><div className="space-y-1"><p className="whitespace-nowrap text-sm">{record.created_at || '-'}</p><Chip size="sm" variant="flat" color={TYPE_COLORS[record.type] || 'default'}>{record.type_label}</Chip></div></TableCell>
              <TableCell><div className="space-y-1 text-xs"><p>日志 #{record.id}</p><p className="text-default-500">用户 {record.user_id ?? '-'} · 关联 {record.ref_id ?? '-'}</p></div></TableCell>
              <TableCell><div className="max-w-md space-y-1"><p className="text-sm">{describeLog(record)}</p>{Boolean(record.data.result || record.data.action) && <Chip size="sm" variant="flat" color={resultColor(record)}>{RESULT_LABELS[String(record.data.result || record.data.action)] || String(record.data.result || record.data.action)}</Chip>}</div></TableCell>
              <TableCell><div className="max-w-52 text-xs"><p className="truncate" title={String(record.data.ip || record.data.ip_address || '')}>{String(record.data.ip || record.data.ip_address || '-')}</p><p className="truncate text-default-400" title={String(record.data.operator || record.data.user_agent || '')}>{String(record.data.operator || record.data.user_agent || '-')}</p></div></TableCell>
              <TableCell><Button isIconOnly size="sm" variant="flat" aria-label={`查看日志 ${record.id} 详情`} onPress={() => setSelected(record)}><Eye size={16} /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-default-500">共 {total} 条，当前第 {page}/{Math.max(1, Math.ceil(total / PAGE_SIZE))} 页</p>
        {total > PAGE_SIZE && <Pagination page={page} total={Math.ceil(total / PAGE_SIZE)} onChange={setPage} showControls />}
      </div>

      <Modal isOpen={retentionOpen} onClose={() => setRetentionOpen(false)} size="3xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" />审计日志保留策略</ModalHeader>
          <ModalBody className="gap-3">
            <p className="text-sm text-default-500">每种日志独立设置。保存后立即清理一次，系统每天 03:20 自动执行；永久保留不会删除历史数据。</p>
            <Divider />
            {catalog.map((item) => {
              const mode = retentionMode(retentionDraft, item.type);
              const rule = retentionDraft[item.type];
              return (
                <Card key={item.type} shadow="none" className="border border-divider">
                  <CardBody className="grid items-center gap-3 md:grid-cols-[minmax(12rem,1fr)_12rem_13rem]">
                    <div><div className="flex items-center gap-2"><p className="font-medium">{item.label}</p><Chip size="sm" variant="flat">当前 {item.count.toLocaleString('zh-CN')} 条</Chip></div><p className="mt-1 text-xs text-default-500">{item.description}</p></div>
                    <Select aria-label={`${item.label}保留方式`} selectedKeys={[mode]} onSelectionChange={(keys) => setRetentionMode(item.type, String(Array.from(keys)[0] || 'forever') as AuditLogRetentionMode)}>
                      {RETENTION_OPTIONS.map((option) => <SelectItem key={option.key}>{option.label}</SelectItem>)}
                    </Select>
                    {mode === 'forever' ? <p className="text-sm text-default-500">不自动删除</p> : <Input type="number" min={1} max={mode === 'days' ? 3650 : 10000000} value={String(rule?.value || '')} onValueChange={(value) => setRetentionValue(item.type, value)} endContent={<span className="whitespace-nowrap text-xs text-default-400">{mode === 'days' ? '天' : '条'}</span>} aria-label={`${item.label}保留${mode === 'days' ? '天数' : '条数'}`} />}
                  </CardBody>
                </Card>
              );
            })}
          </ModalBody>
          <ModalFooter><Button variant="light" onPress={() => setRetentionOpen(false)}>取消</Button><Button color="primary" startContent={<Save size={16} />} isLoading={retentionSaving} onPress={saveRetention}>保存并立即清理</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} size="2xl" scrollBehavior="inside">
        <ModalContent>{(onClose) => <>
          <ModalHeader className="flex items-center gap-2"><FileClock className="h-5 w-5 text-primary" />日志详情 #{selected?.id}</ModalHeader>
          <ModalBody className="gap-4">
            {selected && <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Card shadow="none" className="border border-divider"><CardBody><p className="text-xs text-default-500">类型</p><p>{selected.type_label}（{selected.type}）</p></CardBody></Card>
                <Card shadow="none" className="border border-divider"><CardBody><p className="text-xs text-default-500">发生时间</p><p>{selected.created_at || '-'}</p></CardBody></Card>
                <Card shadow="none" className="border border-divider"><CardBody><p className="text-xs text-default-500">用户ID</p><p>{selected.user_id ?? '-'}</p></CardBody></Card>
                <Card shadow="none" className="border border-divider"><CardBody><p className="text-xs text-default-500">关联ID</p><p>{selected.ref_id ?? '-'}</p></CardBody></Card>
              </div>
              <div className="overflow-hidden rounded-xl border border-divider">
                {Object.entries(selected.data).map(([key, value]) => (
                  <div key={key} className="grid gap-1 border-b border-divider px-4 py-3 last:border-b-0 sm:grid-cols-[11rem_1fr]">
                    <code className="text-xs text-default-500">{key}</code>
                    <pre className="whitespace-pre-wrap break-all font-sans text-sm">{formatValue(value)}</pre>
                  </div>
                ))}
                {Object.keys(selected.data).length === 0 && <p className="p-4 text-sm text-default-500">无附加字段</p>}
              </div>
            </>}
          </ModalBody>
          <ModalFooter><Button color="primary" onPress={onClose}>关闭</Button></ModalFooter>
        </>}</ModalContent>
      </Modal>
    </div>
  );
};

export default AuditLogsPage;
