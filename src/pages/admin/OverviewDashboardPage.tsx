import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Progress,
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
import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  Gift,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  ShoppingCart,
  Target,
  UserPlus,
  Users,
} from 'lucide-react';
import dayjs from 'dayjs';
import adminApiService from '../../services/adminApi';
import {
  DashboardData,
  DashboardQueryParams,
  DashboardSummary,
  DashboardTrendPoint,
} from '../../types/admin';
import { showToast } from '../../components/Toast';

type MetricKey = keyof Pick<DashboardTrendPoint,
  'new_users' | 'paid_orders' | 'revenue' | 'paid_users' | 'first_paid_users' |
  'package_grants' | 'cdk_redemptions' | 'average_order_value'>;

type ChartMetric = {
  key: MetricKey;
  label: string;
  shortLabel: string;
  color: string;
  format: 'integer' | 'currency';
};

const CHART_METRICS: ChartMetric[] = [
  { key: 'revenue', label: '现金收入', shortLabel: '收入', color: '#17c964', format: 'currency' },
  { key: 'paid_orders', label: '支付订单', shortLabel: '订单', color: '#f5a524', format: 'integer' },
  { key: 'new_users', label: '新增用户', shortLabel: '新增', color: '#006fee', format: 'integer' },
  { key: 'paid_users', label: '付费用户', shortLabel: '付费用户', color: '#9353d3', format: 'integer' },
  { key: 'first_paid_users', label: '首次付费用户', shortLabel: '首购', color: '#f31260', format: 'integer' },
  { key: 'package_grants', label: '套餐发放', shortLabel: '套餐', color: '#7828c8', format: 'integer' },
  { key: 'cdk_redemptions', label: 'CDK兑换', shortLabel: '兑换', color: '#0072f5', format: 'integer' },
  { key: 'average_order_value', label: '客单价', shortLabel: '客单价', color: '#06b6d4', format: 'currency' },
];

const SUMMARY_METRICS: Array<{
  key: keyof DashboardSummary;
  label: string;
  icon: React.ReactNode;
  format: 'integer' | 'currency' | 'percent';
  description: string;
}> = [
  { key: 'revenue', label: '现金收入', icon: <CircleDollarSign className="h-5 w-5" />, format: 'currency', description: '排除CDK兑换等非现金订单' },
  { key: 'paid_orders', label: '支付订单', icon: <ShoppingCart className="h-5 w-5" />, format: 'integer', description: '筛选周期内成功现金支付' },
  { key: 'new_users', label: '新增用户', icon: <UserPlus className="h-5 w-5" />, format: 'integer', description: '筛选周期内注册用户' },
  { key: 'paid_users', label: '付费用户', icon: <Users className="h-5 w-5" />, format: 'integer', description: '成功现金支付去重用户' },
  { key: 'first_paid_users', label: '首次付费用户', icon: <Target className="h-5 w-5" />, format: 'integer', description: '首次现金支付发生在周期内' },
  { key: 'average_order_value', label: '客单价', icon: <BadgeDollarSign className="h-5 w-5" />, format: 'currency', description: '现金收入 / 支付订单' },
  { key: 'payment_success_rate', label: '支付成功率', icon: <CreditCard className="h-5 w-5" />, format: 'percent', description: '成功订单 / 周期内创建订单' },
  { key: 'new_user_paid_conversion', label: '新增付费转化', icon: <Activity className="h-5 w-5" />, format: 'percent', description: '周期新增用户中截至期末已付费比例' },
  { key: 'arppu', label: '付费用户贡献', icon: <CircleDollarSign className="h-5 w-5" />, format: 'currency', description: '现金收入 / 付费用户' },
  { key: 'repeat_purchase_rate', label: '复购用户率', icon: <RotateCcw className="h-5 w-5" />, format: 'percent', description: '周期内支付两次及以上用户占比' },
  { key: 'package_grants', label: '套餐发放', icon: <PackageCheck className="h-5 w-5" />, format: 'integer', description: '购买、兑换与其他来源合计' },
  { key: 'cdk_redemptions', label: 'CDK兑换', icon: <Gift className="h-5 w-5" />, format: 'integer', description: '周期内成功兑换数量' },
];

const currency = (value: number | undefined) => `¥${Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const integer = (value: number | undefined) => Number(value || 0).toLocaleString('zh-CN');
const percent = (value: number | undefined) => `${(Number(value || 0) * 100).toFixed(1)}%`;

const formatMetric = (value: number | undefined, format: 'integer' | 'currency' | 'percent') => {
  if (format === 'currency') return currency(value);
  if (format === 'percent') return percent(value);
  return integer(value);
};

const compareChange = (current: number, previous: number) => {
  if (!previous) return current ? { label: '上期为 0', tone: 'text-primary' } : { label: '与上期持平', tone: 'text-default-400' };
  const rate = (current - previous) / Math.abs(previous);
  const prefix = rate > 0 ? '+' : '';
  return {
    label: `较上期 ${prefix}${(rate * 100).toFixed(1)}%`,
    tone: rate > 0 ? 'text-success' : rate < 0 ? 'text-danger' : 'text-default-400',
  };
};

const TrendChart: React.FC<{
  data: DashboardTrendPoint[];
  metric: ChartMetric;
  granularity: 'hour' | 'day';
}> = ({ data, metric, granularity }) => {
  const width = Math.max(760, data.length * (granularity === 'hour' ? 38 : 54));
  const height = 320;
  const margins = { top: 22, right: 26, bottom: 56, left: 74 };
  const innerWidth = width - margins.left - margins.right;
  const innerHeight = height - margins.top - margins.bottom;
  const values = data.map((point) => Number(point[metric.key] || 0));
  const rawMax = Math.max(0, ...values);
  const axisMax = rawMax <= 0 ? 1 : rawMax * 1.12;
  const ticks = Array.from({ length: 5 }, (_, index) => axisMax * (4 - index) / 4);
  const stepX = innerWidth / Math.max(1, data.length - 1);
  const points = data.map((point, index) => ({
    x: margins.left + index * stepX,
    y: margins.top + innerHeight - (Number(point[metric.key] || 0) / axisMax) * innerHeight,
    value: Number(point[metric.key] || 0),
    bucket: point.bucket,
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const labelEvery = Math.max(1, Math.ceil(data.length / 10));
  const axisValue = (value: number) => metric.format === 'currency'
    ? `¥${value >= 10000 ? `${(value / 10000).toFixed(1)}万` : Math.round(value).toLocaleString('zh-CN')}`
    : Math.round(value).toLocaleString('zh-CN');
  const tooltipValue = (value: number) => metric.format === 'currency' ? currency(value) : integer(value);

  if (!data.length) return <div className="flex h-72 items-center justify-center text-sm text-default-400">当前筛选暂无趋势数据</div>;

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} role="img" aria-label={`${metric.label}趋势图`}>
        <defs>
          <linearGradient id={`fill-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={metric.color} stopOpacity="0.24" />
            <stop offset="100%" stopColor={metric.color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((tick, index) => {
          const y = margins.top + index * innerHeight / 4;
          return (
            <g key={index}>
              <line x1={margins.left} x2={width - margins.right} y1={y} y2={y} stroke="#e4e4e7" strokeDasharray="4 4" />
              <text x={margins.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#71717a">{axisValue(tick)}</text>
            </g>
          );
        })}
        <line x1={margins.left} x2={margins.left} y1={margins.top} y2={height - margins.bottom} stroke="#a1a1aa" />
        <line x1={margins.left} x2={width - margins.right} y1={height - margins.bottom} y2={height - margins.bottom} stroke="#a1a1aa" />
        <polygon
          points={`${margins.left},${height - margins.bottom} ${line} ${width - margins.right},${height - margins.bottom}`}
          fill={`url(#fill-${metric.key})`}
        />
        <polyline points={line} fill="none" stroke={metric.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point, index) => (
          <g key={`${point.bucket}-${index}`}>
            <circle cx={point.x} cy={point.y} r="4" fill="white" stroke={metric.color} strokeWidth="2">
              <title>{`${point.bucket} · ${metric.label} ${tooltipValue(point.value)}`}</title>
            </circle>
            {(index % labelEvery === 0 || index === points.length - 1) && (
              <text x={point.x} y={height - margins.bottom + 22} textAnchor="middle" fontSize="10" fill="#71717a">
                {dayjs(point.bucket).format(granularity === 'hour' ? 'MM-DD HH:mm' : 'MM-DD')}
              </text>
            )}
          </g>
        ))}
        <text x={18} y={margins.top + innerHeight / 2} textAnchor="middle" fontSize="11" fill="#52525b" transform={`rotate(-90 18 ${margins.top + innerHeight / 2})`}>
          {metric.label}{metric.format === 'currency' ? '（元）' : '（个）'}
        </text>
        <text x={margins.left + innerWidth / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="#52525b">
          时间（Asia/Shanghai）
        </text>
      </svg>
    </div>
  );
};

const DistributionCard: React.FC<{
  title: string;
  data: Array<{ key: string; label: string; count: number }>;
  color: 'primary' | 'secondary' | 'success' | 'warning';
}> = ({ title, data, color }) => {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  return (
    <Card shadow="sm">
      <CardHeader><span className="font-semibold">{title}</span></CardHeader>
      <CardBody className="space-y-3 pt-0">
        {data.map((item) => {
          const ratio = total ? item.count / total * 100 : 0;
          return (
            <div key={item.key} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>{item.label}</span>
                <span className="font-medium">{integer(item.count)} <span className="text-xs font-normal text-default-400">{ratio.toFixed(1)}%</span></span>
              </div>
              <Progress aria-label={`${item.label}占比`} value={ratio} color={color} size="sm" />
            </div>
          );
        })}
        {!total && <p className="text-sm text-default-400">当前筛选暂无数据</p>}
      </CardBody>
    </Card>
  );
};

const OverviewDashboardPage: React.FC = () => {
  const today = dayjs();
  const defaultStart = today.subtract(29, 'day').format('YYYY-MM-DD');
  const defaultEnd = today.format('YYYY-MM-DD');
  const [filters, setFilters] = useState<DashboardQueryParams>({
    start_date: defaultStart,
    end_date: defaultEnd,
    granularity: 'auto',
    user_status: 'all',
  });
  const [appliedFilters, setAppliedFilters] = useState<DashboardQueryParams>(filters);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [metricKey, setMetricKey] = useState<MetricKey>('revenue');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApiService.getDashboard(appliedFilters);
      if (response.code !== 20000 || !response.data) throw new Error(response.msg || '获取运营总览失败');
      setData(response.data);
    } catch (error: any) {
      setData(null);
      showToast(error.response?.data?.msg || error.message || '获取运营总览失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const activeMetric = CHART_METRICS.find((metric) => metric.key === metricKey) || CHART_METRICS[0];
  const periodLabel = data ? `${data.period.start_date} 至 ${data.period.end_date}` : `${appliedFilters.start_date} 至 ${appliedFilters.end_date}`;
  const previousLabel = data ? `${data.period.previous_start_date} 至 ${data.period.previous_end_date}` : '-';

  const applyFilters = () => {
    const start = dayjs(filters.start_date);
    const end = dayjs(filters.end_date);
    if (!start.isValid() || !end.isValid()) {
      showToast('请选择有效的开始和结束日期', 'warning');
      return;
    }
    if (start.isAfter(end)) {
      showToast('开始日期不能晚于结束日期', 'warning');
      return;
    }
    const days = end.diff(start, 'day') + 1;
    if (days > 366) {
      showToast('单次统计范围不能超过366天', 'warning');
      return;
    }
    if (filters.granularity === 'hour' && days > 14) {
      showToast('按小时统计最多选择14天', 'warning');
      return;
    }
    setAppliedFilters({ ...filters });
  };

  const setPreset = (days: number) => {
    const next = {
      ...filters,
      start_date: today.subtract(days - 1, 'day').format('YYYY-MM-DD'),
      end_date: defaultEnd,
      granularity: days === 1 ? 'hour' as const : 'day' as const,
    };
    setFilters(next);
    setAppliedFilters(next);
  };

  const resetFilters = () => {
    const next: DashboardQueryParams = {
      start_date: defaultStart,
      end_date: defaultEnd,
      granularity: 'auto',
      user_status: 'all',
    };
    setFilters(next);
    setAppliedFilters(next);
  };

  const inventoryItems = useMemo(() => data ? [
    { label: '总用户', value: data.inventory.total_users, detail: `正常 ${integer(data.inventory.active_users)} · 禁用 ${integer(data.inventory.disabled_users)}` },
    { label: '有效套餐用户', value: data.inventory.active_package_users, detail: `有效记录 ${integer(data.inventory.active_package_records)}` },
    { label: '冻结套餐记录', value: data.inventory.frozen_package_records, detail: '需关注即将恢复或人工处理' },
    { label: '待支付订单', value: data.inventory.pending_orders, detail: '当前未完成现金订单' },
    { label: '未使用 CDK', value: data.inventory.unused_cdks, detail: `停用 ${integer(data.inventory.disabled_cdks)}` },
    { label: '在售套餐', value: data.inventory.packages_on_sale, detail: '当前可购买套餐' },
  ] : [], [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-default-800">运营数据中心</h1>
            <p className="text-sm text-default-500">从拉新、付费、套餐和CDK多个维度筛选并对比经营表现</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data?.meta.generated_at && <Chip variant="flat">更新于 {dayjs(data.meta.generated_at).format('MM-DD HH:mm:ss')}</Chip>}
          <Button variant="flat" startContent={<RefreshCw className="h-4 w-4" />} isLoading={loading} onPress={loadDashboard}>刷新</Button>
        </div>
      </div>

      <Card shadow="sm">
        <CardHeader className="flex-col items-start gap-1 pb-2">
          <div className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4" />运营筛选器</div>
          <p className="text-xs text-default-500">默认展示最近30天；支持最长366天，小时粒度最多14天。</p>
        </CardHeader>
        <CardBody className="gap-4 pt-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="flat" onPress={() => setPreset(1)}>今天</Button>
            <Button size="sm" variant="flat" onPress={() => setPreset(7)}>近7天</Button>
            <Button size="sm" variant="flat" onPress={() => setPreset(30)}>近30天</Button>
            <Button size="sm" variant="flat" onPress={() => setPreset(90)}>近90天</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_11rem_12rem_minmax(16rem,1.5fr)_auto]">
            <Input type="date" label="开始日期" labelPlacement="outside" value={filters.start_date || ''} onValueChange={(value) => setFilters((current) => ({ ...current, start_date: value }))} />
            <Input type="date" label="结束日期" labelPlacement="outside" value={filters.end_date || ''} onValueChange={(value) => setFilters((current) => ({ ...current, end_date: value }))} />
            <Select label="时间粒度" labelPlacement="outside" selectedKeys={[filters.granularity || 'auto']} onSelectionChange={(keys) => setFilters((current) => ({ ...current, granularity: String(Array.from(keys)[0] || 'auto') as DashboardQueryParams['granularity'] }))}>
              <SelectItem key="auto">自动</SelectItem>
              <SelectItem key="hour">按小时</SelectItem>
              <SelectItem key="day">按天</SelectItem>
            </Select>
            <Select label="新增用户状态" labelPlacement="outside" selectedKeys={[filters.user_status || 'all']} onSelectionChange={(keys) => setFilters((current) => ({ ...current, user_status: String(Array.from(keys)[0] || 'all') as DashboardQueryParams['user_status'] }))}>
              <SelectItem key="all">全部用户</SelectItem>
              <SelectItem key="active">仅正常账号</SelectItem>
              <SelectItem key="disabled">仅禁用账号</SelectItem>
            </Select>
            <Select
              label="套餐范围"
              labelPlacement="outside"
              selectedKeys={[filters.package_id ? String(filters.package_id) : 'all']}
              onSelectionChange={(keys) => {
                const selected = String(Array.from(keys)[0] || 'all');
                setFilters((current) => ({ ...current, package_id: selected === 'all' ? undefined : Number(selected) }));
              }}
            >
              {[<SelectItem key="all">全部套餐</SelectItem>, ...(data?.package_options || []).map((item) => (
                <SelectItem key={String(item.id)} textValue={`${item.package_name} ${item.category} ${item.level}`}>
                  {item.package_name} · {item.category}/{item.level}{item.status === 0 ? '（已下架）' : ''}
                </SelectItem>
              ))]}
            </Select>
            <div className="flex items-end gap-2">
              <Button color="primary" onPress={applyFilters}>应用</Button>
              <Tooltip content="恢复最近30天默认筛选"><Button isIconOnly variant="flat" aria-label="重置运营筛选" onPress={resetFilters}><RotateCcw className="h-4 w-4" /></Button></Tooltip>
            </div>
          </div>
          {data?.period.package_id && <Alert color="primary" variant="flat" title="套餐筛选说明" description={data.meta.package_filter_note} />}
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">本期：{periodLabel}</p>
          <p className="text-xs text-default-500">自动对比上期：{previousLabel}</p>
        </div>
        <Chip color="primary" variant="flat">{data?.period.granularity === 'hour' ? '小时粒度' : '日粒度'}</Chip>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SUMMARY_METRICS.map((metric) => {
          const current = Number(data?.summary[metric.key] || 0);
          const previous = Number(data?.previous_summary[metric.key] || 0);
          const change = compareChange(current, previous);
          return (
            <Card key={metric.key} shadow="sm">
              <CardBody className="gap-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary">{metric.icon}</span>
                  <Chip size="sm" variant="flat" className={change.tone}>{change.label}</Chip>
                </div>
                <div>
                  <p className="text-sm text-default-500">{metric.label}</p>
                  <p className="text-2xl font-bold text-default-900">{formatMetric(current, metric.format)}</p>
                  <p className="mt-1 text-xs text-default-400">{metric.description}</p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card shadow="sm">
        <CardHeader className="flex-col items-start gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-semibold">运营趋势</p>
            <p className="text-xs text-default-500">横轴为时间，纵轴随指标显示数量或金额；鼠标悬停数据点查看精确值。</p>
          </div>
          <div className="flex max-w-full gap-1 overflow-x-auto pb-1">
            {CHART_METRICS.map((metric) => (
              <Button key={metric.key} size="sm" color={metricKey === metric.key ? 'primary' : 'default'} variant={metricKey === metric.key ? 'solid' : 'flat'} onPress={() => setMetricKey(metric.key)}>
                {metric.shortLabel}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          {loading && !data ? <div className="flex h-80 items-center justify-center"><Spinner label="加载运营数据中..." /></div> : (
            <TrendChart data={data?.trend || []} metric={activeMetric} granularity={data?.period.granularity || 'day'} />
          )}
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <DistributionCard title="订单状态结构" data={data?.dimensions.order_status || []} color="warning" />
        <DistributionCard title="套餐获取来源" data={data?.dimensions.acquisition_sources || []} color="secondary" />
      </div>

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2"><Boxes className="h-4 w-4" /><span className="font-semibold">套餐经营表现</span></CardHeader>
        <CardBody className="p-0">
          <Table aria-label="套餐经营表现" removeWrapper>
            <TableHeader>
              <TableColumn>套餐</TableColumn>
              <TableColumn align="end">支付订单</TableColumn>
              <TableColumn align="end">现金收入</TableColumn>
              <TableColumn align="end">客单价</TableColumn>
            </TableHeader>
            <TableBody emptyContent="当前筛选没有现金支付套餐数据">
              {(data?.dimensions.top_packages || []).map((item) => (
                <TableRow key={item.package_id}>
                  <TableCell><div><p className="font-medium">{item.package_name}</p><p className="text-xs text-default-500">{item.category} · {item.level} · ID #{item.package_id}</p></div></TableCell>
                  <TableCell className="text-right">{integer(item.paid_orders)}</TableCell>
                  <TableCell className="text-right font-medium text-success">{currency(item.revenue)}</TableCell>
                  <TableCell className="text-right">{currency(item.average_order_value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <div>
        <div className="mb-3 flex items-center gap-2"><PackageCheck className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">当前存量与待办</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {inventoryItems.map((item) => (
            <Card key={item.label} shadow="sm">
              <CardBody>
                <p className="text-sm text-default-500">{item.label}</p>
                <p className="mt-1 text-xl font-bold">{integer(item.value)}</p>
                <p className="mt-1 text-xs text-default-400">{item.detail}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      <Alert
        color="default"
        variant="flat"
        startContent={<Gift className="h-4 w-4" />}
        title={`历史现金收入 ${currency(data?.inventory.lifetime_revenue)} · 历史支付订单 ${integer(data?.inventory.lifetime_paid_orders)} · 历史付费用户 ${integer(data?.inventory.lifetime_paid_users)}`}
        description={data?.meta.revenue_definition || '收入按现金支付口径统计。'}
      />
    </div>
  );
};

export default OverviewDashboardPage;
