'use client';

import { formatCurrency } from '@/lib/utils/format';
import type { MenuItem } from '@/lib/types';

interface ItemCardProps {
  item: MenuItem & { price?: number; isAvailable?: boolean };
  onClick: () => void;
}

export function ItemCard({ item, onClick }: ItemCardProps) {
  const price = item.price ?? item.basePrice;
  const available = item.isAvailable !== false;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!available}
      className={`
        relative w-full text-left rounded-xl border-2 p-3 transition-all select-none
        ${available
          ? 'border-gray-200 bg-white hover:border-brand-400 hover:shadow-md active:scale-95 active:shadow-sm cursor-pointer'
          : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'}
      `}
    >
      {/* Image placeholder / first letter */}
      <div className="w-full aspect-square rounded-lg bg-brand-50 flex items-center justify-center mb-2 overflow-hidden">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl font-bold text-brand-200">{item.name.charAt(0)}</span>
        )}
      </div>

      <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{item.name}</p>

      <div className="flex items-center justify-between mt-1.5">
        <span className="text-sm font-bold text-brand-700">{formatCurrency(price)}</span>
        {!available && (
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Unavail.</span>
        )}
      </div>
    </button>
  );
}
