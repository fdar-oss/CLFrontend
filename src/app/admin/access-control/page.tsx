'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usersApi } from '@/lib/api/users.api';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';
import { Shield, Save, Check } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/orders': 'Orders',
  '/admin/menu': 'Menu Management',
  '/admin/inventory': 'Inventory',
  '/admin/procurement': 'Procurement',
  '/admin/hr': 'HR & Payroll',
  '/admin/crm': 'CRM',
  '/admin/marketing': 'Marketing',
  '/admin/finance': 'Finance',
  '/admin/reports': 'Reports',
  '/admin/fbr': 'FBR',
  '/admin/branches': 'Branches',
  '/admin/users': 'Users',
  '/pos': 'POS Home',
  '/pos/terminal': 'POS Terminal',
  '/pos/tables': 'Tables',
  '/pos/kds': 'Kitchen Display',
  '/pos/bar': 'Bar Display',
};

const FEATURE_LABELS: Record<string, string> = {
  'menu.delete': 'Delete menu items',
  'menu.toggle': 'Activate/deactivate items',
  'menu.recipes': 'Edit recipes',
  'menu.variants': 'Manage variants',
  'orders.void': 'Void orders',
  'orders.refund': 'Process refunds',
  'orders.reprint': 'Reprint receipts',
  'pos.discount': 'Apply discounts',
  'pos.send_order': 'Send orders to kitchen',
  'pos.charge': 'Charge / process payment',
  'inventory.cost_analysis': 'View cost analysis',
  'inventory.packaging_rules': 'Manage packaging rules',
  'finance.pl': 'View P&L statement',
  'finance.expenses_approve': 'Approve expenses',
  'hr.scheduling': 'Manage schedules',
  'hr.payroll': 'Manage payroll',
  'hr.labor_cost': 'View labor costs',
  'reports.z_reports': 'View Z-Reports',
  'reports.sales': 'View sales reports',
  'users.manage': 'Manage users',
  'users.access_control': 'Manage access control',
};

const ROLE_LABELS: Record<string, string> = {
  TENANT_OWNER: 'Owner (Admin)',
  MANAGER: 'Manager',
  CASHIER: 'Cashier',
  WAITER: 'Waiter',
  CHEF: 'Chef',
  INVENTORY_STAFF: 'Inventory Staff',
  HR_MANAGER: 'HR Manager',
  FINANCE_MANAGER: 'Finance Manager',
  MARKETING_MANAGER: 'Marketing Manager',
};

export default function AccessControlPage() {
  const qc = useQueryClient();
  const [selectedRole, setSelectedRole] = useState('MANAGER');
  const [routes, setRoutes] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['access-control'],
    queryFn: usersApi.getAllPermissions,
  });

  const allRoutes: string[] = data?.allRoutes ?? [];
  const allFeatures: string[] = data?.allFeatures ?? [];
  const roles: any[] = data?.roles ?? [];

  // Load selected role's permissions
  useEffect(() => {
    const rolePerm = roles.find((r: any) => r.role === selectedRole);
    if (rolePerm) {
      setRoutes(rolePerm.allowedRoutes);
      setFeatures(rolePerm.allowedFeatures);
      setDirty(false);
    }
  }, [selectedRole, data]);

  const saveMut = useMutation({
    mutationFn: () => usersApi.updatePermissions(selectedRole, { allowedRoutes: routes, allowedFeatures: features }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['access-control'] });
      toast.success(`Permissions saved for ${ROLE_LABELS[selectedRole]}`);
      setDirty(false);
    },
    onError: () => toast.error('Failed to save'),
  });

  function toggleRoute(route: string) {
    setRoutes(prev => prev.includes(route) ? prev.filter(r => r !== route) : [...prev, route]);
    setDirty(true);
  }

  function toggleFeature(feature: string) {
    setFeatures(prev => prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]);
    setDirty(true);
  }

  function selectAll() {
    setRoutes([...allRoutes]);
    setFeatures([...allFeatures]);
    setDirty(true);
  }

  function clearAll() {
    setRoutes([]);
    setFeatures([]);
    setDirty(true);
  }

  if (isLoading) return <PageSpinner />;

  const isOwner = selectedRole === 'TENANT_OWNER';

  return (
    <div>
      <PageHeader
        title="Access Control"
        description="Manage what each role can see and do"
        action={
          <Button onClick={() => saveMut.mutate()} loading={saveMut.isPending} disabled={!dirty || isOwner}>
            <Save className="w-4 h-4" /> Save Changes
          </Button>
        }
      />

      {/* Role selector */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 max-w-sm">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Select Role</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            {roles.map((r: any) => (
              <option key={r.role} value={r.role}>
                {ROLE_LABELS[r.role] || r.role} — {r.allowedRoutes.length} pages, {r.allowedFeatures.length} features
              </option>
            ))}
          </select>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-center">
          <p className="text-xs text-gray-400">Pages</p>
          <p className="text-lg font-bold text-brand-700">{routes.length}<span className="text-xs text-gray-400 font-normal">/{allRoutes.length}</span></p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-center">
          <p className="text-xs text-gray-400">Features</p>
          <p className="text-lg font-bold text-brand-700">{features.length}<span className="text-xs text-gray-400 font-normal">/{allFeatures.length}</span></p>
        </div>
      </div>

      {isOwner && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-sm text-green-800">
          <Shield className="w-4 h-4 inline mr-2" />
          Owner (Admin) always has full access to everything. These permissions cannot be modified.
        </div>
      )}

      {!isOwner && (
        <div className="flex gap-2 mb-4">
          <button onClick={selectAll} className="text-xs text-brand-600 hover:text-brand-800 font-medium underline">Select all</button>
          <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-700 font-medium underline">Clear all</button>
          {dirty && <Badge variant="warning">Unsaved changes</Badge>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Page Access */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 text-sm">Page Access</h3>
            <p className="text-xs text-gray-500 mt-0.5">Which pages this role can see in the sidebar</p>
          </div>
          <div className="divide-y divide-gray-100">
            {allRoutes.map(route => {
              const checked = routes.includes(route);
              const isAdmin = route.startsWith('/admin');
              return (
                <label
                  key={route}
                  className={`flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${isOwner ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {isAdmin ? 'ADMIN' : 'POS'}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{ROUTE_LABELS[route] || route}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isOwner || checked}
                      onChange={() => toggleRoute(route)}
                      disabled={isOwner}
                      className="sr-only"
                    />
                    <div className={`w-9 h-5 rounded-full transition-colors ${isOwner || checked ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${isOwner || checked ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Feature Access */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 text-sm">Feature Access</h3>
            <p className="text-xs text-gray-500 mt-0.5">Specific actions this role can perform</p>
          </div>
          <div className="divide-y divide-gray-100">
            {allFeatures.map(feature => {
              const checked = features.includes(feature);
              const category = feature.split('.')[0];
              return (
                <label
                  key={feature}
                  className={`flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${isOwner ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono uppercase">{category}</span>
                    <span className="text-sm text-gray-900">{FEATURE_LABELS[feature] || feature}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isOwner || checked}
                      onChange={() => toggleFeature(feature)}
                      disabled={isOwner}
                      className="sr-only"
                    />
                    <div className={`w-9 h-5 rounded-full transition-colors ${isOwner || checked ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${isOwner || checked ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
