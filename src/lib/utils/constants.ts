export const ORDER_TYPES = ['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'ONLINE'] as const;
export type OrderType = typeof ORDER_TYPES[number];

export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED', 'REFUNDED'] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export const TABLE_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'INACTIVE'] as const;
export type TableStatus = typeof TABLE_STATUSES[number];

export const TICKET_STATUSES = ['PENDING', 'IN_PROGRESS', 'READY', 'BUMPED'] as const;
export type TicketStatus = typeof TICKET_STATUSES[number];

export const PAYMENT_METHODS = ['CASH', 'CARD', 'JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER', 'LOYALTY_POINTS', 'ONLINE', 'COMPLIMENTARY'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

export const USER_ROLES = ['TENANT_OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'CHEF', 'INVENTORY_STAFF', 'HR_MANAGER', 'FINANCE_MANAGER', 'MARKETING_MANAGER'] as const;
export type UserRole = typeof USER_ROLES[number];

export const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: 'Dine In',
  TAKEAWAY: 'Takeaway',
  DELIVERY: 'Delivery',
  ONLINE: 'Online',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-orange-100 text-orange-800',
  READY: 'bg-green-100 text-green-800',
  SERVED: 'bg-teal-100 text-teal-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-purple-100 text-purple-800',
};

export const TABLE_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 border-green-300 text-green-800',
  OCCUPIED: 'bg-red-100 border-red-300 text-red-800',
  RESERVED: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  CLEANING: 'bg-blue-100 border-blue-300 text-blue-800',
  INACTIVE: 'bg-gray-100 border-gray-300 text-gray-500',
};

export const TICKET_STATUS_COLORS: Record<string, string> = {
  PENDING: 'border-yellow-400 bg-yellow-50',
  IN_PROGRESS: 'border-orange-400 bg-orange-50',
  READY: 'border-green-400 bg-green-50',
  BUMPED: 'border-gray-300 bg-gray-50',
};

export const ROLE_LABELS: Record<string, string> = {
  TENANT_OWNER: 'Owner',
  MANAGER: 'Manager',
  CASHIER: 'Cashier',
  WAITER: 'Waiter',
  CHEF: 'Chef',
  INVENTORY_STAFF: 'Inventory',
  HR_MANAGER: 'HR Manager',
  FINANCE_MANAGER: 'Finance Manager',
  MARKETING_MANAGER: 'Marketing Manager',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card (HBL POS)',
  BANK_TRANSFER: 'Bank Transfer (HBL)',
  LOYALTY_POINTS: 'Loyalty Points',
  COMPLIMENTARY: 'Complimentary',
};
