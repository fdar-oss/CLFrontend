'use client';

import { formatCurrency } from '@/lib/utils/format';
import type { MenuItem } from '@/lib/types';

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1').replace(/\/v\d+\/?$/, '');
const imageUrl = (path?: string | null) => (path ? (path.startsWith('http') ? path : `${API_HOST}${path}`) : null);

interface ItemCardProps {
  item: MenuItem & { price?: number; isAvailable?: boolean };
  onClick: () => void;
}

export function ItemCard({ item, onClick }: ItemCardProps) {
  const hasVariants = (item.variants?.length ?? 0) > 0;
  const price = item.price ?? item.basePrice;
  const available = item.isAvailable !== false;
  const minPrice = hasVariants
    ? Math.min(...(item.variants || []).map(v => Number(v.price)))
    : price;
  const maxPrice = hasVariants
    ? Math.max(...(item.variants || []).map(v => Number(v.price)))
    : price;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!available}
      className={`
        relative w-full text-left rounded-lg border p-2 transition-all select-none flex gap-2
        ${available
          ? 'border-gray-200 bg-white hover:border-brand-400 hover:shadow active:scale-[0.97] cursor-pointer'
          : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'}
      `}
    >
      {/* Compact thumbnail / letter */}
      <div className="w-12 h-12 shrink-0 rounded-md bg-brand-50 flex items-center justify-center overflow-hidden">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl(item.image)!} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-base font-bold text-brand-300">{item.name.charAt(0)}</span>
        )}
      </div>

      {/* Name + price */}
      <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
        <p className="text-xs font-semibold text-gray-900 leading-tight line-clamp-2">{item.name}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-brand-700">
            {hasVariants && minPrice !== maxPrice
              ? `${formatCurrency(minPrice)} – ${formatCurrency(maxPrice)}`
              : formatCurrency(minPrice)}
          </span>
          {!available && (
            <span className="text-[9px] font-medium text-gray-400 uppercase">Unavail.</span>
          )}
        </div>
      </div>
    </button>
  );
}
