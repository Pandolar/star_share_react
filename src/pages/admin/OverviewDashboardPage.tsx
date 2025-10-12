import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardHeader, Spinner } from '@heroui/react';
import { BarChart3 } from 'lucide-react';
import dayjs from 'dayjs';
import adminApiService from '../../services/adminApi';
import { User } from '../../types/admin';

interface Point { label: string; value: number }

const SimpleLineChart: React.FC<{ data: Point[]; height?: number; color?: string }>
  = ({ data, height = 160, color = '#006FEE' }) => {
  const width = 600; // svg 内部宽度（容器会自适应滚动）
  const padding = 24;
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
          {/* X 轴 */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" />
          {/* Y 轴 */}
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" />
          {/* 折线 */}
          <polyline fill="none" stroke={color} strokeWidth={2} points={poly} />
          {/* 圆点 */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
          ))}
          {/* X 轴标签（每 5 天显示一次） */}
          {data.map((d, i) => (i % 5 === 0) && (
            <text key={i} x={padding + i * stepX} y={height - padding + 14} fontSize={10} fill="#6b7280">
              {d.label.slice(5)}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
};

const OverviewDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await adminApiService.getUsers({ current_page: 1, page_size: 1000 });
        if (res.code === 20000) setUsers(Array.isArray(res.data) ? res.data : []);
        else setUsers([]);
      } catch (_) {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const last30DaysData: Point[] = useMemo(() => {
    const today = dayjs().startOf('day');
    const days: Point[] = Array.from({ length: 30 }).map((_, idx) => {
      const d = today.subtract(29 - idx, 'day');
      return { label: d.format('YYYY-MM-DD'), value: 0 };
    });
    const map = new Map(days.map(d => [d.label, 0] as [string, number]));
    users.forEach(u => {
      const day = dayjs(u.created_at).format('YYYY-MM-DD');
      if (map.has(day)) map.set(day, (map.get(day) || 0) + 1);
    });
    return days.map(d => ({ label: d.label, value: map.get(d.label) || 0 }));
  }, [users]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-800">系统总览</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="font-medium">近30天用户新增</span>
            {loading && <Spinner size="sm" />}
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="flex items-center justify-center min-h-[180px]">
              <Spinner label="加载数据中..." />
            </div>
          ) : (
            <SimpleLineChart data={last30DaysData} />
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default OverviewDashboardPage;

