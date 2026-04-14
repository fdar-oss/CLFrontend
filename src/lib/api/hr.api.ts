import api from './axios';
import type { Employee, Department, Designation, AttendanceRecord, Leave, PayrollPeriod, PayrollEntry } from '../types';

export const hrApi = {
  // Employees
  listEmployees: (branchId?: string) =>
    api.get<Employee[]>('/hr/employees', { params: { branchId } }).then((r) => r.data),
  getEmployee: (id: string) => api.get<Employee>(`/hr/employees/${id}`).then((r) => r.data),
  createEmployee: (data: Partial<Employee> & { branchId?: string }) =>
    api.post<Employee>('/hr/employees', data).then((r) => r.data),
  updateEmployee: (id: string, data: Partial<Employee>) =>
    api.patch<Employee>(`/hr/employees/${id}`, data).then((r) => r.data),
  terminateEmployee: (id: string, terminationDate: string) =>
    api.patch(`/hr/employees/${id}/terminate`, { terminationDate }).then((r) => r.data),

  // Departments & Designations
  listDepartments: () => api.get<Department[]>('/hr/departments').then((r) => r.data),
  createDepartment: (name: string) =>
    api.post<Department>('/hr/departments', { name }).then((r) => r.data),
  listDesignations: () => api.get<Designation[]>('/hr/designations').then((r) => r.data),
  createDesignation: (name: string) =>
    api.post<Designation>('/hr/designations', { name }).then((r) => r.data),

  // Attendance
  getAttendance: (params?: Record<string, unknown>) =>
    api.get<AttendanceRecord[]>('/hr/attendance', { params }).then((r) => r.data),
  checkIn: (employeeId: string, branchId: string) =>
    api.post('/hr/attendance/check-in', { employeeId, branchId }).then((r) => r.data),
  checkOut: (employeeId: string) =>
    api.post('/hr/attendance/check-out', { employeeId }).then((r) => r.data),
  markAttendance: (data: { employeeId: string; date: string; status: string; notes?: string }) =>
    api.post('/hr/attendance/mark', data).then((r) => r.data),

  // Leaves
  getLeaves: (params?: Record<string, unknown>) =>
    api.get<Leave[]>('/hr/leaves', { params }).then((r) => r.data),
  applyLeave: (data: { employeeId: string; type: string; startDate: string; endDate: string; reason: string }) =>
    api.post<Leave>('/hr/leaves', data).then((r) => r.data),
  approveLeave: (id: string) => api.patch(`/hr/leaves/${id}/approve`).then((r) => r.data),
  rejectLeave: (id: string) => api.patch(`/hr/leaves/${id}/reject`).then((r) => r.data),

  // Payroll
  getPayrollPeriods: () => api.get<PayrollPeriod[]>('/hr/payroll/periods').then((r) => r.data),
  generatePayroll: (month: number, year: number) =>
    api.post('/hr/payroll/generate', { month, year }).then((r) => r.data),
  getPayrollEntries: (periodId: string) =>
    api.get<PayrollEntry[]>(`/hr/payroll/periods/${periodId}/entries`).then((r) => r.data),
  approvePayroll: (periodId: string) =>
    api.patch(`/hr/payroll/periods/${periodId}/approve`).then((r) => r.data),
};
