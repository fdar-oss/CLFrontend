'use client';

import { Delete } from 'lucide-react';

interface NumpadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'];

export function Numpad({ value, onChange, maxLength = 10 }: NumpadProps) {
  function handleKey(key: string) {
    if (key === 'DEL') {
      onChange(value.slice(0, -1) || '');
      return;
    }
    if (key === '.' && value.includes('.')) return;
    if (key === '.' && value === '') { onChange('0.'); return; }
    if (value.length >= maxLength) return;
    onChange(value + key);
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => handleKey(key)}
          className={`
            h-14 rounded-xl text-lg font-semibold flex items-center justify-center transition-all
            active:scale-95
            ${key === 'DEL'
              ? 'bg-red-50 text-red-600 hover:bg-red-100'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}
          `}
        >
          {key === 'DEL' ? <Delete className="w-5 h-5" /> : key}
        </button>
      ))}
    </div>
  );
}
