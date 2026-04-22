import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatCurrency(amount: number | string | null | undefined): string {
  const num = Number(amount ?? 0);
  const hasDecimals = num % 1 !== 0;
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(num: number | string | null | undefined): string {
  return new Intl.NumberFormat('en-PK').format(Number(num ?? 0));
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(date: string | Date | null | undefined, fmt = 'dd MMM yyyy'): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, fmt);
  } catch {
    return '—';
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'dd MMM yyyy, hh:mm a');
}

export function formatTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'hh:mm a');
}

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return '—';
  }
}

export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '—';
  return phone.replace(/(\d{4})(\d{7})/, '$1-$2');
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}
