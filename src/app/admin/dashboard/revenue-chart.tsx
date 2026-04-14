'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDate } from '@/lib/utils/format';
import type { DailySalesSummary } from '@/lib/types';

export default function RevenueChart({ data }: { data: DailySalesSummary[] }) {
  const chartData = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({
      date: formatDate(s.date, 'dd MMM'),
      revenue: Number(s.grossSales),
      orders: s.totalOrders,
    }));

  if (!chartData.length) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        No data for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#d4711a" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#d4711a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={60}
          tickFormatter={(v) => `₨${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(value: number) => [`₨${value.toLocaleString()}`, 'Revenue']}
          contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e7eb' }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#d4711a"
          strokeWidth={2}
          fill="url(#revenueGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
