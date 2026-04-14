'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { usersApi } from '@/lib/api/users.api';
import { branchesApi } from '@/lib/api/branches.api';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { PageSpinner } from '@/components/ui/spinner';
import { Plus, Search } from 'lucide-react';
import { USER_ROLES, ROLE_LABELS } from '@/lib/utils/constants';
import { formatDate } from '@/lib/utils/format';
import type { User } from '@/lib/types';

export default function UsersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: branchesApi.list });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    email: string; fullName: string; password: string; role: string; phone?: string; branchId?: string;
  }>();

  const createMut = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created');
      setOpen(false);
      reset();
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const filtered = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage platform users and their roles"
        action={<Button onClick={() => { reset(); setOpen(true); }}><Plus className="w-4 h-4" /> Add User</Button>}
      />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableEmpty message="No users found" />}
            {filtered.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold">
                      {user.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{user.fullName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{ROLE_LABELS[user.role] || user.role}</Badge>
                </TableCell>
                <TableCell className="text-gray-500">{user.branch?.name || '—'}</TableCell>
                <TableCell className="text-gray-500">{formatDate(user.lastLoginAt)}</TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? 'success' : 'secondary'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New User</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createMut.mutateAsync(d))}>
            <DialogBody>
              <Input label="Full Name" error={errors.fullName?.message} {...register('fullName', { required: 'Required' })} />
              <Input label="Email" type="email" error={errors.email?.message} {...register('email', { required: 'Required' })} />
              <Input label="Password" type="password" error={errors.password?.message} {...register('password', { required: 'Required', minLength: { value: 6, message: 'Min 6 chars' } })} />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Role"
                  options={USER_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] || r }))}
                  placeholder="Select role"
                  {...register('role', { required: 'Required' })}
                />
                <Select
                  label="Branch"
                  options={branches.map((b) => ({ value: b.id, label: b.name }))}
                  placeholder="All branches"
                  {...register('branchId')}
                />
              </div>
              <Input label="Phone" placeholder="0300-1234567" {...register('phone')} />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Create User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
