'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { menuApi } from '@/lib/api/menu.api';
import { posApi } from '@/lib/api/pos.api';
import { usePosStore } from '@/lib/stores/pos.store';
import { useBranchStore } from '@/lib/stores/branch.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { MenuGrid } from '@/components/pos/menu-grid';
import { CartPanel } from '@/components/pos/cart-panel';
import { PaymentModal } from '@/components/pos/payment-modal';
import { Receipt, ReceiptMode } from '@/components/pos/receipt';
import { ParkedOrders } from '@/components/pos/parked-orders';
import { PageSpinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { LogOut, Clock, LayoutGrid, ChefHat, Coffee } from 'lucide-react';

type ReceiptState = { mode: ReceiptMode; orderId: string; cashGiven?: number; change?: number; taxRate?: number } | null;

export default function TerminalPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { activeBranch } = useBranchStore();
  const { user } = useAuthStore();
  const {
    activeShift, cart, orderType, selectedTable, customerId, servedById,
    currentOrderId, setCurrentOrderId, discount,
    cartTotal, clearCart,
  } = usePosStore();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptState>(null);
  const [preBillOrderId, setPreBillOrderId] = useState<string | null>(null);

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

  const { data: receiptOrder } = useQuery({
    queryKey: ['order-detail', receipt?.orderId],
    queryFn: () => posApi.getOrder(receipt!.orderId),
    enabled: !!receipt?.orderId,
  });

  // Send Order — creates a PENDING order and prints kitchen ticket
  const sendOrderMut = useMutation({
    mutationFn: () => posApi.createOrder({
      branchId: activeBranch!.id,
      orderType,
      tableId: selectedTable?.id,
      customerId: customerId || undefined,
      servedById: servedById || undefined,
      items: cart.map((item) => ({
        menuItemId: item.menuItemId,
        variantId: item.variantId,
        variantName: item.variantName,
        quantity: item.quantity,
        notes: item.notes,
        modifiers: item.modifiers.map((m) => ({
          modifierId: m.modifierId,
          modifierName: m.modifierName,
          priceAdjustment: m.priceAdjustment,
        })),
      })),
    }),
    onSuccess: (order) => {
      toast.success(`Order ${order.orderNumber} parked — find under "Parked" to charge later`);
      // Clear cart but keep the kitchen-ticket preview open
      clearCart();
      setCurrentOrderId(null);
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['orders', activeBranch?.id, 'parked'] });
      qc.invalidateQueries({ queryKey: ['tables', activeBranch?.id] });
      setReceipt({ mode: 'KITCHEN', orderId: order.id });
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send order'),
  });

  function handleSendOrder() {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    if (orderType === 'DINE_IN' && !selectedTable) { toast.error('Pick a table for dine-in'); return; }
    if (!servedById) { toast.error('Pick the staff serving'); return; }
    sendOrderMut.mutate();
  }

  function handlePrePrint() {
    if (!currentOrderId) { toast.error('Send the order first'); return; }
    // Open the method picker first — pre-bill tax depends on how the customer plans to pay
    setPreBillOrderId(currentOrderId);
  }

  function confirmPreBill(rate: number) {
    if (!preBillOrderId) return;
    setReceipt({ mode: 'PRE_BILL', orderId: preBillOrderId, taxRate: rate });
    setPreBillOrderId(null);
  }

  function handleCheckout() {
    if (cart.length === 0 && !currentOrderId) { toast.error('Cart is empty'); return; }
    if (orderType === 'DINE_IN' && !selectedTable && !currentOrderId) { toast.error('Pick a table'); return; }
    if (!servedById && !currentOrderId) { toast.error('Pick the staff serving'); return; }
    setCheckoutOpen(true);
  }

  function handlePaymentSuccess(orderId: string, cashGiven?: number, change?: number) {
    setCheckoutOpen(false);
    setReceipt({ mode: 'PAID', orderId, cashGiven, change });
    qc.invalidateQueries({ queryKey: ['orders'] });
    qc.invalidateQueries({ queryKey: ['tables', activeBranch?.id] });
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
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center text-xs font-bold">CL</div>
          <span className="text-sm font-semibold">{activeBranch?.name}</span>
          <span className="text-gray-400 text-xs">|</span>
          <span className="text-gray-300 text-xs">{user?.fullName}</span>
        </div>

        <div className="flex items-center gap-2">
          {activeBranch && <ParkedOrders branchId={activeBranch.id} />}
          <Button size="sm" variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800" onClick={() => router.push('/pos/tables')}>
            <LayoutGrid className="w-4 h-4 mr-1" /> Tables
          </Button>
          <Button size="sm" variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800" onClick={() => router.push('/pos/kds')}>
            <ChefHat className="w-4 h-4 mr-1" /> KDS
          </Button>
          <Button size="sm" variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800" onClick={() => router.push('/pos/bar')}>
            <Coffee className="w-4 h-4 mr-1" /> Bar
          </Button>
          <Button size="sm" variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800" onClick={() => router.push('/pos/shift/close')}>
            <Clock className="w-4 h-4 mr-1" /> Close Shift
          </Button>
          <Button size="sm" variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800" onClick={() => router.push('/admin/dashboard')}>
            <LogOut className="w-4 h-4 mr-1" /> Admin
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 min-w-0">
          <MenuGrid categories={menu} />
        </div>

        <div className="w-72 flex-shrink-0">
          <CartPanel
            onSendOrder={handleSendOrder}
            onPreBill={handlePrePrint}
            onCheckout={handleCheckout}
            sendingOrder={sendOrderMut.isPending}
            tables={tables.map((t) => ({ id: t.id, number: t.number, section: t.section, status: t.status }))}
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
          servedById={servedById}
          existingOrderId={currentOrderId}
          cartItems={cart}
          subtotal={cartTotal()}
          discount={discount}
          onSuccess={handlePaymentSuccess}
          onClose={() => setCheckoutOpen(false)}
        />
      )}

      {/* Pre-bill: pick payment method first so tax % is correct */}
      {preBillOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h2 className="font-bold text-lg text-gray-900 mb-1">Print Pre-Bill</h2>
            <p className="text-sm text-gray-500 mb-4">How will the customer pay? GST rate depends on the method.</p>
            <div className="space-y-2">
              <button
                onClick={() => confirmPreBill(16)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-left transition-all"
              >
                <p className="font-semibold text-gray-900">Cash</p>
                <p className="text-xs text-gray-500">GST 16% — cash invoice</p>
              </button>
              <button
                onClick={() => confirmPreBill(5)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-left transition-all"
              >
                <p className="font-semibold text-gray-900">Card · HBL POS</p>
                <p className="text-xs text-gray-500">GST 5% — card invoice</p>
              </button>
              <button
                onClick={() => confirmPreBill(5)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-left transition-all"
              >
                <p className="font-semibold text-gray-900">Bank Transfer · HBL Business</p>
                <p className="text-xs text-gray-500">GST 5% — bank transfer invoice</p>
              </button>
            </div>
            <button
              onClick={() => setPreBillOrderId(null)}
              className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Receipt Print Preview */}
      {receipt && receiptOrder && (() => {
        const sub = Number(receiptOrder.subtotal) || 0;
        // For pre-bill the operator picks the rate; otherwise use what's stored on the order
        const useRate = receipt.taxRate;
        const overrideTax = useRate !== undefined ? (sub * useRate) / 100 : undefined;
        const overrideTotal = useRate !== undefined ? sub + overrideTax! : undefined;

        return (
          <Receipt
            mode={receipt.mode}
            order={{
              orderNumber: receiptOrder.orderNumber,
              orderType: receiptOrder.orderType,
              createdAt: receiptOrder.createdAt,
              table: receiptOrder.table ? { number: receiptOrder.table.number, section: receiptOrder.table.section } : null,
              customer: receiptOrder.customer ? { fullName: receiptOrder.customer.fullName } : null,
              createdBy: receiptOrder.createdBy ? { fullName: receiptOrder.createdBy.fullName } : null,
              servedBy: undefined,
              orderItems: (receiptOrder.orderItems || []).map((it) => ({
                itemName: it.itemName,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                taxRate: useRate ?? Number(it.taxRate ?? 0),
                notes: it.notes,
                modifiers: it.modifiers,
              })),
              subtotal: sub,
              taxAmount: overrideTax ?? receiptOrder.taxAmount,
              total: overrideTotal ?? receiptOrder.total,
              payments: receiptOrder.payments,
              notes: receiptOrder.notes,
            }}
            branchName={activeBranch?.name}
            autoPrint={false}
            cashGiven={receipt.cashGiven}
            change={receipt.change}
            onClose={() => setReceipt(null)}
          />
        );
      })()}
    </div>
  );
}
