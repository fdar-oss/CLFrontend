// Auth
export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  branchId: string | null;
  role: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatar: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  branch: { id: string; name: string; code: string } | null;
  tenant: { id: string; name: string; slug: string; logo: string | null; primaryColor: string | null };
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

// Tenant & Branch
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  status: string;
  createdAt: string;
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  ntn: string | null;
  createdAt: string;
  _count?: { users: number; posOrders: number; employees: number; tables: number };
}

// Menu
export interface TaxCategory {
  id: string;
  name: string;
  rate: number;
  isInclusive: boolean;
  isActive: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { menuItems: number };
}

export interface Modifier {
  id: string;
  name: string;
  priceAdjustment: number;
  isActive: boolean;
  sortOrder: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  selectionType: 'SINGLE' | 'MULTIPLE';
  isRequired: boolean;
  minSelections: number;
  maxSelections: number | null;
  modifiers: Modifier[];
}

export interface MenuItemVariant {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  sku: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  image: string | null;
  basePrice: number;
  effectivePrice?: number;
  isAvailable?: boolean;
  itemType: string;
  isActive: boolean;
  availablePOS: boolean;
  availableOnline: boolean;
  categoryId: string;
  taxCategoryId: string | null;
  sortOrder: number;
  category?: MenuCategory;
  taxCategory?: TaxCategory | null;
  variants?: MenuItemVariant[];
  modifierGroups?: { modifierGroup: ModifierGroup; sortOrder: number }[];
  branchPrices?: { branchId: string; price: number; isAvailable: boolean }[];
}

export interface PosMenuCategory extends MenuCategory {
  menuItems: (MenuItem & { price: number; isAvailable: boolean })[];
}

// POS
export interface RestaurantTable {
  id: string;
  branchId: string;
  number: number;
  section: string | null;
  capacity: number;
  status: string;
  isActive: boolean;
  posOrders?: PosOrder[];
}

export interface PosShift {
  id: string;
  branchId: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  openingFloat: number;
  closingCash: number | null;
  expectedCash: number | null;
  cashVariance: number | null;
  totalSales: number | null;
  totalOrders: number | null;
  zReportData: Record<string, unknown> | null;
  zReport?: Record<string, unknown> | null;
  openedBy: { id: string; fullName: string };
}

export interface OrderItemModifier {
  modifierId: string;
  modifierName: string;
  priceAdjustment: number;
}

export interface PosOrderItem {
  id: string;
  menuItemId: string;
  itemName: string;
  itemSku: string | null;
  unitPrice: number;
  quantity: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  notes: string | null;
  status: string;
  modifiers: OrderItemModifier[];
}

export interface PosPayment {
  id: string;
  method: string;
  amount: number;
  reference: string | null;
  status: string;
}

export interface PosOrder {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  source: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  notes: string | null;
  fbrInvoiceNo: string | null;
  fbrQrCode: string | null;
  fbrSubmittedAt: string | null;
  createdAt: string;
  completedAt: string | null;
  tableId: string | null;
  customerId: string | null;
  branchId: string;
  orderItems: PosOrderItem[];
  payments: PosPayment[];
  table: { number: number; section: string | null } | null;
  customer: { id: string; fullName: string } | null;
  createdBy: { fullName: string };
}

export interface KitchenTicket {
  id: string;
  ticketNumber: string;
  status: string;
  priority: number;
  items: { name: string; quantity: number; notes: string | null; modifiers: string[] }[];
  notes: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  bumpedAt: string | null;
  order: { orderNumber: string; orderType: string; table: { number: number } | null; createdAt: string };
  station: { name: string; type: string };
}

// Inventory
export interface StockCategory {
  id: string;
  name: string;
}

export interface StockItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  minStockLevel: number | null;
  unitCost: number | null;
  isActive: boolean;
  category?: StockCategory | null;
}

export interface StockLocation {
  id: string;
  branchId: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface StockBalance {
  id: string;
  quantity: number;
  stockItem: StockItem;
  location: StockLocation;
}

export interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  unitCost: number | null;
  reference: string | null;
  referenceType: string | null;
  notes: string | null;
  createdAt: string;
  stockItem: StockItem;
  location: StockLocation;
}

export interface RecipeIngredient {
  stockItemId: string;
  quantity: number;
  unit: string;
  wasteFactor: number;
  stockItem?: StockItem;
}

export interface Recipe {
  menuItemId: string;
  ingredients: RecipeIngredient[];
}

// HR
export interface Department {
  id: string;
  name: string;
  _count?: { employees: number };
}

export interface Designation {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  cnic: string | null;
  joiningDate: string;
  salaryType: string;
  baseSalary: number;
  bankAccount: string | null;
  bankName: string | null;
  isActive: boolean;
  department: Department | null;
  designation: Designation | null;
  branch: { id: string; name: string } | null;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  hoursWorked: number | null;
  overtime: number | null;
  employee: { fullName: string; employeeCode: string };
}

export interface Leave {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  createdAt: string;
  employee: { fullName: string; employeeCode: string };
}

export interface PayrollPeriod {
  id: string;
  month: number;
  year: number;
  status: string;
  startDate: string;
  endDate: string;
  _count?: { entries: number };
}

export interface PayrollEntry {
  id: string;
  baseSalary: number;
  overtime: number;
  netSalary: number;
  employee: { fullName: string; employeeCode: string; bankAccount: string | null; bankName: string | null };
}

// Finance
export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  description: string;
  status: string;
  category: ExpenseCategory;
  branch: { name: string };
}

export interface DailySalesSummary {
  id: string;
  date: string;
  totalOrders: number;
  grossSales: number;
  netSales: number;
  taxCollected: number;
  discounts: number;
  refunds: number;
  cashSales: number;
  cardSales: number;
  onlineSales: number;
  branch: { name: string; code: string };
}

// CRM
export interface Customer {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  totalSpent: number;
  visitCount: number;
  lastVisitAt: string | null;
  isActive: boolean;
  loyaltyAccount?: {
    points: number;
    lifetimePoints: number;
    tier: { name: string; color: string } | null;
  } | null;
}

export interface Reservation {
  id: string;
  date: string;
  time: string;
  partySize: number;
  status: string;
  notes: string | null;
  createdAt: string;
  branch: { name: string };
  table: { number: number; section: string | null } | null;
  customer: { fullName: string; phone: string | null } | null;
}

// Procurement
export interface Vendor {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  _count?: { purchaseOrders: number; vendorInvoices: number };
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  expectedDate: string | null;
  createdAt: string;
  vendor: { id: string; name: string };
  _count?: { lines: number; grns: number };
}

// Pagination wrapper
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// API error shape
export interface ApiError {
  statusCode: number;
  message: string;
  errors?: unknown;
}
