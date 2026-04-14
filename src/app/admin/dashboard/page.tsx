'use client';

import { useQuery } from '@tanstack/react-query';
import { useBranchStore } from '@/lib/stores/branch.store';
import { financeApi } from '@/lib/api/finance.api';
import { posApi } from '@/lib/api/pos.api';
import { inventoryApi } from '@/lib/api/inventory.api';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { ORDER_STATUS_COLORS } from '@/lib/utils/constants';
import { format, subDays } from 'date-fns';
import {
  ShoppingBag, DollarSign, TrendingUp, AlertTriangle,
  Clock, CheckCircle,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import dynamic from 'next/dynamic';

const RevenueChart = dynamic(() => import('./revenue-chart'), { ssr: false });

export default function DashboardPage() {
  const { activeBranch } = useBranchStore();
  const branchId = activeBranch?.id;

  const today = format(new Date(), 'yyyy-MM-dd');
  const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  const { data: summaries, isLoading: loadingSummaries } = useQuery({
    queryKey: ['daily-summaries', branchId, sevenDaysAgo, today],
    queryFn: () => financeApi.getDailySummaries({ branchId, from: sevenDaysAgo, to: today }),
    enabled: true,
  });

  const { data: recentOrders, isLoading: loadingOrders } = useQuery({
    queryKey: ['orders', branchId, 'recent'],
    queryFn: () => posApi.listOrders(branchId || '', { limit: 10 }),
    enabled: !!branchId,
  });

  const { data: lowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn: inventoryApi.getLowStockAlerts,
  });

  const todaySummary = summaries?.find((s) => s.date.startsWith(today));
  const weekSales = summaries?.reduce((s, d) => s + Number(d.grossSales), 0) || 0;
  const weekOrders = summaries?.reduce((s, d) => s + d.totalOrders, 0) || 0;

  if (loadingSummaries && loadingOrders) return <PageSpinner />;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`${activeBranch?.name || 'All branches'} — ${formatDate(today)}`}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(todaySummary?.grossSales || 0)}
          change={`${todaySummary?.totalOrders || 0} orders`}
          changeType="neutral"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          title="Week Revenue"
          value={formatCurrency(weekSales)}
          change={`${weekOrders} orders this week`}
          changeType="positive"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="Today's Orders"
          value={todaySummary?.totalOrders || 0}
          change={`${formatCurrency(todaySummary?.netSales || 0)} net`}
          changeType="neutral"
          icon={<ShoppingBag className="w-5 h-5" />}
        />
        <StatCard
          title="Low Stock Items"
          value={lowStock?.length || 0}
          change={lowStock && lowStock.length > 0 ? 'Needs attention' : 'All good'}
          changeType={lowStock && lowStock.length > 0 ? 'negative' : 'positive'}
          icon={<AlertTriangle className="w-5 h-5" />}
        />
      </div>

      {/* Charts + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue — Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={summaries || []} />
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {(recentOrders || []).slice(0, 8).map((order) => (
                <div key={order.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {order.status === 'COMPLETED' ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <Clock className="w-3 h-3 text-yellow-500" />
                      )}
                      <span className="text-xs text-gray-500">{order.orderType.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(order.total)}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
              {!recentOrders?.length && (
                <p className="text-center text-gray-400 text-sm py-8">No orders today</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
