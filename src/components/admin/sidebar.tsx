'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/lib/stores/auth.store';
import {
  LayoutDashboard, GitBranch, Users, UtensilsCrossed, Package,
  ShoppingCart, UserCheck, DollarSign, Heart, Megaphone,
  Receipt, Monitor, BarChart3,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
      { label: 'Menu', href: '/admin/menu', icon: UtensilsCrossed },
      { label: 'Inventory', href: '/admin/inventory', icon: Package },
      { label: 'Procurement', href: '/admin/procurement', icon: Receipt },
    ],
  },
  {
    title: 'People',
    items: [
      { label: 'HR & Payroll', href: '/admin/hr', icon: UserCheck },
      { label: 'CRM', href: '/admin/crm', icon: Heart },
      { label: 'Marketing', href: '/admin/marketing', icon: Megaphone },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Finance', href: '/admin/finance', icon: DollarSign },
      { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
      { label: 'FBR', href: '/admin/fbr', icon: Monitor },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Branches', href: '/admin/branches', icon: GitBranch },
      { label: 'Users', href: '/admin/users', icon: Users },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  return (
    <aside className="w-60 bg-charcoal-900 flex flex-col h-screen sticky top-0 shrink-0 border-r border-charcoal-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-charcoal-800">
        <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-brand-500/40 shrink-0">
          <Image src="/logo.jpeg" alt="TCL" width={36} height={36} className="object-cover w-full h-full" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate leading-tight">The Coffee Lab</p>
          <p className="text-[11px] text-charcoal-400 truncate">{user?.branch?.name || 'Admin Panel'}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="text-[10px] font-semibold text-charcoal-500 uppercase tracking-wider px-2 mb-1.5">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                        : 'text-charcoal-300 hover:bg-charcoal-800 hover:text-white',
                    )}
                  >
                    <item.icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-brand-400' : 'text-charcoal-400')} />
                    <span className="truncate">{item.label}</span>
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* POS shortcut */}
      <div className="p-3 border-t border-charcoal-800">
        <Link
          href="/pos"
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold transition-all shadow-md shadow-brand-500/20 active:scale-[0.98]"
        >
          <ShoppingCart className="w-4 h-4" />
          Open POS Terminal
        </Link>
      </div>
    </aside>
  );
}
