import React, { useEffect, useRef, useState } from 'react';
import { Card, CardBody, Chip, Spinner, Button, Progress, Tooltip } from '@heroui/react';
import { Activity, AlertCircle, RefreshCw, Timer, Cpu, Info } from 'lucide-react';
import { LimitUsageData, LimitUsageItem } from '../../../services/userApi';
import { useLimitUsage } from '../../../hooks/useLimitUsage';

// 将剩余秒数格式化为「x时x分x秒」的简洁形式
const formatRemaining = (seconds: number): string => {
  if (seconds <= 0) return '即将重置';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (h) parts.push(`${h}时`);
  if (m) parts.push(`${m}分`);
  if (s || parts.length === 0) parts.push(`${s}秒`);
  return parts.join('');
};

// 根据使用比例返回进度条颜色
const ratioColor = (ratio: number): 'success' | 'warning' | 'danger' => {
  if (ratio >= 0.9) return 'danger';
  if (ratio >= 0.6) return 'warning';
  return 'success';
};

// 展示名称：default 作用域的「其他模型」改为更易懂的「各模型使用情况」
const displayName = (item: LimitUsageItem): string => {
  if (item.scope === 'default') return '各模型使用情况';
  return item.name;
};

interface UsageCardProps {
  item: LimitUsageItem;
  // 本地倒计时秒数（null 表示窗口未开始，无需重置）
  remaining: number | null;
}

const UsageCard: React.FC<UsageCardProps> = ({ item, remaining }) => {
  const hasLimit = item.limit > 0;
  const ratio = hasLimit ? Math.min(1, item.used / item.limit) : 0;
  const percent = Math.round(ratio * 100);

  return (
    <Card className="border border-default-200">
      <CardBody className="p-6 space-y-5">
        {/* 标题行：名称 + 窗口 */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-default-900 truncate">{displayName(item)}</h3>
            <p className="text-xs text-default-400 mt-1">每 {item.window} 配额 · {item.mode_label}</p>
          </div>
          <Chip size="sm" variant="flat" color={ratioColor(ratio)}>
            {hasLimit ? `已用 ${percent}%` : '不可用'}
          </Chip>
        </div>

        {/* 使用比例进度条 */}
        <div className="space-y-2">
          <Progress
            aria-label="使用比例"
            value={percent}
            color={ratioColor(ratio)}
            size="md"
            className="max-w-full"
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-default-500">
              已用 <span className="font-semibold text-default-800">{item.used}</span>
              {hasLimit && <span className="text-default-400"> / {item.limit}</span>}
            </span>
            {hasLimit && (
              <span className="text-default-500">
                剩余 <span className="font-semibold text-default-800">{Math.max(0, item.limit - item.used)}</span>
              </span>
            )}
          </div>
        </div>

        {/* 重置剩余时间 */}
        <div className="flex items-center gap-2 text-sm text-default-600 pt-1 border-t border-default-100">
          <Timer size={16} className="text-default-400 flex-shrink-0" />
          <span>
            重置剩余：
            <span className="font-medium text-default-800">
              {remaining != null ? formatRemaining(remaining) : '暂未开始计时'}
            </span>
          </span>
        </div>

        {/* 涉及模型 / 消耗权重 */}
        {item.models.length > 0 && (
          <div className="flex items-start gap-2">
            <Cpu size={16} className="text-default-400 flex-shrink-0 mt-1" />
            <div className="flex flex-wrap gap-1.5">
              {item.models.map((model) => {
                const cost = item.model_costs?.[model];
                return (
                  <Tooltip
                    key={model}
                    content={cost && cost > 1 ? `每次消耗 ${cost} 点配额` : '每次消耗 1 点配额'}
                    size="sm"
                  >
                    <Chip size="sm" variant="flat" color={cost && cost > 1 ? 'warning' : 'default'}>
                      {model}
                      {cost && cost > 1 ? ` ×${cost}` : ''}
                    </Chip>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

/**
 * 使用额度区块（可嵌入到个人主页等页面）
 * 展示当前窗口的使用比例、重置剩余时间、涉及模型/消耗权重，以及可配置的消耗规则说明。
 * 可传入外部 usage 数据避免重复请求；不传则自行拉取。
 */
interface UsageSectionProps {
  usage?: LimitUsageData | null;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
}

export const UsageSection: React.FC<UsageSectionProps> = (props) => {
  const injected = props.usage !== undefined;
  const own = useLimitUsage(!injected);
  // 若外部注入了数据则复用，否则使用自身 Hook 拉取
  const data = injected ? props.usage ?? null : own.data;
  const loading = injected ? Boolean(props.loading) : own.loading;
  const error = injected ? (props.error || '') : own.error;
  const fetchUsage = injected ? (props.onRefresh || (() => {})) : own.refetch;

  // 本地维护每个限速项的剩余秒数，做平滑倒计时
  const [remainings, setRemainings] = useState<Record<number, number | null>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 数据返回后初始化倒计时基准
  useEffect(() => {
    if (!data) return;
    const init: Record<number, number | null> = {};
    (data.limits || []).forEach((item, idx) => {
      init[idx] = item.reset_in_seconds ?? null;
    });
    setRemainings(init);
  }, [data]);

  // 本地倒计时：每秒递减，归零后不再继续
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemainings((prev) => {
        const next: Record<number, number | null> = {};
        let changed = false;
        Object.entries(prev).forEach(([k, v]) => {
          const key = Number(k);
          if (v != null && v > 0) {
            next[key] = v - 1;
            changed = true;
          } else {
            next[key] = v;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* 区块标题 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          <h2 className="text-lg font-bold text-default-900">使用额度</h2>
        </div>
        <Button
          size="sm"
          variant="light"
          color="primary"
          startContent={<RefreshCw size={14} />}
          onPress={fetchUsage}
          isLoading={loading}
        >
          刷新
        </Button>
      </div>

      {loading && (
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-center py-10">
              <Spinner size="lg" color="primary" />
              <span className="ml-3 text-default-600">加载中...</span>
            </div>
          </CardBody>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <CardBody className="p-6">
            <div className="flex items-start gap-4 p-4 bg-danger/10 rounded-lg">
              <AlertCircle size={20} className="text-danger flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-danger mb-2">加载失败</h3>
                <p className="text-default-600 text-sm">{error}</p>
                <Button size="sm" color="primary" className="mt-3" onPress={fetchUsage}>
                  重试
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {!loading && !error && data && (
        <>
          {data.limits.length === 0 ? (
            <Card>
              <CardBody className="p-8 text-center text-default-500">
                当前套餐暂无额度限制信息
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-4">
              {data.limits.map((item, idx) => (
                <UsageCard key={`${item.scope}-${item.name}-${idx}`} item={item} remaining={remainings[idx]} />
              ))}
            </div>
          )}

          {/* 可配置的消耗规则说明 */}
          {data.usage_note && (
            <Card className="border border-primary/20 bg-primary/5">
              <CardBody className="p-4">
                <div className="flex items-start gap-3">
                  <Info size={18} className="text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-default-700 leading-6 whitespace-pre-wrap break-words">
                    {data.usage_note}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default UsageSection;
