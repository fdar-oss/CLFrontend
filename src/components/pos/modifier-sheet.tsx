'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format';
import { usePosStore } from '@/lib/stores/pos.store';
import type { MenuItem } from '@/lib/types';
import { Plus, Minus, X } from 'lucide-react';

interface ModifierSheetProps {
  item: MenuItem & { price?: number };
  onClose: () => void;
}

export function ModifierSheet({ item, onClose }: ModifierSheetProps) {
  const addToCart = usePosStore((s) => s.addToCart);
  const variants = item.variants ?? [];
  const hasVariants = variants.length > 0;

  // Variant selection
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    hasVariants ? variants[0]?.id ?? null : null,
  );
  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  // Price depends on variant selection
  const basePrice = hasVariants
    ? Number(selectedVariant?.price ?? item.basePrice)
    : Number(item.price ?? item.basePrice);

  // selected: { groupId -> modifierId[] }
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const groups = item.modifierGroups?.map((mg) => mg.modifierGroup) ?? [];

  function toggleModifier(groupId: string, modifierId: string, selectionType: 'SINGLE' | 'MULTIPLE') {
    setSelected((prev) => {
      const current = prev[groupId] ?? [];
      if (selectionType === 'SINGLE') {
        return { ...prev, [groupId]: current[0] === modifierId ? [] : [modifierId] };
      }
      if (current.includes(modifierId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== modifierId) };
      }
      return { ...prev, [groupId]: [...current, modifierId] };
    });
  }

  function isValid() {
    if (hasVariants && !selectedVariantId) return false;
    return groups.every((g) => {
      if (!g.isRequired) return true;
      const sel = selected[g.id] ?? [];
      return sel.length >= (g.minSelections || 1);
    });
  }

  function selectedModifiers() {
    return groups.flatMap((g) =>
      (selected[g.id] ?? []).map((modId) => {
        const mod = g.modifiers.find((m) => m.id === modId)!;
        return { modifierId: mod.id, modifierName: mod.name, priceAdjustment: Number(mod.priceAdjustment) };
      }),
    );
  }

  function modAdjustment() {
    return selectedModifiers().reduce((s, m) => s + m.priceAdjustment, 0);
  }

  function handleAdd() {
    if (!isValid()) return;
    const variantLabel = selectedVariant ? ` (${selectedVariant.name})` : '';
    addToCart({
      menuItemId: item.id,
      itemName: `${item.name}${variantLabel}`,
      unitPrice: basePrice,
      quantity,
      notes: notes || undefined,
      modifiers: selectedModifiers(),
      variantId: selectedVariantId || undefined,
      variantName: selectedVariant?.name,
    } as any);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{item.name}</h2>
            {item.description && <p className="text-sm text-gray-400 mt-0.5">{item.description}</p>}
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Variant + Modifier Groups */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Variant picker */}
          {hasVariants && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-800">Size</h3>
                <span className="text-[10px] font-medium bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Required</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {variants.map((v) => {
                  const isSel = v.id === selectedVariantId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`
                        flex flex-col items-center py-3 px-4 rounded-xl border-2 transition-all
                        ${isSel
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-gray-200 hover:border-gray-300'}
                      `}
                    >
                      <span className={`text-sm font-bold ${isSel ? 'text-brand-800' : 'text-gray-700'}`}>{v.name}</span>
                      <span className={`text-lg font-bold mt-0.5 ${isSel ? 'text-brand-700' : 'text-gray-900'}`}>
                        {formatCurrency(Number(v.price))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {groups.length === 0 && !hasVariants && (
            <p className="text-sm text-gray-400 text-center py-4">No customization options</p>
          )}

          {groups.map((group) => {
            const selectedIds = selected[group.id] ?? [];
            return (
              <div key={group.id}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-gray-800">{group.name}</h3>
                  {group.isRequired && (
                    <span className="text-[10px] font-medium bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                      Required
                    </span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    {group.selectionType === 'SINGLE' ? 'Pick one' : `Pick up to ${group.maxSelections ?? '∞'}`}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {group.modifiers.filter((m) => m.isActive).map((mod) => {
                    const isSelected = selectedIds.includes(mod.id);
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => toggleModifier(group.id, mod.id, group.selectionType)}
                        className={`
                          w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border-2 text-sm transition-all
                          ${isSelected
                            ? 'border-brand-500 bg-brand-50 text-brand-800'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                            ${isSelected ? 'border-brand-500 bg-brand-500' : 'border-gray-300'}`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <span className="font-medium">{mod.name}</span>
                        </div>
                        {Number(mod.priceAdjustment) !== 0 && (
                          <span className={`text-xs font-semibold ${Number(mod.priceAdjustment) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {Number(mod.priceAdjustment) > 0 ? '+' : ''}{formatCurrency(Number(mod.priceAdjustment))}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Notes */}
          <div>
            <label className="text-sm font-semibold text-gray-800 block mb-1.5">Special Instructions</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g. no sugar, extra hot…"
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100">
          {/* Quantity */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-brand-400 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-xl font-bold w-8 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-brand-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <Button
            className="w-full h-12 text-base"
            onClick={handleAdd}
            disabled={!isValid()}
          >
            Add to Order — {formatCurrency((basePrice + modAdjustment()) * quantity)}
          </Button>
        </div>
      </div>
    </div>
  );
}
