'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/admin/page-header';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { PageSpinner } from '@/components/ui/spinner';
import { formatDateTime } from '@/lib/utils/format';
import { Search, X } from 'lucide-react';
import api from '@/lib/api/axios';
import { usersApi } from '@/lib/api/users.api';

const ACTION_COLORS: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'secondary'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'destructive',
  PAYMENT: 'success',
  REFUND: 'destructive',
  LOGIN: 'secondary',
  LOGOUT: 'secondary',
  VOID: 'destructive',
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  PAYMENT: 'Payment',
  REFUND: 'Refund',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  VOID: 'Voided',
};

const RESOURCE_LABELS: Record<string, string> = {
  PosOrder: 'Order',
  MenuItem: 'Menu Item',
  Employee: 'Employee',
  User: 'User',
  StockItem: 'Stock Item',
  Recipe: 'Recipe',
  Expense: 'Expense',
  PurchaseOrder: 'Purchase Order',
  Attendance: 'Attendance',
  SalaryAdvance: 'Advance',
  PayrollPeriod: 'Payroll',
};

export default function ActivityLogPage() {
  const [resource, setResource] = useState('');
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['activity-log', resource, action, userId, from, to, page],
    queryFn: () => api.get('/users/activity-log', {
      params: {
        ...(resource && { resource }),
        ...(action && { action }),
        ...(userId && { userId }),
        ...(from && { from }),
        ...(to && { to }),
        page,
        limit: 50,
      },
    }).then(r => r.data),
  });

  const logs: any[] = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  // Client-side search
  const filtered = search.trim()
    ? logs.filter(l =>
        l.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        l.resource?.toLowerCase().includes(search.toLowerCase()) ||
        l.resourceId?.toLowerCase().includes(search.toLowerCase()) ||
        JSON.stringify(l.newValues)?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader
        title="Activity Log"
        description="Track who did what and when across the system"
      />

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4">
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2">
          <p className="text-xs text-gray-400">Total Activities</p>
          <p className="text-lg font-bold text-gray-900">{total}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user, resource…"
            className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1); }} className="text-sm border border-gray-300 rounded-lg px-3 py-2">
          <option value="">All Users</option>
          {users.map((u: any) => (
            <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
          ))}
        </select>
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="text-sm border border-gray-300 rounded-lg px-3 py-2">
          <option value="">All Actions</option>
          <option value="CREATE">Created</option>
          <option value="UPDATE">Updated</option>
          <option value="DELETE">Deleted</option>
          <option value="PAYMENT">Payment</option>
          <option value="REFUND">Refund</option>
        </select>
        <select value={resource} onChange={(e) => { setResource(e.target.value); setPage(1); }} className="text-sm border border-gray-300 rounded-lg px-3 py-2">
          <option value="">All Resources</option>
          <option value="PosOrder">Orders</option>
          <option value="MenuItem">Menu Items</option>
          <option value="Employee">Employees</option>
          <option value="User">Users</option>
          <option value="StockItem">Stock</option>
          <option value="Expense">Expenses</option>
        </select>
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="text-sm border border-gray-300 rounded-lg px-3 py-2" />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="text-sm border border-gray-300 rounded-lg px-3 py-2" />
        {(resource || action || userId || from || to) && (
          <button onClick={() => { setResource(''); setAction(''); setUserId(''); setFrom(''); setTo(''); setPage(1); }} className="text-xs text-brand-600 underline">Clear</button>
        )}
      </div>

      {/* Log table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableEmpty message="No activity logged yet" />}
            {filtered.map((log: any) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{log.user?.fullName || 'System'}</p>
                    <p className="text-[10px] text-gray-400">{log.user?.role || ''}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={ACTION_COLORS[log.action] || 'secondary'}>
                    {ACTION_LABELS[log.action] || log.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm text-gray-700">{RESOURCE_LABELS[log.resource] || log.resource}</p>
                    {log.resourceId && <p className="text-[10px] text-gray-400 font-mono">{log.resourceId.slice(0, 12)}…</p>}
                  </div>
                </TableCell>
                <TableCell>
                  {log.newValues && (
                    <div className="text-xs text-gray-500 max-w-xs truncate">
                      {typeof log.newValues === 'object'
                        ? Object.entries(log.newValues).map(([k, v]) => `${k}: ${v}`).join(' · ')
                        : String(log.newValues)}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-500">Page {page} of {totalPages} ({total} total)</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
