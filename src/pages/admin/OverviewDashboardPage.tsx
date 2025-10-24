import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardHeader, Chip, Spinner } from '@heroui/react';
import { BarChart3, Users, ShoppingCart, DollarSign, Activity, Package, Gift } from 'lucide-react';
import dayjs from 'dayjs';
import adminApiService from '../../services/adminApi';
import { DashboardData } from '../../types/admin';

type Point = { label: string; value: number };

const currency = (v: number | undefined) => `¥${(v || 0).toFixed(2)}`;
const percent = (v: number | undefined) => `${Math.round(((v || 0) * 1000)) / 10}%`;

const LineChart: React.FC<{ data: Point[]; height?: number; color?: string; xLabelEvery?: number }>
  = ({ data, height = 180, color = '#006FEE', xLabelEvery = 5 }) => {
  const padding = 28;
  const width = Math.max(600, padding * 2 + Math.max(0, data.length - 1) * 24);
  const max = Math.max(1, ...data.map(d => d.value));
  const stepX = (width - padding * 2) / Math.max(1, data.length - 1);
  const points = data.map((d, i) => {
    const x = padding + i * stepX;
    const y = height - padding - (d.value / max) * (height - padding * 2);
    return { x, y };
  });
  const poly = points.map(p => `${p.x},${p.y}`).join(' ');
  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height}>
        <g>
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" />
          {/* grid lines */}
          {[0.25, 0.5, 0.75].map((t) => (
            <line key={t} x1={padding} x2={width - padding} y1={padding + (height - padding * 2) * t} y2={padding + (height - padding * 2) * t} stroke="#f1f5f9" />
          ))}
          <polyline fill="none" stroke={color} strokeWidth={2} points={poly} />
          {points.map((p, i) => (<circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />))}
          {data.map((d, i) => (i % xLabelEvery === 0) && (
            <text key={i} x={padding + i * stepX} y={height - padding + 14} fontSize={10} fill="#6b7280">
              {d.label}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
};

const HBarList: React.FC<{ data: Array<{ name: string; value: number }>; color?: string }>
  = ({ data, color = '#22c55e' }) => {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span className="truncate mr-2" title={d.name}>{d.name}</span>
            <span>{d.value}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded">
            <div className="h-2 rounded" style={{ width: `${(d.value / max) * 100}%`, backgroundColor: color }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const KPICard: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string }>
  = ({ icon, label, value, sub }) => (
  <Card className="card-hover">
    <CardBody>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-primary-50 text-primary">
          {icon}
        </div>
        <div>
          <div className="text-sm text-gray-500">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
          {sub && (<div className="text-xs text-gray-500 mt-0.5">{sub}</div>)}
        </div>
      </div>
    </CardBody>
  </Card>
);

const OverviewDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await adminApiService.getDashboard();
        if (res.code === 20000) setData(res.data || null);
        else setData(null);
      } catch (_) {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const users30d: Point[] = useMemo(() =>
    (data?.users?.timeseries_30d_daily || []).map((d) => ({ label: dayjs(d.date).format('MM-DD'), value: d.count || 0 })),
    [data]
  );
  const orders30d: Point[] = useMemo(() =>
    (data?.orders?.by_day_30d || []).map((d) => ({ label: dayjs(d.date).format('MM-DD'), value: d.count || 0 })),
    [data]
  );
  const revenue30d: Point[] = useMemo(() =>
    (data?.revenue?.by_day_30d || []).map((d) => ({ label: dayjs(d.date).format('MM-DD'), value: Number(d.amount || 0) })),
    [data]
  );

  const topSales = useMemo(() => (data?.packages?.top_by_sales || []).slice(0, 8)
    .map(i => ({ name: `${i.package_name} (#${i.package_id})`, value: i.count })), [data]);
  const topRevenue = useMemo(() => (data?.packages?.top_by_revenue || []).slice(0, 8)
    .map(i => ({ name: `${i.package_name} (#${i.package_id})`, value: Number(i.amount || 0) })), [data]);

  const ways = data?.packages?.ways || {};
  const waysTotal = (ways.purchase || 0) + (ways.exchange || 0) + (ways.other || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">系统总览</h1>
        </div>
        {data?.meta?.generated_at && (
          <Chip size="sm" variant="flat" color="default">更新于 {dayjs(data.meta.generated_at).format('YYYY-MM-DD HH:mm')}</Chip>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={<Users className="w-5 h-5" />} label="用户总数" value={`${data?.users?.total ?? 0}`} sub={`活跃 ${data?.users?.active ?? 0} · 禁用 ${data?.users?.disabled ?? 0}`} />
        <KPICard icon={<ShoppingCart className="w-5 h-5" />} label="近7天支付订单" value={`${data?.orders?.paid_7d ?? 0}`} sub={`今日 ${data?.orders?.paid_today ?? 0} · 昨日 ${data?.orders?.paid_yesterday ?? 0}`} />
        <KPICard icon={<DollarSign className="w-5 h-5" />} label="今日收入" value={currency(data?.revenue?.today)} sub={`7天 ${currency(data?.revenue?.last_7d)} · 30天 ${currency(data?.revenue?.last_30d)}`} />
        <KPICard icon={<Activity className="w-5 h-5" />} label="转化率" value={percent(data?.revenue?.conversion_rate)} sub={`付费用户数 ${data?.revenue?.paid_user_count ?? 0} · ARPU ${currency(data?.revenue?.arpu || 0)} · ARPPU ${currency(data?.revenue?.arppu || 0)}`} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Users className="w-4 h-4" /><span className="font-medium">近30天新增用户</span>{loading && <Spinner size="sm" />}</div>
          </CardHeader>
          <CardBody>{loading ? <div className="flex items-center justify-center min-h-[180px]"><Spinner label="加载中..." /></div> : <LineChart data={users30d} color="#3b82f6" />}</CardBody>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><ShoppingCart className="w-4 h-4" /><span className="font-medium">近30天支付订单</span>{loading && <Spinner size="sm" />}</div>
          </CardHeader>
          <CardBody>{loading ? <div className="flex items-center justify-center min-h-[180px]"><Spinner label="加载中..." /></div> : <LineChart data={orders30d} color="#f59e0b" />}</CardBody>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><DollarSign className="w-4 h-4" /><span className="font-medium">近30天收入</span>{loading && <Spinner size="sm" />}</div>
          </CardHeader>
          <CardBody>{loading ? <div className="flex items-center justify-center min-h-[180px]"><Spinner label="加载中..." /></div> : <LineChart data={revenue30d} color="#10b981" />}</CardBody>
        </Card>
      </div>

      {/* Packages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Package className="w-4 h-4" /><span className="font-medium">热销套餐（按销量）</span></div>
          </CardHeader>
          <CardBody>
            {topSales.length === 0 ? <div className="text-sm text-gray-500">暂无数据</div> : <HBarList data={topSales} color="#6366f1" />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><DollarSign className="w-4 h-4" /><span className="font-medium">热销套餐（按收入）</span></div>
          </CardHeader>
          <CardBody>
            {topRevenue.length === 0 ? <div className="text-sm text-gray-500">暂无数据</div> : <HBarList data={topRevenue} color="#10b981" />}
          </CardBody>
        </Card>
      </div>

      {/* Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Package className="w-4 h-4" /><span className="font-medium">套餐状态概览</span></div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded bg-success-50 text-success">
                <div className="text-xs">有效</div>
                <div className="text-lg font-semibold">{data?.packages?.active_count ?? 0}</div>
              </div>
              <div className="p-3 rounded bg-warning-50 text-warning">
                <div className="text-xs">冻结</div>
                <div className="text-lg font-semibold">{data?.packages?.frozen_count ?? 0}</div>
              </div>
              <div className="p-3 rounded bg-danger-50 text-danger">
                <div className="text-xs">过期</div>
                <div className="text-lg font-semibold">{data?.packages?.expired_count ?? 0}</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">近似获取来源（共 {waysTotal}）</div>
            <div className="mt-2 space-y-2">
              {['purchase','exchange','other'].map((k) => {
                const map: any = { purchase: '购买', exchange: '兑换', other: '其他' };
                const v = (ways as any)[k] || 0;
                const p = waysTotal ? Math.round((v / waysTotal) * 100) : 0;
                return (
                  <div key={k} className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600"><span>{map[k]}</span><span>{v}（{p}%）</span></div>
                    <div className="h-2 bg-gray-100 rounded"><div className="h-2 bg-blue-500 rounded" style={{ width: `${p}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Gift className="w-4 h-4" /><span className="font-medium">CDK 使用情况</span></div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded bg-primary-50 text-primary">
                <div className="text-xs">未使用</div>
                <div className="text-lg font-semibold">{data?.cdk?.unused ?? 0}</div>
              </div>
              <div className="p-3 rounded bg-success-50 text-success">
                <div className="text-xs">已使用</div>
                <div className="text-lg font-semibold">{data?.cdk?.used ?? 0}</div>
              </div>
              <div className="p-3 rounded bg-danger-50 text-danger">
                <div className="text-xs">已停用</div>
                <div className="text-lg font-semibold">{data?.cdk?.disabled ?? 0}</div>
              </div>
              <div className="p-3 rounded bg-gray-100 text-gray-600">
                <div className="text-xs">今日使用 / 7天</div>
                <div className="text-lg font-semibold">{data?.cdk?.used_today ?? 0} / {data?.cdk?.used_7d ?? 0}</div>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Activity className="w-4 h-4" /><span className="font-medium">收入概要</span></div>
          </CardHeader>
          <CardBody>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>累计收入</span><span className="font-medium">{currency(data?.revenue?.total)}</span></div>
              <div className="flex justify-between"><span>今日</span><span className="font-medium">{currency(data?.revenue?.today)}</span></div>
              <div className="flex justify-between"><span>昨日</span><span className="font-medium">{currency(data?.revenue?.yesterday)}</span></div>
              <div className="flex justify-between"><span>7天</span><span className="font-medium">{currency(data?.revenue?.last_7d)}</span></div>
              <div className="flex justify-between"><span>30天</span><span className="font-medium">{currency(data?.revenue?.last_30d)}</span></div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default OverviewDashboardPage;
