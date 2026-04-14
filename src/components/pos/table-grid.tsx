'use client';

import { TABLE_STATUS_COLORS } from '@/lib/utils/constants';
import type { RestaurantTable } from '@/lib/types';

interface TableGridProps {
  tables: RestaurantTable[];
  onSelect?: (table: RestaurantTable) => void;
  selectedId?: string;
}

export function TableGrid({ tables, onSelect, selectedId }: TableGridProps) {
  const sections = Array.from(new Set(tables.map((t) => t.section || 'Main'))).sort();

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const sectionTables = tables.filter((t) => (t.section || 'Main') === section);
        return (
          <div key={section}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{section}</h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
              {sectionTables.map((table) => {
                const isSelected = selectedId === table.id;
                const colorClass = TABLE_STATUS_COLORS[table.status] || 'bg-gray-100 border-gray-300 text-gray-500';
                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => onSelect?.(table)}
                    disabled={table.status === 'INACTIVE'}
                    className={`
                      aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-0.5
                      font-semibold transition-all select-none
                      ${isSelected ? 'ring-2 ring-brand-500 ring-offset-2' : ''}
                      ${table.status === 'INACTIVE' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:opacity-80 active:scale-95'}
                      ${colorClass}
                    `}
                  >
                    <span className="text-lg leading-none">{table.number}</span>
                    <span className="text-[9px] font-medium opacity-70 uppercase tracking-wide">
                      {table.status === 'AVAILABLE' ? `${table.capacity}p` : table.status.replace('_', ' ')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {tables.length === 0 && (
        <div className="text-center text-gray-400 py-12 text-sm">
          No tables configured for this branch
        </div>
      )}
    </div>
  );
}
