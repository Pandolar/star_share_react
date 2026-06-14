import { useCallback, useEffect, useState } from 'react';
import { limitUsageApi, LimitUsageData } from '../services/userApi';

/**
 * 拉取当前用户额度使用详情的共享 Hook。
 * 供个人主页的套餐卡片（展示配额规则）和使用额度区块复用，避免重复请求。
 */
export function useLimitUsage(enabled: boolean = true) {
  const [data, setData] = useState<LimitUsageData | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const resp = await limitUsageApi.getUsage();
      if (resp.code === 20000) {
        setData(resp.data);
      } else {
        setError(resp.msg || '获取使用额度失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) fetchUsage();
  }, [enabled, fetchUsage]);

  return { data, loading, error, refetch: fetchUsage };
}

/**
 * 将额度详情归纳为一句套餐配额规则描述，例如「Plus 套餐 · 每 3小时 40 次」。
 * 取窗口配额最大的限速项作为主规则；无可用额度时返回 null。
 */
export function summarizeQuotaRule(data: LimitUsageData | null): string | null {
  if (!data || !data.limits || data.limits.length === 0) return null;
  const usable = data.limits.filter((it) => it.limit > 0);
  if (usable.length === 0) return null;
  // 取上限最大的项作为该套餐的主配额规则
  const main = usable.reduce((a, b) => (b.limit > a.limit ? b : a));
  const level = data.package_level && data.package_level !== 'default' ? data.package_level : '';
  const prefix = level ? `${level} 套餐 · ` : '';
  return `${prefix}每 ${main.window} ${main.limit} 次`;
}
