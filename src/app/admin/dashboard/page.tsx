'use client';

import { useQuery } from '@tanstack/react-query';
import { useBranchStore } from '@/lib/stores/branch.store';
import { financeApi } from '@/lib/api/finance.api';
import { inventoryApi } from '@/lib/api/inventory.api';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import {
  ShoppingBag, DollarSign, TrendingUp, AlertTriangle,
  Banknote, CreditCard, Building2, Users, Clock, Coffee,
  ArrowUp, ArrowDown,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const RevenueChart = dynamic(() => import('./revenue-chart'), { ssr: false });

export default function DashboardPage() {
  const { activeBranch } = useBranchStore();

  const { data: dash, isLoading } = useQuery({
    queryKey: ['dashboard', activeBranch?.id],
    queryFn: () => financeApi.getDashboard(activeBranch?.id),
    refetchInterval: 30_000, // refresh every 30s
  });

  const { data: lowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn: inventoryApi.getLowStockAlerts,
  });

  if (isLoading) return <PageSpinner />;

  const t = dash?.today ?? { revenue: 0, subtotal: 0, tax: 0, orders: 0, avgOrder: 0, cash: 0, card: 0, bank: 0 };
  const w = dash?.week ?? { revenue: 0, orders: 0 };
  const topSellers: any[] = dash?.topSellers ?? [];
  const hourly: any[] = dash?.hourly ?? [];
  const daily: any[] = dash?.dailyRevenue ?? [];
  const types = dash?.orderTypes ?? { dineIn: 0, takeaway: 0, delivery: 0 };
  const pending = dash?.pendingOrders ?? 0;
  const lowCount = lowStock?.length ?? 0;

  // Peak hour
  const peakHour = hourly.length > 0
    ? hourly.reduce((max, h) => h.revenue > max.revenue ? h : max, hourly[0])
    : null;

  // Yesterday comparison from daily data
  const todayRev = daily.length > 0 ? daily[daily.length - 1]?.revenue ?? 0 : 0;
  const yesterdayRev = daily.length > 1 ? daily[daily.length - 2]?.revenue ?? 0 : 0;
  const dayChange = yesterdayRev > 0 ? ((todayRev - yesterdayRev) / yesterdayRev) * 100 : 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`${activeBranch?.name || 'All branches'} — ${formatDate(new Date(), 'EEEE, dd MMM yyyy')}`}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(t.revenue)}
          change={dayChange !== 0 ? `${dayChange > 0 ? '+' : ''}${dayChange.toFixed(1)}% vs yesterday` : `${t.orders} orders`}
          changeType={dayChange > 0 ? 'positive' : dayChange < 0 ? 'negative' : 'neutral'}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          title="This Week"
          value={formatCurrency(w.revenue)}
          change={`${w.orders} orders`}
          changeType="neutral"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="Avg Order Value"
          value={formatCurrency(t.avgOrder)}
          change={`${t.orders} orders today`}
          changeType="neutral"
          icon={<ShoppingBag className="w-5 h-5" />}
        />
        <StatCard
          title={pending > 0 ? 'Pending Orders' : 'Low Stock'}
          value={pending > 0 ? pending : lowCount}
          change={pending > 0 ? 'Orders awaiting payment' : lowCount > 0 ? 'Needs restocking' : 'All stocked'}
          changeType={pending > 0 || lowCount > 0 ? 'negative' : 'positive'}
          icon={pending > 0 ? <Clock className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        />
      </div>

      {/* Payment Method + Order Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <Banknote className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Cash</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(t.cash)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Card (HBL POS)</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(t.card)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Bank Transfer</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(t.bank)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Order Types</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary">{types.dineIn} Dine-in</Badge>
              <Badge variant="info">{types.takeaway} Take</Badge>
              {types.delivery > 0 && <Badge variant="default">{types.delivery} Del</Badge>}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart — Last 7 Days */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue — Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={daily.map(d => ({ date: d.date, grossSales: d.revenue, totalOrders: d.orders }))} />
          </CardContent>
        </Card>

        {/* Hourly Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Today by Hour</CardTitle>
              {peakHour && (
                <Badge variant="info">Peak: {peakHour.hour}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto">
              {hourly.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No sales yet today</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {hourly.map((h) => {
                    const maxRev = Math.max(...hourly.map(x => x.revenue), 1);
                    const pct = (h.revenue / maxRev) * 100;
                    return (
                      <div key={h.hour} className="px-4 py-2.5 flex items-center gap-3">
                        <span className="text-xs font-mono text-gray-500 w-12 shrink-0">{h.hour}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
                          <div
                            className="h-full bg-brand-500/30 rounded-full transition-all"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                          <span className="absolute inset-0 flex items-center px-2 text-[11px] font-medium text-gray-700">
                            {h.orders} orders · {formatCurrency(h.revenue)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Sellers + Tax Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Sellers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Sellers Today</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topSellers.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No sales yet today</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {topSellers.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        i === 0 ? 'bg-amber-100 text-amber-700' :
                        i === 1 ? 'bg-gray-200 text-gray-600' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.qty} sold</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(item.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tax + GST Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Tax Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-xs text-gray-500">Subtotal (before tax)</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(t.subtotal)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">GST Collected</p>
                  <p className="text-lg font-bold text-brand-700">{formatCurrency(t.tax)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200">
                <div>
                  <p className="text-xs text-green-600 font-medium">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-800">{formatCurrency(t.revenue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-green-600">Today's Orders</p>
                  <p className="text-2xl font-bold text-green-800">{t.orders}</p>
                </div>
              </div>

              {lowCount > 0 && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Low Stock Alert</p>
                  </div>
                  <p className="text-sm text-red-600">{lowCount} item{lowCount !== 1 ? 's' : ''} below minimum level</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
