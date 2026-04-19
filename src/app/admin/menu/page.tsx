'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { menuApi } from '@/lib/api/menu.api';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageSpinner } from '@/components/ui/spinner';
import { Plus, Tag, Layers, Percent, ImagePlus, X, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import type { MenuCategory, MenuItem, ModifierGroup, TaxCategory } from '@/lib/types';

// ─── Categories Tab ─────────────────────────────────────────────────────────

function CategoriesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MenuCategory | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['menu-categories'],
    queryFn: menuApi.listCategories,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    name: string; description?: string; sortOrder: number;
  }>();

  const createMut = useMutation({
    mutationFn: menuApi.createCategory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['menu-categories'] }); toast.success('Category created'); closeDialog(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MenuCategory> }) => menuApi.updateCategory(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['menu-categories'] }); toast.success('Category updated'); closeDialog(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const deleteCatMut = useMutation({
    mutationFn: menuApi.deleteCategory,
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['menu-categories'] });
      if (res.deactivated) toast.info(res.reason);
      else toast.success('Category permanently deleted');
      setDeleteCat(null);
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const [deleteCat, setDeleteCat] = useState<MenuCategory | null>(null);

  function openCreate() { setEditing(null); reset({ name: '', description: '', sortOrder: 0 }); setOpen(true); }
  function openEdit(cat: MenuCategory) { setEditing(cat); reset({ name: cat.name, description: cat.description || '', sortOrder: cat.sortOrder }); setOpen(true); }
  function closeDialog() { setOpen(false); setEditing(null); reset(); }

  async function onSubmit(data: { name: string; description?: string; sortOrder: number }) {
    if (editing) await updateMut.mutateAsync({ id: editing.id, data });
    else await createMut.mutateAsync(data);
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Category</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 && <TableEmpty message="No categories yet" />}
            {categories.map((cat) => (
              <TableRow key={cat.id} className="cursor-pointer" onClick={() => openEdit(cat)}>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell className="text-gray-500 text-sm">{cat.description || '—'}</TableCell>
                <TableCell className="text-gray-500">{cat._count?.menuItems ?? '—'}</TableCell>
                <TableCell className="text-gray-500">{cat.sortOrder}</TableCell>
                <TableCell>
                  <Badge variant={cat.isActive ? 'success' : 'secondary'}>{cat.isActive ? 'Active' : 'Inactive'}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteCat(cat); }}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete category"
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Category' : 'New Category'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody>
              <Input label="Name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
              <Input label="Description" {...register('description')} />
              <Input label="Sort Order" type="number" {...register('sortOrder', { valueAsNumber: true })} />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>{editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete category confirmation */}
      <Dialog open={!!deleteCat} onOpenChange={(o) => !o && setDeleteCat(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete category?</DialogTitle></DialogHeader>
          <DialogBody>
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{deleteCat?.name}</span>
              {(deleteCat?._count?.menuItems ?? 0) > 0
                ? ` has ${deleteCat?._count?.menuItems} items — it will be deactivated instead of deleted.`
                : ' has no items and will be permanently deleted.'}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setDeleteCat(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteCat && deleteCatMut.mutate(deleteCat.id)}
              loading={deleteCatMut.isPending}
            >
              {(deleteCat?._count?.menuItems ?? 0) > 0 ? 'Deactivate' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Items Tab ───────────────────────────────────────────────────────────────

const ITEM_TYPES = ['FOOD', 'BEVERAGE', 'RETAIL', 'SERVICE'];

function ItemsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [filterCat, setFilterCat] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: items = [], isLoading } = useQuery({ queryKey: ['menu-items'], queryFn: () => menuApi.listItems() });
  const { data: categories = [] } = useQuery({ queryKey: ['menu-categories'], queryFn: menuApi.listCategories });
  const { data: modifierGroups = [] } = useQuery({ queryKey: ['modifier-groups'], queryFn: menuApi.listModifierGroups });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    name: string; sku?: string; description?: string; basePrice: number; itemType: string;
    categoryId: string; availablePOS: boolean; availableOnline: boolean;
    sortOrder: number; modifierGroupIds?: string[];
  }>();

  const createMut = useMutation({
    mutationFn: menuApi.createItem,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['menu-items'] }); toast.success('Item created'); closeDialog(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MenuItem> }) => menuApi.updateItem(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['menu-items'] }); toast.success('Item updated'); closeDialog(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const toggleMut = useMutation({
    mutationFn: menuApi.toggleItem,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['menu-items'] }); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: menuApi.deleteItem,
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['menu-items'] });
      if (res.deactivated) {
        toast.info('Item has order history — deactivated instead of deleted');
      } else {
        toast.success('Item permanently deleted');
      }
      setDeleteTarget(null);
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);

  function openCreate() {
    setEditing(null);
    setImagePreview(null);
    setImageFile(null);
    setSelectedGroupIds([]);
    reset({ name: '', sku: '', description: '', basePrice: 0, itemType: 'FOOD', categoryId: '', availablePOS: true, availableOnline: false, sortOrder: 0 });
    setOpen(true);
  }

  function openEdit(item: MenuItem) {
    setEditing(item);
    setImagePreview(item.image ? `http://localhost:4000${item.image}` : null);
    setImageFile(null);
    setSelectedGroupIds(item.modifierGroups?.map((mg) => mg.modifierGroup.id) ?? []);
    reset({
      name: item.name, sku: item.sku || '', description: item.description || '',
      basePrice: item.basePrice, itemType: item.itemType, categoryId: item.categoryId,
      availablePOS: item.availablePOS, availableOnline: item.availableOnline,
      sortOrder: item.sortOrder,
    });
    setOpen(true);
  }

  function closeDialog() { setOpen(false); setEditing(null); setImagePreview(null); setImageFile(null); setSelectedGroupIds([]); reset(); }

  function toggleGroup(id: string) {
    setSelectedGroupIds((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function onSubmit(data: Parameters<typeof createMut.mutateAsync>[0]) {
    let imageUrl: string | undefined;
    if (imageFile) {
      setUploading(true);
      try {
        const res = await menuApi.uploadImage(imageFile);
        imageUrl = res.url;
      } catch {
        toast.error('Image upload failed');
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    const payload = {
      ...data,
      ...(imageUrl ? { image: imageUrl } : {}),
      modifierGroupIds: selectedGroupIds,
    };
    if (editing) await updateMut.mutateAsync({ id: editing.id, data: payload });
    else await createMut.mutateAsync(payload);
  }

  const filtered = filterCat ? items.filter((i) => i.categoryId === filterCat) : items;

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Item</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Base Price</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Channels</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableEmpty message="No items found" />}
            {filtered.map((item) => (
              <TableRow key={item.id} className="cursor-pointer" onClick={() => openEdit(item)}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`http://localhost:4000${item.image}`} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400 text-sm font-bold">
                        {item.name[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.description && <p className="text-xs text-gray-400 truncate max-w-[180px]">{item.description}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-gray-500 text-sm font-mono">{item.sku || '—'}</TableCell>
                <TableCell className="text-gray-500 text-sm">{item.category?.name || '—'}</TableCell>
                <TableCell className="font-medium">{formatCurrency(item.basePrice)}</TableCell>
                <TableCell><Badge variant="secondary">{item.itemType}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {item.availablePOS && <Badge variant="info">POS</Badge>}
                    {item.availableOnline && <Badge variant="secondary">Online</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleMut.mutate(item.id); }}
                    title={item.isActive ? 'Click to deactivate' : 'Click to reactivate'}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${item.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${item.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Permanently delete"
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Item' : 'New Menu Item'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody>
              {/* Image Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Image</label>
                <div className="flex items-center gap-4">
                  <div
                    className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer hover:border-brand-400 transition-colors flex-shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlus className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      {imagePreview ? 'Change image' : 'Upload image'}
                    </Button>
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => { setImagePreview(null); setImageFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                      >
                        <X className="w-3 h-3" /> Remove
                      </button>
                    )}
                    <p className="text-xs text-gray-400">JPG, PNG, WebP · max 5MB</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
                <Input label="SKU" placeholder="COFFEE-001" {...register('sku')} />
              </div>
              <Input label="Description" {...register('description')} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Base Price (₨)" type="number" step="0.01" error={errors.basePrice?.message} {...register('basePrice', { required: 'Required', valueAsNumber: true })} />
                <Select
                  label="Type"
                  options={ITEM_TYPES.map((t) => ({ value: t, label: t }))}
                  {...register('itemType', { required: 'Required' })}
                />
              </div>
              <Select
                label="Category"
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Select category"
                error={errors.categoryId?.message}
                {...register('categoryId', { required: 'Required' })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Sort Order" type="number" {...register('sortOrder', { valueAsNumber: true })} />
              </div>
              <div className="flex items-center gap-6 mt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="rounded" {...register('availablePOS')} />
                  Available on POS
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="rounded" {...register('availableOnline')} />
                  Available Online
                </label>
              </div>

              {/* Modifier Groups */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Modifier Groups
                  <span className="font-normal text-gray-400 ml-1">— attach Size, Milk, Add-ons, etc.</span>
                </label>
                {modifierGroups.length === 0 ? (
                  <p className="text-xs text-gray-400 italic px-3 py-3 bg-gray-50 rounded-lg border border-gray-200">
                    No modifier groups exist yet. Create one in the Modifiers tab first.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {modifierGroups.map((g) => {
                      const isSel = selectedGroupIds.includes(g.id);
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => toggleGroup(g.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                            isSel
                              ? 'border-brand-500 bg-brand-50 text-brand-800'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {g.name}
                          <span className="ml-1.5 text-[10px] text-gray-400">({g.modifiers.length})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" loading={isSubmitting || uploading}>
                {uploading ? 'Uploading…' : editing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Permanently delete item?</DialogTitle></DialogHeader>
          <DialogBody>
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{deleteTarget?.name}</span> will be permanently deleted along with its recipe and pricing data. This cannot be undone.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              If the item is just temporarily unavailable, use the toggle switch instead to deactivate it.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              loading={deleteMut.isPending}
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Modifier Groups Tab ─────────────────────────────────────────────────────

function ModifierGroupsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [modifierRows, setModifierRows] = useState([{ name: '', priceAdjustment: 0 }]);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['modifier-groups'],
    queryFn: menuApi.listModifierGroups,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    name: string; selectionType: string; isRequired: boolean; minSelections: number; maxSelections?: number;
  }>();

  const createMut = useMutation({
    mutationFn: (data: Parameters<typeof menuApi.createModifierGroup>[0]) =>
      menuApi.createModifierGroup(data as Parameters<typeof menuApi.createModifierGroup>[0]),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['modifier-groups'] }); toast.success('Modifier group created'); setOpen(false); reset(); setModifierRows([{ name: '', priceAdjustment: 0 }]); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  function addModifierRow() { setModifierRows((r) => [...r, { name: '', priceAdjustment: 0 }]); }
  function removeModifierRow(idx: number) { setModifierRows((r) => r.filter((_, i) => i !== idx)); }
  function updateModifierRow(idx: number, field: 'name' | 'priceAdjustment', value: string | number) {
    setModifierRows((r) => r.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  }

  async function onSubmit(data: { name: string; selectionType: string; isRequired: boolean; minSelections: number; maxSelections?: number }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await createMut.mutateAsync({ ...data, modifiers: modifierRows.filter((m) => m.name.trim()) } as any);
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { reset({ name: '', selectionType: 'SINGLE', isRequired: false, minSelections: 0 }); setModifierRows([{ name: '', priceAdjustment: 0 }]); setOpen(true); }}>
          <Plus className="w-4 h-4" /> Add Modifier Group
        </Button>
      </div>

      <div className="space-y-3">
        {groups.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">No modifier groups yet</div>
        )}
        {groups.map((group) => (
          <div key={group.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">{group.name}</h3>
                <Badge variant={group.isRequired ? 'default' : 'secondary'}>{group.isRequired ? 'Required' : 'Optional'}</Badge>
                <Badge variant="info">{group.selectionType}</Badge>
              </div>
              <span className="text-xs text-gray-400">{group.modifiers.length} options</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.modifiers.map((mod) => (
                <span key={mod.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-medium">
                  {mod.name}
                  {mod.priceAdjustment !== 0 && (
                    <span className={mod.priceAdjustment > 0 ? 'text-green-600' : 'text-red-600'}>
                      {mod.priceAdjustment > 0 ? '+' : ''}{formatCurrency(mod.priceAdjustment)}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Modifier Group</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody>
              <Input label="Group Name" placeholder="e.g. Milk Choice" error={errors.name?.message} {...register('name', { required: 'Required' })} />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Selection Type"
                  options={[{ value: 'SINGLE', label: 'Single select' }, { value: 'MULTIPLE', label: 'Multi-select' }]}
                  {...register('selectionType')}
                />
                <Input label="Min Selections" type="number" {...register('minSelections', { valueAsNumber: true })} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
                <input type="checkbox" className="rounded" {...register('isRequired')} />
                Required (customer must choose)
              </label>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide flex justify-between">
                  <span>Options</span>
                  <button type="button" onClick={addModifierRow} className="text-brand-600 hover:text-brand-700 font-medium normal-case text-xs">+ Add</button>
                </div>
                <div className="divide-y divide-gray-100">
                  {modifierRows.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2">
                      <input
                        value={row.name}
                        onChange={(e) => updateModifierRow(idx, 'name', e.target.value)}
                        placeholder="Option name"
                        className="flex-1 text-sm border-0 focus:outline-none bg-transparent"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={row.priceAdjustment}
                        onChange={(e) => updateModifierRow(idx, 'priceAdjustment', parseFloat(e.target.value) || 0)}
                        placeholder="±price"
                        className="w-24 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                      {modifierRows.length > 1 && (
                        <button type="button" onClick={() => removeModifierRow(idx)} className="text-gray-400 hover:text-red-500 text-xs px-1">✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tax Categories Tab ──────────────────────────────────────────────────────

function TaxCategoriesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: taxCategories = [], isLoading } = useQuery({
    queryKey: ['tax-categories'],
    queryFn: menuApi.listTaxCategories,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    name: string; rate: number; isInclusive: boolean;
  }>();

  const createMut = useMutation({
    mutationFn: menuApi.createTaxCategory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tax-categories'] }); toast.success('Tax category created'); setOpen(false); reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { reset({ name: '', rate: 0, isInclusive: false }); setOpen(true); }}>
          <Plus className="w-4 h-4" /> Add Tax Category
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taxCategories.length === 0 && <TableEmpty message="No tax categories yet" />}
            {taxCategories.map((tc) => (
              <TableRow key={tc.id}>
                <TableCell className="font-medium">{tc.name}</TableCell>
                <TableCell className="font-medium text-brand-700">{tc.rate}%</TableCell>
                <TableCell>
                  <Badge variant={tc.isInclusive ? 'secondary' : 'info'}>
                    {tc.isInclusive ? 'Inclusive' : 'Exclusive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={tc.isActive ? 'success' : 'secondary'}>{tc.isActive ? 'Active' : 'Inactive'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Tax Category</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createMut.mutateAsync(d))}>
            <DialogBody>
              <Input label="Name" placeholder="GST 17%" error={errors.name?.message} {...register('name', { required: 'Required' })} />
              <Input label="Rate (%)" type="number" step="0.01" error={errors.rate?.message} {...register('rate', { required: 'Required', valueAsNumber: true })} />
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="rounded" {...register('isInclusive')} />
                Tax-inclusive (price already includes tax)
              </label>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MenuPage() {
  return (
    <div>
      <PageHeader
        title="Menu Management"
        description="Categories, items, modifiers, and tax configuration"
      />

      <Tabs defaultValue="items">
        <TabsList className="mb-6">
          <TabsTrigger value="items"><Tag className="w-4 h-4 mr-1.5" /> Items</TabsTrigger>
          <TabsTrigger value="categories"><Layers className="w-4 h-4 mr-1.5" /> Categories</TabsTrigger>
          <TabsTrigger value="modifiers">Modifiers</TabsTrigger>
          <TabsTrigger value="tax"><Percent className="w-4 h-4 mr-1.5" /> Tax</TabsTrigger>
        </TabsList>
        <TabsContent value="items"><ItemsTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="modifiers"><ModifierGroupsTab /></TabsContent>
        <TabsContent value="tax"><TaxCategoriesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
