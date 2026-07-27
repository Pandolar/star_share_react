import React, { useMemo, useState } from 'react';
import { Alert, Button, Divider, Input, NumberInput, Select, SelectItem, Textarea } from '@heroui/react';
import { Plus, Trash2, Zap } from 'lucide-react';

interface ModelGroup { name: string; models: string[] }
interface LevelRule { group_limits: Record<string, string>; model_limits: Record<string, string>; default: string }
interface LimitConfig { version: 2; model_costs: Record<string, number>; model_groups: Record<string, ModelGroup>; rules: Record<string, LevelRule>; messages: Record<string, string> }
interface Props { value: string; onChange: (value: string) => void; disabled?: boolean; legacyType?: string; packageLevels?: string[] }
interface LimitParts { count: number; duration: number; unit: string; mode: 'fixed' | 'sliding' }

const FALLBACK: LimitConfig = { version: 2, model_costs: {}, model_groups: {}, rules: { default: { group_limits: {}, model_limits: {}, default: '0/1min|fixed' } }, messages: {} };
const MESSAGE_LABELS: Record<string, string> = { zero_limit: '无权限提示语', group_limit: '模型分组超限提示语', model_limit: '单模型超限提示语', default_limit: '默认超限提示语' };
const UNITS: Record<string, string> = { second: '秒', min: '分钟', hour: '小时', day: '天', week: '周', month: '月', year: '年' };
const UNIT_SUFFIX: Record<string, string> = { second: '', min: 'min', hour: 'hour', day: 'day', week: 'week', month: 'month', year: 'year' };

const parseLimit = (value: string): LimitParts => {
  const [rawLimit = '0/1min', rawMode = 'sliding'] = String(value || '').split('|');
  const [rawCount = '0', rawDuration = '1min'] = rawLimit.split('/');
  const unit = Object.entries(UNIT_SUFFIX).find(([, suffix]) => suffix && rawDuration.endsWith(suffix))?.[0] || 'second';
  const suffix = UNIT_SUFFIX[unit];
  const durationText = suffix ? rawDuration.slice(0, -suffix.length) : rawDuration;
  return { count: Math.max(0, Number.parseInt(rawCount, 10) || 0), duration: Math.max(1, Number.parseInt(durationText, 10) || 1), unit, mode: rawMode === 'fixed' ? 'fixed' : 'sliding' };
};
const formatLimit = (parts: LimitParts) => `${Math.max(0, Math.trunc(parts.count))}/${Math.max(1, Math.trunc(parts.duration))}${UNIT_SUFFIX[parts.unit] || ''}|${parts.mode}`;
const emptyRule = (limit = '30/1hour|sliding'): LevelRule => ({ group_limits: {}, model_limits: {}, default: limit });

const normalizeConfig = (value: string, legacyType: string) => {
  try {
    const source = JSON.parse(value || '{}');
    if (source && Number(source.version) === 2) {
      const sourceRules = source.rules && typeof source.rules === 'object' ? source.rules as Record<string, Partial<LevelRule>> : {};
      const rules = Object.fromEntries(Object.entries(sourceRules).map(([level, rule]) => [level, {
        group_limits: rule.group_limits && typeof rule.group_limits === 'object' ? rule.group_limits : {},
        model_limits: rule.model_limits && typeof rule.model_limits === 'object' ? rule.model_limits : {},
        default: typeof rule.default === 'string' && rule.default.trim() ? rule.default : level === 'default' ? '0/1min|fixed' : '30/1hour|sliding',
      }])) as Record<string, LevelRule>;
      if (!rules.default) rules.default = emptyRule('0/1min|fixed');
      return { config: { ...FALLBACK, ...source, model_costs: source.model_costs || {}, model_groups: source.model_groups || {}, rules, messages: source.messages || {} } as LimitConfig, legacy: false, error: '' };
    }
    const rules: Record<string, LevelRule> = {};
    if (legacyType === 'detailed') {
      Object.entries(source?.detailed || {}).forEach(([level, rawModels]) => {
        const entries = rawModels && typeof rawModels === 'object' ? Object.entries(rawModels as Record<string, unknown>) : [];
        const model_limits: Record<string, string> = {};
        let defaultLimit = '30/1hour|sliding';
        entries.forEach(([model, limit]) => { if (model === 'default') defaultLimit = `${limit}|sliding`; else model_limits[model] = `${limit}|sliding`; });
        rules[level] = { group_limits: {}, model_limits, default: defaultLimit };
      });
    } else {
      Object.entries(source?.fixed || {}).forEach(([level, limit]) => { rules[level] = emptyRule(`${limit}|sliding`); });
    }
    if (!rules.default) rules.default = emptyRule('0/1min|fixed');
    return { config: { ...FALLBACK, rules }, legacy: true, error: '' };
  } catch { return { config: FALLBACK, legacy: false, error: '现有计费限速规则不是合法JSON，请重新保存。' }; }
};

const LimitValueEditor: React.FC<{ label: string; value: string; onChange: (value: string) => void; disabled?: boolean }> = ({ label, value, onChange, disabled }) => {
  const parts = parseLimit(value);
  const update = (patch: Partial<LimitParts>) => onChange(formatLimit({ ...parts, ...patch }));
  return <div className="grid gap-2 rounded-lg border border-divider p-3 sm:grid-cols-[minmax(8rem,1.2fr)_7rem_7rem_8rem]">
    <NumberInput label={label} value={parts.count} onValueChange={(count) => update({ count: Math.max(0, Math.trunc(count || 0)) })} minValue={0} step={1} isDisabled={disabled} description="0 表示禁止访问" />
    <NumberInput label="时间窗口" value={parts.duration} onValueChange={(duration) => update({ duration: Math.max(1, Math.trunc(duration || 1)) })} minValue={1} step={1} isDisabled={disabled} />
    <Select label="单位" selectedKeys={[parts.unit]} onSelectionChange={(keys) => update({ unit: String(Array.from(keys)[0] || 'min') })} isDisabled={disabled}>{Object.entries(UNITS).map(([key, text]) => <SelectItem key={key}>{text}</SelectItem>)}</Select>
    <Select label="计数方式" selectedKeys={[parts.mode]} onSelectionChange={(keys) => update({ mode: String(Array.from(keys)[0] || 'sliding') as 'fixed' | 'sliding' })} isDisabled={disabled}><SelectItem key="fixed">固定窗口</SelectItem><SelectItem key="sliding">滑动窗口</SelectItem></Select>
  </div>;
};

export const BillRuleConfigEditor: React.FC<Props> = ({ value, onChange, disabled, legacyType = 'fixed', packageLevels = [] }) => {
  const [newLevel, setNewLevel] = useState('');
  const parsed = useMemo(() => normalizeConfig(value, legacyType), [value, legacyType]);
  const config = parsed.config;
  const emit = (patch: Partial<LimitConfig>) => onChange(JSON.stringify({ ...config, ...patch, version: 2 }, null, 2));
  const updateGroups = (model_groups: Record<string, ModelGroup>) => emit({ model_groups });
  const updateRules = (rules: Record<string, LevelRule>) => emit({ rules });
  const nextGroupKey = () => {
    for (const char of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') if (!(char in config.model_groups)) return char;
    let index = 1; while (`group_${index}` in config.model_groups) index += 1; return `group_${index}`;
  };
  const renameRecordKey = <T,>(record: Record<string, T>, oldKey: string, newKey: string): Record<string, T> => {
    const normalized = newKey.trim(); if (!normalized || (normalized !== oldKey && normalized in record)) return record;
    return Object.fromEntries(Object.entries(record).map(([key, item]) => [key === oldKey ? normalized : key, item]));
  };
  const addLevel = () => {
    const level = newLevel.trim(); if (!level || level in config.rules) return;
    updateRules({ ...config.rules, [level]: emptyRule() }); setNewLevel('');
  };

  return <div className="space-y-5">
    {parsed.error && <Alert color="danger" title="计费限速规则需要修复" description={parsed.error} />}
    {parsed.legacy && <Alert color="warning" variant="flat" title="检测到旧版限速规则" description="页面已按当前规则转换为v2预览。点击转换后再保存，即可使用模型分组、权重和固定/滑动窗口。" endContent={<Button size="sm" color="warning" variant="flat" onPress={() => emit({})} isDisabled={disabled}>转换为 v2</Button>} />}
    <Alert color="primary" variant="flat" title="规则优先级" description="单模型限额优先于模型分组限额；两者都未命中时使用套餐等级的默认限额。模型权重表示一次请求消耗多少次配额。" startContent={<Zap className="h-5 w-5" />} />

    <section className="space-y-3"><div className="flex items-center justify-between"><div><h4 className="font-medium">模型消耗权重</h4><p className="text-xs text-default-500">未单独列出的模型每次请求消耗1次</p></div><Button size="sm" variant="flat" startContent={<Plus className="h-4 w-4" />} onPress={() => { let key = 'new-model'; let i = 2; while (key in config.model_costs) key = `new-model-${i++}`; emit({ model_costs: { ...config.model_costs, [key]: 2 } }); }} isDisabled={disabled}>新增模型</Button></div>
      {Object.entries(config.model_costs).map(([model, cost], index) => <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto]"><Input label="模型ID" value={model} onValueChange={(next) => emit({ model_costs: renameRecordKey(config.model_costs, model, next) })} isDisabled={disabled} /><NumberInput label="每次消耗" value={Number(cost)} onValueChange={(nextCost) => emit({ model_costs: { ...config.model_costs, [model]: Math.max(1, Math.trunc(nextCost || 1)) } })} minValue={1} step={1} isDisabled={disabled} /><Button isIconOnly color="danger" variant="light" aria-label={`删除模型${model}的消耗权重`} onPress={() => { const next = { ...config.model_costs }; delete next[model]; emit({ model_costs: next }); }} isDisabled={disabled}><Trash2 className="h-4 w-4" /></Button></div>)}
      {Object.keys(config.model_costs).length === 0 && <p className="rounded-lg border border-dashed border-divider p-3 text-center text-sm text-default-500">所有模型当前都按每次1次配额计算</p>}
    </section>

    <Divider />
    <section className="space-y-3"><div className="flex items-center justify-between"><div><h4 className="font-medium">模型分组</h4><p className="text-xs text-default-500">组内模型共享同一个计数器；每行填写一个模型ID，__default__ 表示未归组模型</p></div><Button size="sm" variant="flat" startContent={<Plus className="h-4 w-4" />} onPress={() => { const key = nextGroupKey(); updateGroups({ ...config.model_groups, [key]: { name: `模型分组 ${key}`, models: [] } }); }} isDisabled={disabled}>新增分组</Button></div>
      {Object.entries(config.model_groups).map(([key, group]) => <div key={key} className="space-y-3 rounded-lg border border-divider p-3"><div className="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)_auto]"><Input label="分组标识" value={key} isReadOnly description="供套餐规则引用" /><Input label="显示名称" value={group.name} onValueChange={(name) => updateGroups({ ...config.model_groups, [key]: { ...group, name } })} isDisabled={disabled} /><Button isIconOnly color="danger" variant="light" aria-label={`删除模型分组${key}`} onPress={() => { const nextGroups = { ...config.model_groups }; delete nextGroups[key]; const nextRules = Object.fromEntries(Object.entries(config.rules).map(([level, rule]) => { const limits = { ...rule.group_limits }; delete limits[key]; return [level, { ...rule, group_limits: limits }]; })); emit({ model_groups: nextGroups, rules: nextRules }); }} isDisabled={disabled}><Trash2 className="h-4 w-4" /></Button></div><Textarea label="组内模型" value={(group.models || []).join('\n')} onValueChange={(text) => updateGroups({ ...config.model_groups, [key]: { ...group, models: text.split(/[\n,，]+/).map((item) => item.trim()).filter(Boolean) } })} minRows={3} isDisabled={disabled} /></div>)}
      {Object.keys(config.model_groups).length === 0 && <p className="rounded-lg border border-dashed border-divider p-3 text-center text-sm text-default-500">当前未配置共享计数器的模型分组</p>}
    </section>

    <Divider />
    <section className="space-y-4"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><h4 className="font-medium">套餐等级限速</h4><p className="text-xs text-default-500">等级名称必须与套餐的 level 字段一致，default 是未匹配套餐的兜底</p></div><div className="flex gap-2"><Input aria-label="新套餐等级" placeholder="例如 Plus" value={newLevel} onValueChange={setNewLevel} list="bill-rule-levels" className="w-44" isDisabled={disabled} /><datalist id="bill-rule-levels">{packageLevels.filter((level) => !(level in config.rules)).map((level) => <option key={level} value={level} />)}</datalist><Button color="primary" variant="flat" startContent={<Plus className="h-4 w-4" />} onPress={addLevel} isDisabled={disabled || !newLevel.trim()}>添加等级</Button></div></div>
      {Object.entries(config.rules).map(([level, rule]) => <div key={level} className="space-y-3 rounded-lg border border-divider p-3"><div className="flex items-center justify-between"><div><p className="font-medium">{level === 'default' ? '兜底等级 (default)' : level}</p><p className="text-xs text-default-500">优先级：单模型 → 模型分组 → 默认限额</p></div>{level !== 'default' && <Button isIconOnly color="danger" variant="light" aria-label={`删除套餐等级${level}`} onPress={() => { const next = { ...config.rules }; delete next[level]; updateRules(next); }} isDisabled={disabled}><Trash2 className="h-4 w-4" /></Button>}</div>
        <LimitValueEditor label="默认请求次数" value={rule.default} onChange={(defaultLimit) => updateRules({ ...config.rules, [level]: { ...rule, default: defaultLimit } })} disabled={disabled} />
        <div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium">分组限额</p><Select aria-label={`${level}新增分组限额`} placeholder="选择模型分组" className="w-44" selectedKeys={[]} onSelectionChange={(keys) => { const groupKey = String(Array.from(keys)[0] || ''); if (groupKey) updateRules({ ...config.rules, [level]: { ...rule, group_limits: { ...rule.group_limits, [groupKey]: rule.default } } }); }} isDisabled={disabled || Object.keys(config.model_groups).every((key) => key in (rule.group_limits || {}))}>{Object.keys(config.model_groups).filter((key) => !(key in (rule.group_limits || {}))).map((key) => <SelectItem key={key}>{config.model_groups[key].name || key}</SelectItem>)}</Select></div>
          {Object.entries(rule.group_limits || {}).map(([groupKey, limit]) => <div key={groupKey} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><LimitValueEditor label={`${config.model_groups[groupKey]?.name || groupKey}请求次数`} value={limit} onChange={(nextLimit) => updateRules({ ...config.rules, [level]: { ...rule, group_limits: { ...rule.group_limits, [groupKey]: nextLimit } } })} disabled={disabled} /><Button isIconOnly color="danger" variant="light" aria-label={`删除${groupKey}分组限额`} onPress={() => { const next = { ...rule.group_limits }; delete next[groupKey]; updateRules({ ...config.rules, [level]: { ...rule, group_limits: next } }); }} isDisabled={disabled}><Trash2 className="h-4 w-4" /></Button></div>)}
        </div>
        <ModelLimitsEditor limits={rule.model_limits || {}} defaultLimit={rule.default} onChange={(model_limits) => updateRules({ ...config.rules, [level]: { ...rule, model_limits } })} disabled={disabled} />
      </div>)}
    </section>

    <Divider />
    <section className="space-y-3"><div><h4 className="font-medium">限速提示语</h4><p className="text-xs text-default-500">支持变量：{'{user_id}'} {'{group_name}'} {'{model}'} {'{max_requests}'} {'{window}'} {'{wait_time}'}</p></div>{Object.entries(MESSAGE_LABELS).map(([key, label]) => <Textarea key={key} label={label} value={config.messages[key] || ''} onValueChange={(text) => emit({ messages: { ...config.messages, [key]: text } })} minRows={2} isDisabled={disabled} />)}</section>
  </div>;
};

const ModelLimitsEditor: React.FC<{ limits: Record<string, string>; defaultLimit: string; onChange: (limits: Record<string, string>) => void; disabled?: boolean }> = ({ limits, defaultLimit, onChange, disabled }) => {
  const [model, setModel] = useState('');
  const add = () => { const key = model.trim(); if (!key || key in limits) return; onChange({ ...limits, [key]: defaultLimit }); setModel(''); };
  return <div className="space-y-2"><div className="flex items-end justify-between gap-2"><p className="text-sm font-medium">单模型限额</p><div className="flex gap-2"><Input aria-label="新增单模型限额的模型ID" placeholder="模型ID" value={model} onValueChange={setModel} className="w-52" isDisabled={disabled} /><Button size="sm" variant="flat" startContent={<Plus className="h-4 w-4" />} onPress={add} isDisabled={disabled || !model.trim()}>添加模型</Button></div></div>{Object.entries(limits).map(([modelId, limit]) => <div key={modelId} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><LimitValueEditor label={`${modelId}请求次数`} value={limit} onChange={(nextLimit) => onChange({ ...limits, [modelId]: nextLimit })} disabled={disabled} /><Button isIconOnly color="danger" variant="light" aria-label={`删除${modelId}单模型限额`} onPress={() => { const next = { ...limits }; delete next[modelId]; onChange(next); }} isDisabled={disabled}><Trash2 className="h-4 w-4" /></Button></div>)}</div>;
};
