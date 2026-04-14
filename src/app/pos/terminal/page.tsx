'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { menuApi } from '@/lib/api/menu.api';
import { posApi } from '@/lib/api/pos.api';
import { usePosStore } from '@/lib/stores/pos.store';
import { useBranchStore } from '@/lib/stores/branch.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { MenuGrid } from '@/components/pos/menu-grid';
import { CartPanel } from '@/components/pos/cart-panel';
import { PaymentModal } from '@/components/pos/payment-modal';
import { PageSpinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { LogOut, Clock, LayoutGrid, ChefHat } from 'lucide-react';

export default function TerminalPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { activeBranch } = useBranchStore();
  const { user } = useAuthStore();
  const {
    activeShift, cart, orderType, selectedTable, customerId,
    cartTotal, clearCart,
  } = usePosStore();

  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { data: menu = [], isLoading } = useQuery({
    queryKey: ['pos-menu', activeBranch?.id],
    queryFn: () => menuApi.getPosMenu(activeBranch!.id),
    enabled: !!activeBranch?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ['tables', activeBranch?.id],
    queryFn: () => posApi.listTables(activeBranch!.id),
    enabled: !!activeBranch?.id,
  });

  function handleCheckout() {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setCheckoutOpen(true);
  }

  function handlePaymentSuccess() {
    setCheckoutOpen(false);
    qc.invalidateQueries({ queryKey: ['orders'] });
  }

  if (!activeShift) {
    router.replace('/pos');
    return null;
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Bar */}
      <div className="bg-gray-900 text-white px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center text-xs font-bold">
            CL
          </div>
          <span className="text-sm font-semibold">{activeBranch?.name}</span>
          <span className="text-gray-400 text-xs">|</span>
          <span className="text-gray-300 text-xs">{user?.fullName}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-300 hover:text-white hover:bg-gray-800"
            onClick={() => router.push('/pos/tables')}
          >
            <LayoutGrid className="w-4 h-4 mr-1" /> Tables
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-300 hover:text-white hover:bg-gray-800"
            onClick={() => router.push('/pos/kds')}
          >
            <ChefHat className="w-4 h-4 mr-1" /> KDS
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-300 hover:text-white hover:bg-gray-800"
            onClick={() => router.push('/pos/shift/close')}
          >
            <Clock className="w-4 h-4 mr-1" /> Close Shift
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-300 hover:text-white hover:bg-gray-800"
            onClick={() => router.push('/admin/dashboard')}
          >
            <LogOut className="w-4 h-4 mr-1" /> Admin
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Menu Area */}
        <div className="flex-1 min-w-0">
          <MenuGrid categories={menu} />
        </div>

        {/* Cart Panel */}
        <div className="w-72 flex-shrink-0">
          <CartPanel
            onCheckout={handleCheckout}
            tables={tables.map((t) => ({
              id: t.id,
              number: t.number,
              section: t.section,
              status: t.status,
            }))}
          />
        </div>
      </div>

      {/* Payment Modal */}
      {checkoutOpen && (
        <PaymentModal
          branchId={activeBranch!.id}
          orderType={orderType}
          tableId={selectedTable?.id}
          customerId={customerId}
          cartItems={cart}
          subtotal={cartTotal()}
          onSuccess={handlePaymentSuccess}
          onClose={() => setCheckoutOpen(false)}
        />
      )}
    </div>
  );
}
