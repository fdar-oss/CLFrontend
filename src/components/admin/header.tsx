'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useBranchStore } from '@/lib/stores/branch.store';
import { authApi } from '@/lib/api/auth.api';
import { branchesApi } from '@/lib/api/branches.api';
import { Bell, ChevronDown, LogOut, Settings, User, MapPin } from 'lucide-react';
import { Branch } from '@/lib/types';
import { useState, useRef, useEffect } from 'react';

export function Header() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { activeBranch, setActiveBranch } = useBranchStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const branchMenuRef = useRef<HTMLDivElement>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: branchesApi.list,
  });

  useEffect(() => {
    if (!activeBranch && branches.length > 0) setActiveBranch(branches[0]);
  }, [branches, activeBranch, setActiveBranch]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (branchMenuRef.current && !branchMenuRef.current.contains(e.target as Node)) setShowBranchMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleLogout() {
    try { await authApi.logout(); } finally {
      clearAuth();
      router.replace('/login');
    }
  }

  return (
    <header className="h-14 border-b border-gray-100 bg-white flex items-center justify-between px-6 shrink-0 shadow-sm">
      {/* Branch Selector */}
      <div className="relative" ref={branchMenuRef}>
        <button
          onClick={() => setShowBranchMenu(!showBranchMenu)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
        >
          <MapPin className="w-3.5 h-3.5 text-brand-500" />
          <span>{activeBranch?.name || 'Select Branch'}</span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>

        {showBranchMenu && branches.length > 0 && (
          <div className="absolute top-full left-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
            {branches.map((branch: Branch) => (
              <button
                key={branch.id}
                onClick={() => { setActiveBranch(branch); setShowBranchMenu(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 text-left transition-colors"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${activeBranch?.id === branch.id ? 'bg-brand-500' : 'bg-gray-200'}`} />
                <span className="flex-1 truncate">{branch.name}</span>
                {branch.code && <span className="text-xs text-gray-400">{branch.code}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">
        <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
          <Bell className="w-4 h-4" />
        </button>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
          >
            <div className="w-7 h-7 rounded-full bg-charcoal-800 border-2 border-brand-500/60 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-gray-900 leading-none">
                {user?.fullName?.split(' ')[0]}
              </p>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5">{user?.role?.replace(/_/g, ' ')}</p>
            </div>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
              <div className="px-3 py-2.5 border-b border-gray-100 mb-1">
                <p className="text-sm font-semibold text-gray-900">{user?.fullName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
              </div>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                onClick={() => { toast.info('Profile coming soon'); setShowUserMenu(false); }}
              >
                <User className="w-3.5 h-3.5 text-gray-400" /> Profile
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                onClick={() => { toast.info('Settings coming soon'); setShowUserMenu(false); }}
              >
                <Settings className="w-3.5 h-3.5 text-gray-400" /> Settings
              </button>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
