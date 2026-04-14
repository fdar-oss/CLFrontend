'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { branchesApi } from '@/lib/api/branches.api';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { PageSpinner } from '@/components/ui/spinner';
import { Plus, Building2, Users, MapPin } from 'lucide-react';
import type { Branch } from '@/lib/types';

export default function BranchesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: branchesApi.list,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    name: string; code: string; address?: string; phone?: string; ntn?: string;
  }>();

  const createMut = useMutation({
    mutationFn: branchesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Branch created');
      setOpen(false);
      reset();
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Branch> }) =>
      branchesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Branch updated');
      setOpen(false);
      setEditing(null);
      reset();
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  function openCreate() {
    setEditing(null);
    reset();
    setOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    reset({ name: branch.name, code: branch.code, address: branch.address || '', phone: branch.phone || '', ntn: branch.ntn || '' });
    setOpen(true);
  }

  async function onSubmit(data: { name: string; code: string; address?: string; phone?: string; ntn?: string }) {
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, data });
    } else {
      await createMut.mutateAsync(data);
    }
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader
        title="Branches"
        description="Manage your restaurant locations"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add Branch
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {branches.map((branch) => (
          <Card key={branch.id} className="p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(branch)}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-brand-600" />
              </div>
              <Badge variant={branch.isActive ? 'success' : 'secondary'}>
                {branch.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <h3 className="font-semibold text-gray-900">{branch.name}</h3>
            <p className="text-xs text-gray-500 mb-3">{branch.code}</p>
            {branch.address && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {branch.address}
              </p>
            )}
            {branch._count && (
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Users className="w-3 h-3" /> {branch._count.users} users
                </span>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Branch' : 'New Branch'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Branch Name"
                  placeholder="Main Branch"
                  error={errors.name?.message}
                  {...register('name', { required: 'Required' })}
                />
                <Input
                  label="Branch Code"
                  placeholder="BR-01"
                  error={errors.code?.message}
                  {...register('code', { required: 'Required' })}
                />
              </div>
              <Input label="Address" placeholder="123 Main Street, Lahore" {...register('address')} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Phone" placeholder="0300-1234567" {...register('phone')} />
                <Input label="NTN" placeholder="1234567-8" {...register('ntn')} />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>{editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
