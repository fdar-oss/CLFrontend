'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { inventoryApi } from '@/lib/api/inventory.api';
import { useBranchStore } from '@/lib/stores/branch.store';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageSpinner } from '@/components/ui/spinner';
import { Plus, AlertTriangle, ChefHat, X, Package, Trash2, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { ingredientCost } from '@/lib/utils/units';
import { menuApi } from '@/lib/api/menu.api';
import type { StockItem, MenuItem } from '@/lib/types';

const MOVEMENT_TYPES = ['PURCHASE', 'ADJUSTMENT', 'TRANSFER', 'WASTE', 'RETURN'];
const UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'dozen', 'bag', 'box', 'can'];

// ─── Stock Items Tab ──────────────────────────────────────────────────────────

const PACK_UNITS = ['carton', 'bottle', 'bag', 'box', 'pack', 'can', 'jar', 'sachet'];

function StockItemsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);

  const { data: items = [], isLoading } = useQuery({ queryKey: ['stock-items'], queryFn: inventoryApi.listItems });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<{
    name: string; sku?: string; unit: string; minStockLevel?: number;
    packSize?: number; packUnit?: string; purchasePrice?: number; unitCost?: number;
  }>();

  // Auto-compute unit cost when pack fields change
  const packSize = watch('packSize');
  const purchasePrice = watch('purchasePrice');
  const computedUnitCost = packSize && purchasePrice && packSize > 0
    ? Number((purchasePrice / packSize).toFixed(4))
    : undefined;

  const createMut = useMutation({
    mutationFn: (data: any) => {
      // Compute unitCost from pack fields if available
      if (data.packSize && data.purchasePrice && data.packSize > 0) {
        data.unitCost = Number((data.purchasePrice / data.packSize).toFixed(4));
      }
      return inventoryApi.createItem(data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-items'] }); toast.success('Item created'); closeDialog(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      if (data.packSize && data.purchasePrice && data.packSize > 0) {
        data.unitCost = Number((data.purchasePrice / data.packSize).toFixed(4));
      }
      return inventoryApi.updateItem(id, data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-items'] }); toast.success('Item updated'); closeDialog(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  function openCreate() { setEditing(null); reset({ name: '', sku: '', unit: 'ml', packUnit: 'carton' }); setOpen(true); }
  function openEdit(item: StockItem) {
    setEditing(item);
    reset({
      name: item.name, sku: item.sku || '', unit: item.unit,
      minStockLevel: item.minStockLevel ?? undefined, unitCost: item.unitCost ?? undefined,
      packSize: (item as any).packSize ?? undefined,
      packUnit: (item as any).packUnit || 'carton',
      purchasePrice: (item as any).purchasePrice ?? undefined,
    });
    setOpen(true);
  }
  function closeDialog() { setOpen(false); setEditing(null); reset(); }

  async function onSubmit(data: any) {
    if (editing) await updateMut.mutateAsync({ id: editing.id, data });
    else await createMut.mutateAsync(data);
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Item</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Recipe Unit</TableHead>
              <TableHead>Purchased As</TableHead>
              <TableHead>Pack Price</TableHead>
              <TableHead>Unit Cost</TableHead>
              <TableHead>Min Level</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && <TableEmpty message="No stock items yet" />}
            {items.map((item: any) => (
              <TableRow key={item.id} className="cursor-pointer" onClick={() => openEdit(item)}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-gray-500">{item.unit}</TableCell>
                <TableCell className="text-gray-500 text-sm">
                  {item.packSize && item.packUnit
                    ? `${item.packSize} ${item.unit} / ${item.packUnit}`
                    : '—'}
                </TableCell>
                <TableCell className="text-gray-500">{item.purchasePrice ? formatCurrency(item.purchasePrice) : '—'}</TableCell>
                <TableCell className="font-medium text-brand-700">
                  {item.unitCost ? `₨${Number(item.unitCost).toFixed(2)}/${item.unit}` : '—'}
                </TableCell>
                <TableCell className="text-gray-500">{item.minStockLevel ?? '—'} {item.unit}</TableCell>
                <TableCell>
                  <Badge variant={item.isActive ? 'success' : 'secondary'}>{item.isActive ? 'Active' : 'Inactive'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Stock Item' : 'New Stock Item'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Name" error={errors.name?.message} {...register('name', { required: 'Required' })} placeholder="e.g. Prema Milk" />
                <Input label="SKU" placeholder="RAW-001" {...register('sku')} />
              </div>
              <Select label="Recipe Unit (what recipes use)" options={UNITS.map((u) => ({ value: u, label: u }))} {...register('unit', { required: 'Required' })} />

              <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Purchasing Info</p>
                <div className="grid grid-cols-3 gap-3">
                  <Input label="Pack Size" type="number" step="0.001" placeholder="e.g. 1000" {...register('packSize', { valueAsNumber: true })} />
                  <Select label="Pack Type" options={PACK_UNITS.map((u) => ({ value: u, label: u }))} {...register('packUnit')} />
                  <Input label="Price per Pack (₨)" type="number" step="0.01" placeholder="e.g. 350" {...register('purchasePrice', { valueAsNumber: true })} />
                </div>
                {computedUnitCost !== undefined && (
                  <div className="mt-2 px-3 py-2 bg-brand-50 rounded-lg border border-brand-200 flex items-center justify-between">
                    <span className="text-xs font-medium text-brand-800">Auto-computed Unit Cost</span>
                    <span className="text-sm font-bold text-brand-700">₨{computedUnitCost} per {watch('unit') || 'unit'}</span>
                  </div>
                )}
              </div>

              <Input label={`Min Stock Level (${watch('unit') || 'units'})`} type="number" step="0.001" placeholder={`e.g. 5 ${watch('unit') || ''}`} {...register('minStockLevel', { valueAsNumber: true })} />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>{editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Stock Balances Tab ───────────────────────────────────────────────────────

function BalancesTab() {
  const { activeBranch } = useBranchStore();
  const qc = useQueryClient();
  const [movementOpen, setMovementOpen] = useState(false);

  const { data: locations = [] } = useQuery({
    queryKey: ['stock-locations', activeBranch?.id],
    queryFn: () => inventoryApi.getLocations(activeBranch!.id),
    enabled: !!activeBranch?.id,
  });

  const [selectedLocation, setSelectedLocation] = useState('');

  const { data: balances = [], isLoading } = useQuery({
    queryKey: ['stock-balances', selectedLocation],
    queryFn: () => inventoryApi.getBalances(selectedLocation || undefined),
  });

  const { data: stockItems = [] } = useQuery({ queryKey: ['stock-items'], queryFn: inventoryApi.listItems });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    stockItemId: string; locationId: string; type: string; quantity: number; unitCost?: number; notes?: string;
  }>();

  const movementMut = useMutation({
    mutationFn: inventoryApi.recordMovement,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-balances'] }); toast.success('Movement recorded'); setMovementOpen(false); reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Locations</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <Button onClick={() => { reset({ type: 'ADJUSTMENT', quantity: 0 }); setMovementOpen(true); }}>
          <Plus className="w-4 h-4" /> Record Movement
        </Button>
      </div>

      {!activeBranch && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 mb-4">
          Select a branch to view stock balances.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Qty on Hand</TableHead>
              <TableHead>Min Level</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances.length === 0 && <TableEmpty message="No stock balances found" />}
            {balances.map((b) => {
              const isLow = b.stockItem.minStockLevel !== null && b.quantity <= b.stockItem.minStockLevel;
              return (
                <TableRow key={b.id}>
                  <TableCell>
                    <p className="font-medium">{b.stockItem.name}</p>
                    {b.stockItem.sku && <p className="text-xs text-gray-400 font-mono">{b.stockItem.sku}</p>}
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">{b.location.name}</TableCell>
                  <TableCell>
                    <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                      {b.quantity} {b.stockItem.unit}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500">{b.stockItem.minStockLevel ?? '—'} {b.stockItem.unit}</TableCell>
                  <TableCell>
                    {isLow ? (
                      <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Low Stock</Badge>
                    ) : (
                      <Badge variant="success">OK</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Stock Movement</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => movementMut.mutateAsync(d))}>
            <DialogBody>
              <Select
                label="Stock Item"
                options={stockItems.map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` }))}
                placeholder="Select item"
                error={errors.stockItemId?.message}
                {...register('stockItemId', { required: 'Required' })}
              />
              <Select
                label="Location"
                options={locations.map((l) => ({ value: l.id, label: l.name }))}
                placeholder="Select location"
                error={errors.locationId?.message}
                {...register('locationId', { required: 'Required' })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Type"
                  options={MOVEMENT_TYPES.map((t) => ({ value: t, label: t }))}
                  {...register('type', { required: 'Required' })}
                />
                <Input label="Quantity" type="number" step="0.001" error={errors.quantity?.message} {...register('quantity', { required: 'Required', valueAsNumber: true })} />
              </div>
              <Input label="Unit Cost (₨)" type="number" step="0.01" {...register('unitCost', { valueAsNumber: true })} />
              <Input label="Notes" {...register('notes')} />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setMovementOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Record</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Low Stock Alerts Tab ─────────────────────────────────────────────────────

function AlertsTab() {
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['low-stock'],
    queryFn: inventoryApi.getLowStockAlerts,
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      {alerts.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <p className="text-green-800 font-medium">All items are adequately stocked</p>
          <p className="text-green-600 text-sm mt-1">No low stock alerts at this time</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Current Qty</TableHead>
                <TableHead>Min Level</TableHead>
                <TableHead>Shortage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="font-medium">{b.stockItem.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">{b.location.name}</TableCell>
                  <TableCell className="text-red-600 font-semibold">{b.quantity} {b.stockItem.unit}</TableCell>
                  <TableCell className="text-gray-500">{b.stockItem.minStockLevel} {b.stockItem.unit}</TableCell>
                  <TableCell className="text-red-600 font-medium">
                    {((b.stockItem.minStockLevel || 0) - b.quantity).toFixed(2)} {b.stockItem.unit}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Recipes Tab ──────────────────────────────────────────────────────────────

type IngredientRow = { stockItemId: string; quantity: number; unit: string; wasteFactor: number };
type VariantRecipeState = {
  variantId: string | null;
  variantName: string;
  price: number;
  ingredients: IngredientRow[];
  notes: string;
  servingSize: number;
  dirty: boolean;
};

function RecipesTab() {
  const qc = useQueryClient();
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [activeTab, setActiveTab] = useState<string>('__base__');
  const [recipes, setRecipes] = useState<VariantRecipeState[]>([]);

  const { data: menuItems = [] } = useQuery({ queryKey: ['menu-items'], queryFn: () => menuApi.listItems() });
  const { data: stockItems = [] } = useQuery({ queryKey: ['stock-items'], queryFn: inventoryApi.listItems });

  const selectedItem = menuItems.find((m: MenuItem) => m.id === selectedMenuItemId);
  const variants = selectedItem?.variants ?? [];
  const hasVariants = variants.length > 0;

  // Fetch ALL recipes for this item (base + per-variant)
  const { data: allRecipes } = useQuery({
    queryKey: ['recipes-all', selectedMenuItemId],
    queryFn: async () => {
      if (!selectedMenuItemId) return [];
      try {
        const res = await fetch(`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1')}/inventory/recipes/${selectedMenuItemId}/all`, {
          headers: { Authorization: `Bearer ${(await import('@/lib/api/axios')).getAccessToken() || ''}` },
        });
        if (!res.ok) return [];
        return res.json();
      } catch { return []; }
    },
    enabled: !!selectedMenuItemId,
  });

  // Build recipe state per variant (or base) when data arrives
  useEffect(() => {
    if (!selectedMenuItemId) { setRecipes([]); return; }

    const fetched: any[] = allRecipes || [];
    const states: VariantRecipeState[] = [];

    if (hasVariants) {
      for (const v of variants) {
        const existing = fetched.find((r: any) => r.variantId === v.id);
        states.push({
          variantId: v.id, variantName: v.name, price: Number(v.price),
          ingredients: existing?.ingredients?.map((i: any) => ({
            stockItemId: i.stockItemId, quantity: Number(i.quantity), unit: i.unit, wasteFactor: Number(i.wasteFactor),
          })) || [],
          notes: existing?.notes || '', servingSize: existing?.servingSize ?? 1, dirty: false,
        });
      }
      if (states.length > 0) setActiveTab(states[0].variantId!);
    } else {
      const existing = fetched.find((r: any) => !r.variantId);
      states.push({
        variantId: null, variantName: 'Base Recipe', price: Number(selectedItem?.basePrice ?? 0),
        ingredients: existing?.ingredients?.map((i: any) => ({
          stockItemId: i.stockItemId, quantity: Number(i.quantity), unit: i.unit, wasteFactor: Number(i.wasteFactor),
        })) || [],
        notes: existing?.notes || '', servingSize: existing?.servingSize ?? 1, dirty: false,
      });
      setActiveTab('__base__');
    }
    setRecipes(states);
  }, [allRecipes, selectedMenuItemId, hasVariants]);

  const saveMut = useMutation({
    mutationFn: async () => {
      for (const r of recipes) {
        const payload: any = {
          variantId: r.variantId || undefined,
          servingSize: r.servingSize,
          notes: r.notes,
          ingredients: r.ingredients.filter(i => i.stockItemId && i.quantity > 0),
        };
        await inventoryApi.upsertRecipe(selectedMenuItemId, payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes-all', selectedMenuItemId] });
      qc.invalidateQueries({ queryKey: ['cost-analysis'] });
      toast.success('All recipes saved');
      setRecipes(prev => prev.map(r => ({ ...r, dirty: false })));
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Save failed'),
  });

  function updateRecipe(tabId: string, fn: (r: VariantRecipeState) => VariantRecipeState) {
    setRecipes(prev => prev.map(r => (r.variantId ?? '__base__') === tabId ? fn({ ...r, dirty: true }) : r));
  }
  function addRow(tabId: string) {
    updateRecipe(tabId, r => ({ ...r, ingredients: [...r.ingredients, { stockItemId: '', quantity: 0, unit: 'g', wasteFactor: 1 }] }));
  }
  function removeRow(tabId: string, idx: number) {
    updateRecipe(tabId, r => ({ ...r, ingredients: r.ingredients.filter((_, i) => i !== idx) }));
  }
  function updateRow(tabId: string, idx: number, field: keyof IngredientRow, value: string | number) {
    updateRecipe(tabId, r => ({ ...r, ingredients: r.ingredients.map((row, i) => i === idx ? { ...row, [field]: value } : row) }));
  }
  function copyFrom(fromTabId: string, toTabId: string) {
    const src = recipes.find(r => (r.variantId ?? '__base__') === fromTabId);
    if (!src) return;
    updateRecipe(toTabId, r => ({ ...r, ingredients: JSON.parse(JSON.stringify(src.ingredients)) }));
    toast.success(`Copied ingredients from ${src.variantName}`);
  }

  const activeRecipe = recipes.find(r => (r.variantId ?? '__base__') === activeTab);

  return (
    <div>
      {/* Menu item selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Menu Item</label>
        <select
          value={selectedMenuItemId}
          onChange={(e) => { setSelectedMenuItemId(e.target.value); setRecipes([]); }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Pick a menu item to edit its recipe…</option>
          {menuItems.map((m: MenuItem) => {
            const vCount = m.variants?.length ?? 0;
            return <option key={m.id} value={m.id}>{m.name}{vCount > 0 ? ` (${vCount} variants)` : ''}</option>;
          })}
        </select>
      </div>

      {selectedMenuItemId && activeRecipe && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Variant tabs */}
          {hasVariants && (
            <div className="flex border-b border-gray-200 bg-gray-50">
              {recipes.map(r => {
                const tabId = r.variantId ?? '__base__';
                const isActive = activeTab === tabId;
                return (
                  <button
                    key={tabId}
                    onClick={() => setActiveTab(tabId)}
                    className={`flex-1 py-3 px-4 text-center transition-all border-b-2 ${
                      isActive
                        ? 'border-brand-500 bg-white text-brand-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <p className={`text-sm font-bold ${isActive ? 'text-brand-800' : 'text-gray-700'}`}>{r.variantName}</p>
                    <p className={`text-xs mt-0.5 ${isActive ? 'text-brand-600' : 'text-gray-400'}`}>{formatCurrency(r.price)}</p>
                    {r.ingredients.length > 0 && (
                      <p className={`text-[10px] mt-0.5 ${r.dirty ? 'text-amber-500' : 'text-green-500'}`}>
                        {r.ingredients.length} ingredient{r.ingredients.length !== 1 ? 's' : ''}{r.dirty ? ' · unsaved' : ''}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="p-5">
            {/* Header + actions */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {hasVariants ? `${activeRecipe.variantName} Recipe` : 'Ingredients'}
                </h3>
                <p className="text-xs text-gray-500">Define what stock is used for this{hasVariants ? ' variant' : ' item'}</p>
              </div>
              <div className="flex gap-2">
                {/* Copy from another variant */}
                {hasVariants && recipes.length > 1 && (
                  <select
                    onChange={(e) => { if (e.target.value) { copyFrom(e.target.value, activeTab); e.target.value = ''; } }}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    defaultValue=""
                  >
                    <option value="" disabled>Copy from…</option>
                    {recipes.filter(r => (r.variantId ?? '__base__') !== activeTab).map(r => (
                      <option key={r.variantId ?? '__base__'} value={r.variantId ?? '__base__'}>{r.variantName}</option>
                    ))}
                  </select>
                )}
                <Button size="sm" variant="outline" onClick={() => addRow(activeTab)}>
                  <Plus className="w-3 h-3" /> Add ingredient
                </Button>
              </div>
            </div>

            {/* Ingredients table */}
            {activeRecipe.ingredients.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-sm text-gray-400">
                No ingredients yet. Click <span className="font-semibold">Add ingredient</span> to begin.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1">
                  <div className="col-span-5">Stock Item</div>
                  <div className="col-span-3">Quantity</div>
                  <div className="col-span-2">Unit</div>
                  <div className="col-span-1">Waste×</div>
                  <div className="col-span-1"></div>
                </div>
                {activeRecipe.ingredients.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <select
                      value={row.stockItemId}
                      onChange={(e) => {
                        const si = stockItems.find(s => s.id === e.target.value);
                        updateRow(activeTab, idx, 'stockItemId', e.target.value);
                        if (si) updateRow(activeTab, idx, 'unit', si.unit);
                      }}
                      className="col-span-5 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Select…</option>
                      {stockItems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <input type="number" step="0.001" value={row.quantity}
                      onChange={(e) => updateRow(activeTab, idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className="col-span-3 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    <select value={row.unit} onChange={(e) => updateRow(activeTab, idx, 'unit', e.target.value)}
                      className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <input type="number" step="0.01" value={row.wasteFactor}
                      onChange={(e) => updateRow(activeTab, idx, 'wasteFactor', parseFloat(e.target.value) || 1)}
                      title="1.05 = 5% extra for prep waste"
                      className="col-span-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    <button onClick={() => removeRow(activeTab, idx)} className="col-span-1 text-gray-400 hover:text-red-500 flex justify-center">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Cost breakdown */}
            {activeRecipe.ingredients.filter(r => r.stockItemId && r.quantity > 0).length > 0 && (() => {
              const sellingPrice = activeRecipe.price;
              const lines = activeRecipe.ingredients
                .filter(r => r.stockItemId && r.quantity > 0)
                .map(r => {
                  const si = stockItems.find(s => s.id === r.stockItemId);
                  const stockUnit = si?.unit || r.unit;
                  const unitCostVal = Number(si?.unitCost ?? 0);
                  const lineCost = ingredientCost(r.quantity, r.unit, stockUnit, unitCostVal, r.wasteFactor);
                  return { name: si?.name || '?', qty: r.quantity, recipeUnit: r.unit, stockUnit, unitCost: unitCostVal, wasteFactor: r.wasteFactor, lineCost };
                });
              const totalCost = lines.reduce((s, l) => s + l.lineCost, 0);
              const margin = sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0;

              return (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Cost Breakdown — {activeRecipe.variantName}
                  </p>
                  <div className="space-y-1">
                    {lines.map((l, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {l.name} <span className="text-gray-400">({l.qty}{l.recipeUnit}
                          {l.recipeUnit !== l.stockUnit ? ` → ₨${l.unitCost.toFixed(2)}/${l.stockUnit}` : ` × ₨${l.unitCost.toFixed(2)}/${l.stockUnit}`}
                          {l.wasteFactor > 1 ? ` × ${l.wasteFactor} waste` : ''})</span>
                        </span>
                        <span className="font-medium text-gray-900">{formatCurrency(l.lineCost)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-300 mt-2 pt-2 space-y-1">
                    <div className="flex justify-between text-sm font-bold">
                      <span>Recipe Cost</span>
                      <span className="text-brand-700">{formatCurrency(totalCost)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Selling Price</span>
                      <span>{formatCurrency(sellingPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span>Gross Margin</span>
                      <span className={margin >= 60 ? 'text-green-600' : margin >= 40 ? 'text-amber-600' : 'text-red-600'}>
                        {margin.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Profit per unit</span>
                      <span className="text-green-700 font-medium">{formatCurrency(sellingPrice - totalCost)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Save all */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              {hasVariants && (
                <p className="text-xs text-gray-400">
                  Saves recipes for all variants at once
                </p>
              )}
              <Button
                onClick={() => saveMut.mutate()}
                loading={saveMut.isPending}
                disabled={recipes.every(r => r.ingredients.length === 0)}
                className={!hasVariants ? 'ml-auto' : ''}
              >
                {hasVariants ? 'Save All Variant Recipes' : 'Save Recipe'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Cost Analysis Tab ───────────────────────────────────────────────────────

function CostAnalysisTab() {
  const [filterType, setFilterType] = useState('');

  const { data: analysis = [], isLoading } = useQuery({
    queryKey: ['cost-analysis'],
    queryFn: inventoryApi.getCostAnalysis,
  });

  if (isLoading) return <PageSpinner />;

  const items: any[] = analysis;
  const filtered = filterType ? items.filter((i) => i.itemType === filterType) : items;
  const withRecipe = filtered.filter((i) => i.hasRecipe);
  const withoutRecipe = filtered.filter((i) => !i.hasRecipe);

  // Summary stats
  const avgMargin = withRecipe.length > 0
    ? withRecipe.reduce((s, i) => s + (i.margin ?? 0), 0) / withRecipe.length
    : 0;
  const lowestMargin = withRecipe.length > 0
    ? withRecipe.reduce((min, i) => (i.margin ?? 100) < (min.margin ?? 100) ? i : min, withRecipe[0])
    : null;
  const highestCost = withRecipe.length > 0
    ? withRecipe.reduce((max, i) => (i.recipeCost ?? 0) > (max.recipeCost ?? 0) ? i : max, withRecipe[0])
    : null;

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Items with Recipe</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{withRecipe.length} <span className="text-sm font-normal text-gray-400">/ {filtered.length}</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Gross Margin</p>
          <p className={`text-2xl font-bold mt-1 ${avgMargin >= 60 ? 'text-green-600' : avgMargin >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
            {avgMargin.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Lowest Margin Item</p>
          <p className="text-sm font-bold text-red-600 mt-1">{lowestMargin?.name || '—'}</p>
          <p className="text-xs text-gray-400">{lowestMargin?.margin !== null ? `${lowestMargin?.margin?.toFixed(1)}%` : ''}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Types</option>
          <option value="BEVERAGE">Beverages</option>
          <option value="FOOD">Food</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Recipe Cost</TableHead>
              <TableHead>Profit</TableHead>
              <TableHead>Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableEmpty message="No menu items found" />}
            {filtered.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {!item.hasRecipe && <p className="text-[10px] text-amber-500">No recipe defined</p>}
                  </div>
                </TableCell>
                <TableCell className="text-gray-500 text-sm">{item.category || '—'}</TableCell>
                <TableCell><Badge variant="secondary">{item.itemType}</Badge></TableCell>
                <TableCell className="font-medium">{formatCurrency(item.sellingPrice)}</TableCell>
                <TableCell className={item.hasRecipe ? 'font-medium text-brand-700' : 'text-gray-300'}>
                  {item.hasRecipe ? formatCurrency(item.recipeCost) : '—'}
                </TableCell>
                <TableCell className={item.hasRecipe ? 'font-medium text-green-700' : 'text-gray-300'}>
                  {item.hasRecipe ? formatCurrency(item.profit) : '—'}
                </TableCell>
                <TableCell>
                  {item.hasRecipe ? (
                    <span className={`font-bold ${item.margin >= 60 ? 'text-green-600' : item.margin >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                      {item.margin.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {withoutRecipe.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          {withoutRecipe.length} item{withoutRecipe.length !== 1 ? 's' : ''} without recipes — add recipes in the Recipes tab to see their cost analysis
        </p>
      )}
    </div>
  );
}

// ─── Packaging Rules Tab ─────────────────────────────────────────────────────

const ORDER_TYPE_OPTIONS = [
  { value: 'TAKEAWAY', label: 'Takeaway' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'ANY', label: 'Any (Takeaway + Delivery)' },
];
const ITEM_TYPE_OPTIONS = [
  { value: 'BEVERAGE', label: 'Beverage' },
  { value: 'FOOD', label: 'Food' },
  { value: 'ANY', label: 'Any' },
];
const SIZE_TAG_OPTIONS = [
  { value: 'ANY', label: 'Any size' },
  { value: 'SMALL', label: 'Small' },
  { value: 'LARGE', label: 'Large' },
];
const SCOPE_OPTIONS = [
  { value: 'PER_ITEM', label: 'Per item (1 cup per drink)' },
  { value: 'PER_ORDER', label: 'Per order (1 bag per order)' },
];

function PackagingRulesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: rules = [], isLoading } = useQuery({ queryKey: ['packaging-rules'], queryFn: inventoryApi.listPackagingRules });
  const { data: stockItems = [] } = useQuery({ queryKey: ['stock-items'], queryFn: inventoryApi.listItems });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    stockItemId: string; orderType: string; itemType: string; sizeTag: string; scope: string; quantity: number;
  }>();

  const createMut = useMutation({
    mutationFn: inventoryApi.createPackagingRule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['packaging-rules'] }); toast.success('Rule created'); setOpen(false); reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: inventoryApi.deletePackagingRule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['packaging-rules'] }); toast.success('Rule deleted'); },
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-3">
          Define what packaging gets auto-deducted from stock when a takeaway or delivery order is completed. No rules = no auto-deduction.
        </p>
        <div className="flex justify-end">
          <Button onClick={() => { reset({ orderType: 'ANY', itemType: 'BEVERAGE', sizeTag: 'ANY', scope: 'PER_ITEM', quantity: 1 }); setOpen(true); }}>
            <Plus className="w-4 h-4" /> Add Rule
          </Button>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">
          No packaging rules yet. Add your first rule to start tracking disposable costs.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stock Item</TableHead>
                <TableHead>Order Type</TableHead>
                <TableHead>Item Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule: any) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.stockItem?.name || '—'}</TableCell>
                  <TableCell><Badge variant="secondary">{rule.orderType}</Badge></TableCell>
                  <TableCell><Badge variant="info">{rule.itemType}</Badge></TableCell>
                  <TableCell className="text-gray-500">{rule.sizeTag || 'Any'}</TableCell>
                  <TableCell className="text-gray-500 text-sm">{rule.scope === 'PER_ORDER' ? 'Per order' : 'Per item'}</TableCell>
                  <TableCell className="text-gray-500">{rule.quantity}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <button
                        onClick={() => deleteMut.mutate(rule.id)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Packaging Rule</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createMut.mutateAsync(d))}>
            <DialogBody>
              <Select
                label="Stock Item (the packaging)"
                options={stockItems.map((s) => ({ value: s.id, label: `${s.name} (${s.unit})` }))}
                placeholder="Select packaging item…"
                error={errors.stockItemId?.message}
                {...register('stockItemId', { required: 'Required' })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Select label="When order type is" options={ORDER_TYPE_OPTIONS} {...register('orderType', { required: 'Required' })} />
                <Select label="And item type is" options={ITEM_TYPE_OPTIONS} {...register('itemType', { required: 'Required' })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Size" options={SIZE_TAG_OPTIONS} {...register('sizeTag')} />
                <Select label="Deduct how" options={SCOPE_OPTIONS} {...register('scope', { required: 'Required' })} />
              </div>
              <Input label="Quantity per deduction" type="number" defaultValue={1} {...register('quantity', { required: 'Required', valueAsNumber: true })} />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Create Rule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Track stock items, balances, recipes, and movements"
      />
      <Tabs defaultValue="balances">
        <TabsList className="mb-6">
          <TabsTrigger value="balances">Stock Balances</TabsTrigger>
          <TabsTrigger value="items">Stock Items</TabsTrigger>
          <TabsTrigger value="recipes"><ChefHat className="w-4 h-4 mr-1.5" /> Recipes</TabsTrigger>
          <TabsTrigger value="cost"><TrendingUp className="w-4 h-4 mr-1.5" /> Cost Analysis</TabsTrigger>
          <TabsTrigger value="packaging"><Package className="w-4 h-4 mr-1.5" /> Packaging Rules</TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="w-4 h-4 mr-1.5" /> Low Stock Alerts
          </TabsTrigger>
        </TabsList>
        <TabsContent value="balances"><BalancesTab /></TabsContent>
        <TabsContent value="items"><StockItemsTab /></TabsContent>
        <TabsContent value="recipes"><RecipesTab /></TabsContent>
        <TabsContent value="cost"><CostAnalysisTab /></TabsContent>
        <TabsContent value="packaging"><PackagingRulesTab /></TabsContent>
        <TabsContent value="alerts"><AlertsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
