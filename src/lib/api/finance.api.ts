import api from './axios';
import type { Expense, ExpenseCategory, DailySalesSummary } from '../types';

export const financeApi = {
  // Expenses
  listExpenses: (params?: Record<string, unknown>) =>
    api.get<Expense[]>('/finance/expenses', { params }).then((r) => r.data),
  createExpense: (data: {
    date: string;
    amount: number;
    description: string;
    categoryId: string;
    branchId: string;
  }) => api.post<Expense>('/finance/expenses', data).then((r) => r.data),
  approveExpense: (id: string) =>
    api.patch(`/finance/expenses/${id}/approve`).then((r) => r.data),

  listExpenseCategories: () =>
    api.get<ExpenseCategory[]>('/finance/expense-categories').then((r) => r.data),
  createExpenseCategory: (name: string) =>
    api.post<ExpenseCategory>('/finance/expense-categories', { name }).then((r) => r.data),

  // Dashboard
  getDashboard: (branchId?: string) =>
    api.get('/finance/dashboard', { params: { branchId } }).then((r) => r.data),

  // Daily summaries
  getDailySummaries: (params?: { branchId?: string; from?: string; to?: string }) =>
    api.get<DailySalesSummary[]>('/finance/daily-summaries', { params }).then((r) => r.data),

  // Reports
  getSalesReport: (from: string, to: string, branchId?: string) =>
    api.get('/finance/reports/sales', { params: { from, to, branchId } }).then((r) => r.data),

  getProfitLoss: (from: string, to: string, branchId?: string) =>
    api.get('/finance/reports/profit-loss', { params: { from, to, branchId } }).then((r) => r.data),
};
