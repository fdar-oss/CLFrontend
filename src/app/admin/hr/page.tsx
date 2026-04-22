'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { hrApi } from '@/lib/api/hr.api';
import { useBranchStore } from '@/lib/stores/branch.store';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageSpinner } from '@/components/ui/spinner';
import { Plus, CheckCircle, XCircle, Trash2, Calendar, DollarSign, Clock, Gift, Settings, Printer, Undo2 } from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime, formatTime } from '@/lib/utils/format';
import { format, addDays, startOfWeek } from 'date-fns';
import type { Employee, Leave } from '@/lib/types';

const SALARY_TYPES = ['MONTHLY', 'DAILY', 'HOURLY'];
const LEAVE_TYPES = ['ANNUAL', 'SICK', 'CASUAL', 'MATERNITY', 'PATERNITY', 'UNPAID'];
const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'HOLIDAY', 'LEAVE'];

// ─── Employees Tab ────────────────────────────────────────────────────────────

function EmployeesTab() {
  const qc = useQueryClient();
  const { activeBranch } = useBranchStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', activeBranch?.id],
    queryFn: () => hrApi.listEmployees(activeBranch?.id),
  });

  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: hrApi.listDepartments });
  const { data: designations = [] } = useQuery({ queryKey: ['designations'], queryFn: hrApi.listDesignations });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    fullName: string; employeeCode: string; phone?: string; email?: string; cnic?: string;
    joiningDate: string; salaryType: string; baseSalary: number;
    departmentId?: string; designationId?: string; bankAccount?: string; bankName?: string;
  }>();

  const createMut = useMutation({
    mutationFn: (data: Parameters<typeof hrApi.createEmployee>[0]) => hrApi.createEmployee({ ...data, branchId: activeBranch?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee added'); closeDialog(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) => hrApi.updateEmployee(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee updated'); closeDialog(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  function openCreate() {
    setEditing(null);
    reset({ joiningDate: new Date().toISOString().slice(0, 10), salaryType: 'MONTHLY', baseSalary: 0 });
    setOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditing(emp);
    reset({
      fullName: emp.fullName, employeeCode: emp.employeeCode,
      phone: emp.phone || '', email: emp.email || '', cnic: emp.cnic || '',
      joiningDate: emp.joiningDate.slice(0, 10), salaryType: emp.salaryType,
      baseSalary: emp.baseSalary, bankAccount: emp.bankAccount || '', bankName: emp.bankName || '',
    });
    setOpen(true);
  }

  function closeDialog() { setOpen(false); setEditing(null); reset(); }

  async function onSubmit(data: Parameters<typeof createMut.mutateAsync>[0]) {
    if (editing) await updateMut.mutateAsync({ id: editing.id, data });
    else await createMut.mutateAsync(data);
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate} disabled={!activeBranch}><Plus className="w-4 h-4" /> Add Employee</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 && <TableEmpty message="No employees found" />}
            {employees.map((emp) => (
              <TableRow key={emp.id} className="cursor-pointer" onClick={() => openEdit(emp)}>
                <TableCell>
                  <p className="font-medium">{emp.fullName}</p>
                  {emp.phone && <p className="text-xs text-gray-400">{emp.phone}</p>}
                </TableCell>
                <TableCell className="font-mono text-sm text-gray-500">{emp.employeeCode}</TableCell>
                <TableCell className="text-gray-500 text-sm">{emp.department?.name || '—'}</TableCell>
                <TableCell className="text-gray-500 text-sm">{emp.designation?.name || '—'}</TableCell>
                <TableCell>
                  <p className="font-medium">{formatCurrency(emp.baseSalary)}</p>
                  <p className="text-xs text-gray-400">{emp.salaryType}</p>
                </TableCell>
                <TableCell className="text-gray-500 text-sm">{formatDate(emp.joiningDate)}</TableCell>
                <TableCell>
                  <Badge variant={emp.isActive ? 'success' : 'secondary'}>{emp.isActive ? 'Active' : 'Terminated'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Employee' : 'New Employee'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Full Name" error={errors.fullName?.message} {...register('fullName', { required: 'Required' })} />
                <Input label="Employee Code" error={errors.employeeCode?.message} {...register('employeeCode', { required: 'Required' })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Phone" {...register('phone')} />
                <Input label="CNIC" placeholder="12345-1234567-1" {...register('cnic')} />
              </div>
              <Input label="Email" type="email" {...register('email')} />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Department"
                  options={departments.map((d) => ({ value: d.id, label: d.name }))}
                  placeholder="Select"
                  {...register('departmentId')}
                />
                <Select
                  label="Designation"
                  options={designations.map((d) => ({ value: d.id, label: d.name }))}
                  placeholder="Select"
                  {...register('designationId')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Joining Date" type="date" error={errors.joiningDate?.message} {...register('joiningDate', { required: 'Required' })} />
                <Select
                  label="Salary Type"
                  options={SALARY_TYPES.map((s) => ({ value: s, label: s }))}
                  {...register('salaryType')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Base Salary (₨)" type="number" step="0.01" {...register('baseSalary', { valueAsNumber: true })} />
                <Input label="Bank Name" {...register('bankName')} />
              </div>
              <Input label="Bank Account" {...register('bankAccount')} />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>{editing ? 'Update' : 'Add'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Leaves Tab ───────────────────────────────────────────────────────────────

function LeavesTab() {
  const qc = useQueryClient();
  const { activeBranch } = useBranchStore();
  const [open, setOpen] = useState(false);

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => hrApi.getLeaves(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', activeBranch?.id],
    queryFn: () => hrApi.listEmployees(activeBranch?.id),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    employeeId: string; type: string; startDate: string; endDate: string; reason: string;
  }>();

  const applyMut = useMutation({
    mutationFn: hrApi.applyLeave,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); toast.success('Leave applied'); setOpen(false); reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const approveMut = useMutation({
    mutationFn: hrApi.approveLeave,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); toast.success('Leave approved'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const rejectMut = useMutation({
    mutationFn: hrApi.rejectLeave,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); toast.success('Leave rejected'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { reset({ type: 'ANNUAL' }); setOpen(true); }}><Plus className="w-4 h-4" /> Apply Leave</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaves.length === 0 && <TableEmpty message="No leave requests" />}
            {leaves.map((leave: Leave) => (
              <TableRow key={leave.id}>
                <TableCell className="font-medium">{leave.employee.fullName}</TableCell>
                <TableCell><Badge variant="secondary">{leave.type}</Badge></TableCell>
                <TableCell className="text-gray-500 text-sm">{formatDate(leave.startDate)}</TableCell>
                <TableCell className="text-gray-500 text-sm">{formatDate(leave.endDate)}</TableCell>
                <TableCell className="text-gray-500 text-sm max-w-[200px] truncate">{leave.reason}</TableCell>
                <TableCell>
                  <Badge variant={leave.status === 'APPROVED' ? 'success' : leave.status === 'REJECTED' ? 'destructive' : 'warning'}>
                    {leave.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {leave.status === 'PENDING' && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => approveMut.mutate(leave.id)}>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => rejectMut.mutate(leave.id)}>
                        <XCircle className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apply Leave</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => applyMut.mutateAsync(d))}>
            <DialogBody>
              <Select
                label="Employee"
                options={employees.map((e) => ({ value: e.id, label: e.fullName }))}
                placeholder="Select employee"
                error={errors.employeeId?.message}
                {...register('employeeId', { required: 'Required' })}
              />
              <Select
                label="Leave Type"
                options={LEAVE_TYPES.map((t) => ({ value: t, label: t }))}
                {...register('type', { required: 'Required' })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input label="From Date" type="date" error={errors.startDate?.message} {...register('startDate', { required: 'Required' })} />
                <Input label="To Date" type="date" error={errors.endDate?.message} {...register('endDate', { required: 'Required' })} />
              </div>
              <Input label="Reason" error={errors.reason?.message} {...register('reason', { required: 'Required' })} />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Apply</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Payroll Tab ──────────────────────────────────────────────────────────────

function PayrollTab() {
  const qc = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [payStub, setPayStub] = useState<any>(null);

  const { data: periods = [], isLoading } = useQuery({ queryKey: ['payroll-periods'], queryFn: hrApi.getPayrollPeriods });
  const { data: entries = [] } = useQuery({
    queryKey: ['payroll-entries', selectedPeriod],
    queryFn: () => hrApi.getPayrollEntries(selectedPeriod),
    enabled: !!selectedPeriod,
  });

  const generateMut = useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) => hrApi.generatePayroll(month, year),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll-periods'] }); toast.success('Payroll generated'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const approveMut = useMutation({
    mutationFn: hrApi.approvePayroll,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll-periods'] }); toast.success('Payroll approved'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const now = new Date();

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button
          onClick={() => generateMut.mutate({ month: now.getMonth() + 1, year: now.getFullYear() })}
          loading={generateMut.isPending}
        >
          Generate {now.toLocaleString('default', { month: 'long' })} Payroll
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Periods List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-sm text-gray-700">Payroll Periods</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {periods.length === 0 && <p className="text-center text-gray-400 text-sm py-6">No periods yet</p>}
            {periods.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPeriod(p.id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selectedPeriod === p.id ? 'bg-brand-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{new Date(p.year, p.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                  <Badge variant={p.status === 'APPROVED' ? 'success' : p.status === 'PROCESSED' ? 'info' : 'secondary'} >
                    {p.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{p._count?.entries ?? 0} employees</p>
              </button>
            ))}
          </div>
        </div>

        {/* Entries */}
        <div className="lg:col-span-2">
          {selectedPeriod ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-700">Payroll Entries</h3>
                {periods.find((p) => p.id === selectedPeriod)?.status === 'DRAFT' && (
                  <Button size="sm" onClick={() => approveMut.mutate(selectedPeriod)} loading={approveMut.isPending}>
                    Approve Payroll
                  </Button>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Base</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 && <TableEmpty message="No entries" />}
                  {entries.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{e.employee.fullName}</p>
                        <p className="text-xs text-gray-400">{e.employee.employeeCode}</p>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">{e.daysWorked || '—'}d</TableCell>
                      <TableCell className="text-gray-500">{formatCurrency(e.baseSalary)}</TableCell>
                      <TableCell className="text-purple-600">{Number(e.overtimePay || e.overtime || 0) > 0 ? formatCurrency(e.overtimePay || e.overtime) : '—'}</TableCell>
                      <TableCell className="text-red-600">{Number(e.totalDeductions || e.deductions || 0) > 0 ? formatCurrency(e.totalDeductions || e.deductions) : '—'}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(e.netSalary)}</TableCell>
                      <TableCell>
                        {e.payStubData && (
                          <Button size="sm" variant="ghost" onClick={() => setPayStub(e)}>
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-400">
              Select a payroll period to view entries
            </div>
          )}
        </div>
      </div>

      {payStub && <PayStubView entry={payStub} onClose={() => setPayStub(null)} />}
    </div>
  );
}

// ─── Scheduling Tab ──────────────────────────────────────────────────────────

const SHIFT_TYPES = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'SPLIT'];
const SHIFT_TIMES: Record<string, { start: string; end: string }> = {
  MORNING: { start: '08:00', end: '16:00' },
  AFTERNOON: { start: '12:00', end: '20:00' },
  EVENING: { start: '16:00', end: '00:00' },
  NIGHT: { start: '20:00', end: '04:00' },
  SPLIT: { start: '10:00', end: '22:00' },
};
const SHIFT_COLORS: Record<string, string> = {
  MORNING: 'bg-amber-100 text-amber-800 border-amber-200',
  AFTERNOON: 'bg-blue-100 text-blue-800 border-blue-200',
  EVENING: 'bg-purple-100 text-purple-800 border-purple-200',
  NIGHT: 'bg-gray-700 text-white border-gray-600',
  SPLIT: 'bg-teal-100 text-teal-800 border-teal-200',
};

function SchedulingTab() {
  const qc = useQueryClient();
  const { activeBranch } = useBranchStore();
  const [open, setOpen] = useState(false);
  const [weekStart, setWeekStart] = useState(() => format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));

  const weekEnd = format(addDays(new Date(weekStart), 6), 'yyyy-MM-dd');
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(weekStart), i);
    return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE'), dayNum: format(d, 'dd MMM') };
  });

  const { data: employees = [] } = useQuery({ queryKey: ['employees', activeBranch?.id], queryFn: () => hrApi.listEmployees(activeBranch?.id) });
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts', activeBranch?.id, weekStart, weekEnd],
    queryFn: () => hrApi.listShifts({ branchId: activeBranch?.id, from: weekStart, to: weekEnd }),
    enabled: !!activeBranch?.id,
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm<{
    employeeId: string; date: string; type: string; startTime: string; endTime: string; notes?: string;
  }>();

  const selectedType = watch('type');

  const createMut = useMutation({
    mutationFn: (data: any) => hrApi.createShift({ ...data, branchId: activeBranch!.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shifts'] }); toast.success('Shift scheduled'); setOpen(false); reset(); },
    onError: (e: unknown) => toast.error((e as any)?.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: hrApi.deleteShift,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shifts'] }); toast.success('Shift removed'); },
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(format(addDays(new Date(weekStart), -7), 'yyyy-MM-dd'))} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">← Prev</button>
          <span className="text-sm font-medium text-gray-700">{days[0].dayNum} — {days[6].dayNum}</span>
          <button onClick={() => setWeekStart(format(addDays(new Date(weekStart), 7), 'yyyy-MM-dd'))} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Next →</button>
          <button onClick={() => setWeekStart(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))} className="px-3 py-1.5 text-sm text-brand-600 hover:text-brand-800 font-medium">Today</button>
        </div>
        <Button onClick={() => { reset({ date: days[0].date, type: 'MORNING', startTime: '08:00', endTime: '16:00' }); setOpen(true); }}>
          <Plus className="w-4 h-4" /> Add Shift
        </Button>
      </div>

      {/* Weekly roster grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-8 border-b border-gray-200">
          <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</div>
          {days.map(d => (
            <div key={d.date} className={`px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide ${d.date === format(new Date(), 'yyyy-MM-dd') ? 'bg-brand-50 text-brand-700' : 'bg-gray-50 text-gray-500'}`}>
              <div>{d.label}</div>
              <div className="text-[10px] font-normal">{d.dayNum}</div>
            </div>
          ))}
        </div>

        {employees.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Add employees first to start scheduling</div>
        ) : (
          employees.map((emp: any) => {
            const empShifts: any[] = (shifts as any[]).filter((s: any) => s.employeeId === emp.id);
            return (
              <div key={emp.id} className="grid grid-cols-8 border-b border-gray-100 last:border-0">
                <div className="px-3 py-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold shrink-0">
                    {emp.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{emp.fullName}</p>
                    <p className="text-[10px] text-gray-400">{emp.designation?.name || emp.employeeCode}</p>
                  </div>
                </div>
                {days.map(d => {
                  const dayShifts = empShifts.filter((s: any) => s.date?.startsWith(d.date));
                  return (
                    <div key={d.date} className={`px-1 py-2 flex flex-col gap-1 ${d.date === format(new Date(), 'yyyy-MM-dd') ? 'bg-brand-50/30' : ''}`}>
                      {dayShifts.map((s: any) => (
                        <div key={s.id} className={`text-[10px] px-1.5 py-1 rounded border ${SHIFT_COLORS[s.type] || 'bg-gray-100 text-gray-700 border-gray-200'} group relative`}>
                          <p className="font-semibold">{s.type}</p>
                          <p>{s.startTime}–{s.endTime}</p>
                          <button
                            onClick={() => deleteMut.mutate(s.id)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full items-center justify-center text-[8px] hidden group-hover:flex"
                          >×</button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Add shift dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Shift</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createMut.mutateAsync(d))}>
            <DialogBody>
              <Select label="Employee" options={employees.map((e: any) => ({ value: e.id, label: e.fullName }))} placeholder="Select employee" {...register('employeeId', { required: 'Required' })} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Date" type="date" {...register('date', { required: 'Required' })} />
                <Select
                  label="Shift Type"
                  options={SHIFT_TYPES.map(t => ({ value: t, label: t }))}
                  {...register('type', { required: 'Required' })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Start Time" type="time" {...register('startTime', { required: 'Required' })} />
                <Input label="End Time" type="time" {...register('endTime', { required: 'Required' })} />
              </div>
              <Input label="Notes (optional)" {...register('notes')} />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Schedule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Labor Cost Tab ──────────────────────────────────────────────────────────

function LaborCostTab() {
  const { activeBranch } = useBranchStore();
  const [from, setFrom] = useState(() => format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [to, setTo] = useState(() => format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6), 'yyyy-MM-dd'));

  const { data: labor, isLoading } = useQuery({
    queryKey: ['labor-summary', activeBranch?.id, from, to],
    queryFn: () => hrApi.getLaborSummary(from, to, activeBranch?.id),
    enabled: !!from && !!to,
  });

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard', activeBranch?.id],
    queryFn: () => import('@/lib/api/finance.api').then(m => m.financeApi.getDashboard(activeBranch?.id)),
  });

  if (isLoading) return <PageSpinner />;

  const totalLabor = labor?.totalLaborCost ?? 0;
  const totalHours = labor?.totalHours ?? 0;
  const totalShifts = labor?.totalShifts ?? 0;
  const employees: any[] = labor?.employees ?? [];
  const weekRevenue = dashboard?.week?.revenue ?? dashboard?.today?.revenue ?? 0;
  const laborPct = weekRevenue > 0 ? (totalLabor / weekRevenue) * 100 : 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Labor Cost</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalLabor)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Hours</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalHours.toFixed(1)}h</p>
          <p className="text-xs text-gray-400">{totalShifts} shifts</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Revenue (period)</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(weekRevenue)}</p>
        </div>
        <div className={`rounded-xl border p-4 ${laborPct <= 30 ? 'bg-green-50 border-green-200' : laborPct <= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Labor % of Revenue</p>
          <p className={`text-2xl font-bold mt-1 ${laborPct <= 30 ? 'text-green-700' : laborPct <= 40 ? 'text-amber-700' : 'text-red-700'}`}>
            {laborPct.toFixed(1)}%
          </p>
          <p className="text-[10px] text-gray-400">Target: under 30%</p>
        </div>
      </div>

      {/* Per-employee breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Shifts</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Hourly Rate</TableHead>
              <TableHead>Labor Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 && <TableEmpty message="No scheduled shifts in this period" />}
            {employees.map((e: any, i: number) => (
              <TableRow key={i}>
                <TableCell>
                  <p className="font-medium">{e.name}</p>
                  <p className="text-xs text-gray-400">{e.code} · {e.salaryType}</p>
                </TableCell>
                <TableCell className="text-gray-600">{e.shifts}</TableCell>
                <TableCell className="text-gray-600">{e.totalHours.toFixed(1)}h</TableCell>
                <TableCell className="text-gray-600">{formatCurrency(e.hourlyRate)}/h</TableCell>
                <TableCell className="font-bold text-red-600">{formatCurrency(e.laborCost)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Attendance Tab ──────────────────────────────────────────────────────────

function AttendanceTab() {
  const qc = useQueryClient();
  const { activeBranch } = useBranchStore();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [dateFilter, setDateFilter] = useState('');

  const { data: employees = [] } = useQuery({ queryKey: ['employees', activeBranch?.id], queryFn: () => hrApi.listEmployees(activeBranch?.id) });

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ['attendance', activeBranch?.id, dateFilter || `${year}-${month}`],
    queryFn: () => {
      if (dateFilter) return hrApi.getAttendance({ branchId: activeBranch?.id, from: dateFilter, to: dateFilter });
      const from = `${year}-${String(month).padStart(2, '0')}-01`;
      const to = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
      return hrApi.getAttendance({ branchId: activeBranch?.id, from, to });
    },
  });

  const { data: summary = [] } = useQuery({
    queryKey: ['attendance-summary', month, year],
    queryFn: () => hrApi.getAttendanceSummary(month, year),
  });

  const checkInMut = useMutation({
    mutationFn: (empId: string) => hrApi.checkIn(empId, activeBranch!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); toast.success('Clocked in'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const checkOutMut = useMutation({
    mutationFn: (empId: string) => hrApi.checkOut(empId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); toast.success('Clocked out'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const forgiveMut = useMutation({
    mutationFn: (attId: string) => hrApi.forgiveLateness(attId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); toast.success('Late forgiven'); },
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      {/* Summary cards */}
      {summary.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="bg-gray-50 px-5 py-2.5 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Monthly Summary — {format(new Date(year, month - 1), 'MMMM yyyy')}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Present</TableHead>
                <TableHead>Absent</TableHead>
                <TableHead>Late</TableHead>
                <TableHead>Leave</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Overtime</TableHead>
                <TableHead>Late Deductions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.map((s: any) => (
                <TableRow key={s.employeeId}>
                  <TableCell className="font-medium">{s.fullName}</TableCell>
                  <TableCell className="text-green-600 font-medium">{s.daysPresent}</TableCell>
                  <TableCell className={s.daysAbsent > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>{s.daysAbsent}</TableCell>
                  <TableCell className={s.daysLate > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}>{s.daysLate}</TableCell>
                  <TableCell className="text-blue-600">{s.daysOnLeave}</TableCell>
                  <TableCell className="text-gray-600">{s.totalHours}h</TableCell>
                  <TableCell className="text-purple-600">{s.totalOvertime}h</TableCell>
                  <TableCell className={s.totalLateDeductions > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>{formatCurrency(s.totalLateDeductions)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Filters + Clock in/out */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="text-sm border border-gray-300 rounded-lg px-3 py-2">
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{format(new Date(2026, i), 'MMMM')}</option>)}
          </select>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="text-sm border border-gray-300 rounded-lg px-3 py-2 w-20" />
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-2" placeholder="Filter by date" />
          {dateFilter && <button onClick={() => setDateFilter('')} className="text-xs text-brand-600 underline">Clear date</button>}
        </div>
        <div className="flex gap-2">
          <select id="clock-emp" className="text-sm border border-gray-300 rounded-lg px-3 py-2">
            <option value="">Select employee…</option>
            {employees.map((e: any) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
          <Button size="sm" onClick={() => { const el = document.getElementById('clock-emp') as HTMLSelectElement; if (el.value) checkInMut.mutate(el.value); }}>
            <Clock className="w-3.5 h-3.5" /> Clock In
          </Button>
          <Button size="sm" variant="outline" onClick={() => { const el = document.getElementById('clock-emp') as HTMLSelectElement; if (el.value) checkOutMut.mutate(el.value); }}>
            <Clock className="w-3.5 h-3.5" /> Clock Out
          </Button>
        </div>
      </div>

      {/* Daily records */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Clock In</TableHead>
              <TableHead>Clock Out</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Late</TableHead>
              <TableHead>Deduction</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendance.length === 0 && <TableEmpty message="No attendance records" />}
            {(attendance as any[]).map((a: any) => (
              <TableRow key={a.id}>
                <TableCell className="text-sm">{formatDate(a.date)}</TableCell>
                <TableCell className="font-medium text-sm">{a.employee?.fullName}</TableCell>
                <TableCell className="text-sm">{a.checkIn ? formatTime(a.checkIn) : '—'}</TableCell>
                <TableCell className="text-sm">{a.checkOut ? formatTime(a.checkOut) : '—'}</TableCell>
                <TableCell className="text-xs text-gray-500">{a.scheduledStart || '—'} – {a.scheduledEnd || '—'}</TableCell>
                <TableCell className="text-sm">{a.hoursWorked ? `${Number(a.hoursWorked).toFixed(1)}h` : '—'}</TableCell>
                <TableCell className={a.lateMinutes > 0 ? 'text-amber-600 font-medium text-sm' : 'text-gray-400 text-sm'}>
                  {a.lateMinutes > 0 ? `${a.lateMinutes}min` : '—'}
                </TableCell>
                <TableCell className={Number(a.lateDeduction) > 0 && !a.lateForgiven ? 'text-red-600 font-medium text-sm' : 'text-gray-400 text-sm'}>
                  {Number(a.lateDeduction) > 0 ? (a.lateForgiven ? <span className="line-through">{formatCurrency(a.lateDeduction)}</span> : formatCurrency(a.lateDeduction)) : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={a.status === 'PRESENT' ? 'success' : a.status === 'LATE' ? 'warning' : a.status === 'ABSENT' ? 'destructive' : 'secondary'}>
                    {a.status}{a.lateForgiven ? ' ✓' : ''}
                  </Badge>
                </TableCell>
                <TableCell>
                  {a.status === 'LATE' && !a.lateForgiven && Number(a.lateDeduction) > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => forgiveMut.mutate(a.id)} title="Forgive late">
                      <Undo2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Advances Tab ────────────────────────────────────────────────────────────

function AdvancesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => hrApi.listEmployees() });
  const { data: advances = [], isLoading } = useQuery({ queryKey: ['advances'], queryFn: () => hrApi.listAdvances() });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    employeeId: string; amount: number; monthlyInstallment?: number; reason?: string; givenDate: string;
  }>();

  const createMut = useMutation({
    mutationFn: hrApi.createAdvance,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['advances'] }); toast.success('Advance recorded'); setOpen(false); reset(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <PageSpinner />;

  const active = (advances as any[]).filter((a: any) => a.status === 'ACTIVE');
  const totalOutstanding = active.reduce((s: number, a: any) => s + Number(a.remainingAmount), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2">
            <p className="text-xs text-red-600">Total Outstanding</p>
            <p className="text-lg font-bold text-red-700">{formatCurrency(totalOutstanding)}</p>
          </div>
          <span className="text-sm text-gray-500">{active.length} active advance{active.length !== 1 ? 's' : ''}</span>
        </div>
        <Button onClick={() => { reset({ givenDate: format(new Date(), 'yyyy-MM-dd') }); setOpen(true); }}>
          <Plus className="w-4 h-4" /> Record Advance
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Installment</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {advances.length === 0 && <TableEmpty message="No salary advances" />}
            {(advances as any[]).map((a: any) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.employee?.fullName}</TableCell>
                <TableCell className="text-sm text-gray-500">{formatDate(a.givenDate)}</TableCell>
                <TableCell className="font-medium">{formatCurrency(a.amount)}</TableCell>
                <TableCell className={Number(a.remainingAmount) > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>{formatCurrency(a.remainingAmount)}</TableCell>
                <TableCell className="text-sm text-gray-500">{a.monthlyInstallment ? `${formatCurrency(a.monthlyInstallment)}/mo` : 'Full'}</TableCell>
                <TableCell className="text-sm text-gray-500">{a.reason || '—'}</TableCell>
                <TableCell><Badge variant={a.status === 'ACTIVE' ? 'warning' : 'success'}>{a.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Salary Advance</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createMut.mutateAsync(d))}>
            <DialogBody>
              <Select label="Employee" options={employees.map((e: any) => ({ value: e.id, label: e.fullName }))} placeholder="Select employee" error={errors.employeeId?.message} {...register('employeeId', { required: 'Required' })} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Amount (₨)" type="number" step="0.01" error={errors.amount?.message} {...register('amount', { required: 'Required', valueAsNumber: true })} />
                <Input label="Monthly Installment (₨)" type="number" step="0.01" placeholder="Leave blank for full deduction" {...register('monthlyInstallment', { valueAsNumber: true })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Date Given" type="date" {...register('givenDate', { required: 'Required' })} />
                <Input label="Reason" placeholder="e.g. Emergency" {...register('reason')} />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Record</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Holidays Tab ────────────────────────────────────────────────────────────

function HolidaysTab() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [rate, setRate] = useState('1.5');

  const { data: holidays = [], isLoading } = useQuery({ queryKey: ['holidays'], queryFn: () => hrApi.listHolidays() });

  const createMut = useMutation({
    mutationFn: () => hrApi.createHoliday({ date, name, overtimeRate: parseFloat(rate) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['holidays'] }); toast.success('Holiday added'); setName(''); setDate(''); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: hrApi.deleteHoliday,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['holidays'] }); toast.success('Deleted'); },
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Mark holidays for overtime calculation. Staff working on these days gets the specified overtime rate.</p>

      <div className="flex items-end gap-3 mb-6">
        <Input label="Holiday Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Eid ul Fitr" />
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Overtime Rate</label>
          <select value={rate} onChange={(e) => setRate(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-2">
            <option value="1.5">1.5× (standard holiday)</option>
            <option value="2">2× (major holiday)</option>
            <option value="1">1× (regular rate)</option>
          </select>
        </div>
        <Button onClick={() => name && date && createMut.mutate()} disabled={!name || !date}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Holiday</TableHead>
              <TableHead>Overtime Rate</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidays.length === 0 && <TableEmpty message="No holidays defined" />}
            {(holidays as any[]).map((h: any) => (
              <TableRow key={h.id}>
                <TableCell className="font-medium">{formatDate(h.date)}</TableCell>
                <TableCell>{h.name}</TableCell>
                <TableCell><Badge variant="info">{Number(h.overtimeRate)}×</Badge></TableCell>
                <TableCell>
                  <button onClick={() => deleteMut.mutate(h.id)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Pay Stub View ───────────────────────────────────────────────────────────

function PayStubView({ entry, onClose }: { entry: any; onClose: () => void }) {
  const d = entry.payStubData || {};
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Pay Stub — {d.employeeName}</span>
            <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="w-3.5 h-3.5" /> Print</Button>
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div id="pay-stub-print" className="text-sm space-y-4">
            <div className="text-center border-b border-gray-200 pb-3">
              <p className="font-bold text-lg">THE COFFEE LAB</p>
              <p className="text-gray-500 text-xs">PAY STUB — {format(new Date(d.year, d.month - 1), 'MMMM yyyy')}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 rounded-lg p-3">
              <div><span className="text-gray-500">Employee:</span> <span className="font-medium">{d.employeeName}</span></div>
              <div><span className="text-gray-500">Code:</span> <span className="font-medium">{d.employeeCode}</span></div>
              <div><span className="text-gray-500">Daily Rate:</span> <span className="font-medium">{formatCurrency(d.dailySalary)}</span></div>
              <div><span className="text-gray-500">Hourly Rate:</span> <span className="font-medium">{formatCurrency(d.hourlyRate)}</span></div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Earnings</p>
              <div className="space-y-1">
                <div className="flex justify-between"><span>Base Salary</span><span className="font-medium">{formatCurrency(d.baseSalary)}</span></div>
                {d.overtimePay > 0 && <div className="flex justify-between"><span>Overtime ({d.totalOvertimeHours}h)</span><span className="font-medium">{formatCurrency(d.overtimePay)}</span></div>}
                {d.earnedPaidDays !== undefined && <div className="flex justify-between text-gray-500"><span>Paid Days Earned</span><span>{d.earnedPaidDays} of {d.paidOffDays}</span></div>}
                {d.extraDaysPay > 0 && <div className="flex justify-between"><span>Unused Off Days ({d.unusedPaidDays} days)</span><span className="font-medium">{formatCurrency(d.extraDaysPay)}</span></div>}
                <div className="flex justify-between font-bold border-t pt-1"><span>Gross Salary</span><span className="text-green-700">{formatCurrency(d.grossSalary)}</span></div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Deductions</p>
              <div className="space-y-1">
                {d.lateDeductions > 0 && <div className="flex justify-between text-red-600"><span>Late Deductions ({d.daysLate} days)</span><span>−{formatCurrency(d.lateDeductions)}</span></div>}
                {d.absentDeductions > 0 && <div className="flex justify-between text-red-600"><span>Absent Deductions ({d.daysAbsent} days)</span><span>−{formatCurrency(d.absentDeductions)}</span></div>}
                {d.unearnedLeaveDeduction > 0 && <div className="flex justify-between text-red-600"><span>Unearned Leave Taken ({d.unearnedLeaveTaken} days)</span><span>−{formatCurrency(d.unearnedLeaveDeduction)}</span></div>}
                {d.advanceDeduction > 0 && <div className="flex justify-between text-red-600"><span>Advance Recovery</span><span>−{formatCurrency(d.advanceDeduction)}</span></div>}
                <div className="flex justify-between font-bold border-t pt-1"><span>Total Deductions</span><span className="text-red-700">−{formatCurrency(d.totalDeductions)}</span></div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Attendance</p>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="bg-green-50 rounded-lg p-2 text-center"><p className="font-bold text-green-700">{d.daysPresent}</p><p className="text-green-600">Present</p></div>
                <div className="bg-red-50 rounded-lg p-2 text-center"><p className="font-bold text-red-700">{d.daysAbsent}</p><p className="text-red-600">Absent</p></div>
                <div className="bg-amber-50 rounded-lg p-2 text-center"><p className="font-bold text-amber-700">{d.daysLate}</p><p className="text-amber-600">Late</p></div>
                <div className="bg-blue-50 rounded-lg p-2 text-center"><p className="font-bold text-blue-700">{d.daysOnLeave}</p><p className="text-blue-600">Leave</p></div>
              </div>
            </div>

            <div className={`rounded-xl p-4 text-center ${d.netSalary >= d.baseSalary ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Net Pay</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(d.netSalary)}</p>
              {d.bankName && <p className="text-xs text-gray-400 mt-1">{d.bankName} · ****{d.bankAccount?.slice(-4)}</p>}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HRPage() {
  return (
    <div>
      <PageHeader
        title="Human Resources"
        description="Employees, attendance, scheduling, payroll, and more"
      />
      <Tabs defaultValue="employees">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="attendance"><Clock className="w-4 h-4 mr-1" /> Attendance</TabsTrigger>
          <TabsTrigger value="schedule"><Calendar className="w-4 h-4 mr-1" /> Schedule</TabsTrigger>
          <TabsTrigger value="advances"><DollarSign className="w-4 h-4 mr-1" /> Advances</TabsTrigger>
          <TabsTrigger value="holidays"><Gift className="w-4 h-4 mr-1" /> Holidays</TabsTrigger>
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="labor">Labor Cost</TabsTrigger>
        </TabsList>
        <TabsContent value="employees"><EmployeesTab /></TabsContent>
        <TabsContent value="attendance"><AttendanceTab /></TabsContent>
        <TabsContent value="schedule"><SchedulingTab /></TabsContent>
        <TabsContent value="advances"><AdvancesTab /></TabsContent>
        <TabsContent value="holidays"><HolidaysTab /></TabsContent>
        <TabsContent value="leaves"><LeavesTab /></TabsContent>
        <TabsContent value="payroll"><PayrollTab /></TabsContent>
        <TabsContent value="labor"><LaborCostTab /></TabsContent>
      </Tabs>
    </div>
  );
}
