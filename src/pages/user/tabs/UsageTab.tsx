import React, { useEffect, useRef, useState } from 'react';
import { Card, CardBody, Chip, Spinner, Button, Progress, Tooltip } from '@heroui/react';
import { motion } from 'framer-motion';
import { Activity, AlertCircle, RefreshCw, Timer, Cpu } from 'lucide-react';
import { limitUsageApi, LimitUsageData, LimitUsageItem } from '../../../services/userApi';

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
      <CardBody className="p-5 space-y-4">
        {/* 标题行：名称 + 窗口 */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-default-900 truncate">{item.name}</h3>
            <p className="text-xs text-default-400 mt-0.5">每 {item.window} 配额</p>
          </div>
          <Chip size="sm" variant="flat" color={ratioColor(ratio)}>
            {hasLimit ? `${percent}%` : '不可用'}
          </Chip>
        </div>

        {/* 使用比例进度条 */}
        <div className="space-y-1.5">
          <Progress
            aria-label="使用比例"
            value={percent}
            color={ratioColor(ratio)}
            size="sm"
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
        <div className="flex items-center gap-2 text-sm text-default-600">
          <Timer size={15} className="text-default-400 flex-shrink-0" />
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
            <Cpu size={15} className="text-default-400 flex-shrink-0 mt-1" />
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

export const UsageTab: React.FC = () => {
  const [data, setData] = useState<LimitUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // 本地维护每个限速项的剩余秒数，做平滑倒计时
  const [remainings, setRemainings] = useState<Record<number, number | null>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      setError('');
      const resp = await limitUsageApi.getUsage();
      if (resp.code === 20000) {
        setData(resp.data);
        const init: Record<number, number | null> = {};
        (resp.data.limits || []).forEach((item, idx) => {
          init[idx] = item.reset_in_seconds ?? null;
        });
        setRemainings(init);
      } else {
        setError(resp.msg || '获取使用额度失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Activity size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-default-900">使用额度</h1>
            <p className="text-sm text-default-500 mt-1">查看当前窗口的额度使用情况与重置时间</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="flat"
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
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" color="primary" />
              <span className="ml-3 text-default-600">加载中...</span>
            </div>
          </CardBody>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <CardBody className="p-6">
            <div className="flex items-start gap-4 p-6 bg-danger/10 rounded-lg">
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
              <CardBody className="p-10 text-center text-default-500">
                当前套餐暂无额度限制信息
              </CardBody>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.limits.map((item, idx) => (
                <UsageCard key={`${item.scope}-${item.name}-${idx}`} item={item} remaining={remainings[idx]} />
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default UsageTab;
