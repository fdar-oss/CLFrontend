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
import { Plus, CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HRPage() {
  return (
    <div>
      <PageHeader
        title="Human Resources"
        description="Employees, attendance, leaves, and payroll"
      />
      <Tabs defaultValue="employees">
        <TabsList className="mb-6">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>
        <TabsContent value="employees"><EmployeesTab /></TabsContent>
        <TabsContent value="leaves"><LeavesTab /></TabsContent>
        <TabsContent value="payroll"><PayrollTab /></TabsContent>
      </Tabs>
    </div>
  );
}
