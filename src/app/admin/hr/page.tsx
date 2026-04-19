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
import { Plus, CheckCircle, XCircle, Trash2, Calendar, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
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
                    <TableHead>Base</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Bank</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 && <TableEmpty message="No entries" />}
                  {entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{e.employee.fullName}</p>
                        <p className="text-xs text-gray-400">{e.employee.employeeCode}</p>
                      </TableCell>
                      <TableCell className="text-gray-500">{formatCurrency(e.baseSalary)}</TableCell>
                      <TableCell className="text-gray-500">{formatCurrency(e.overtime)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(e.netSalary)}</TableCell>
                      <TableCell className="text-gray-500 text-xs">{e.employee.bankName || '—'}</TableCell>
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HRPage() {
  return (
    <div>
      <PageHeader
        title="Human Resources"
        description="Employees, scheduling, attendance, leaves, and payroll"
      />
      <Tabs defaultValue="employees">
        <TabsList className="mb-6">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="schedule"><Calendar className="w-4 h-4 mr-1.5" /> Schedule</TabsTrigger>
          <TabsTrigger value="labor"><DollarSign className="w-4 h-4 mr-1.5" /> Labor Cost</TabsTrigger>
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>
        <TabsContent value="employees"><EmployeesTab /></TabsContent>
        <TabsContent value="schedule"><SchedulingTab /></TabsContent>
        <TabsContent value="labor"><LaborCostTab /></TabsContent>
        <TabsContent value="leaves"><LeavesTab /></TabsContent>
        <TabsContent value="payroll"><PayrollTab /></TabsContent>
      </Tabs>
    </div>
  );
}
