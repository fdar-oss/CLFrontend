'use client';

import { useState } from 'react';
import { ItemCard } from './item-card';
import { ModifierSheet } from './modifier-sheet';
import { usePosStore } from '@/lib/stores/pos.store';
import { Search } from 'lucide-react';
import type { PosMenuCategory, MenuItem } from '@/lib/types';

interface MenuGridProps {
  categories: PosMenuCategory[];
}

export function MenuGrid({ categories }: MenuGridProps) {
  const addToCart = usePosStore((s) => s.addToCart);
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<(MenuItem & { price?: number }) | null>(null);

  const allItems = categories.flatMap((c) =>
    c.menuItems.map((i) => ({ ...i, categoryId: c.id })),
  );

  const displayItems = search.trim()
    ? allItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : categories.find((c) => c.id === activeCategory)?.menuItems ?? [];

  function handleItemClick(item: MenuItem & { price?: number }) {
    const hasVariants = (item.variants?.length ?? 0) > 0;
    const hasModifiers = (item.modifierGroups?.length ?? 0) > 0;
    // If item has variants or modifiers, open the sheet for selection
    if (hasVariants || hasModifiers) {
      setSelectedItem(item);
    } else {
      addToCart({
        menuItemId: item.id,
        itemName: item.name,
        unitPrice: item.price ?? item.basePrice,
        quantity: 1,
        modifiers: [],
      });
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="relative px-4 pt-3 pb-2">
        <Search className="w-4 h-4 absolute left-7 top-1/2 -translate-y-0.5 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search menu…"
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-100 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Category Tabs */}
      {!search && (
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`
                flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all
                ${activeCategory === cat.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
              `}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Items Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {displayItems.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            {search ? 'No items match your search' : 'No items in this category'}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 pt-2">
          {displayItems.map((item) => (
            <ItemCard
              key={`${item.id}-${item.price}`}
              item={item}
              onClick={() => handleItemClick(item)}
            />
          ))}
        </div>
      </div>

      {/* Modifier Sheet */}
      {selectedItem && (
        <ModifierSheet item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
