'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { fbrApi } from '@/lib/api/fbr.api';
import { useBranchStore } from '@/lib/stores/branch.store';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { PageSpinner } from '@/components/ui/spinner';
import { Plus, RefreshCw, Terminal, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/format';

type FbrTerminal = {
  id: string; terminalId: string; terminalName: string | null;
  isActive: boolean; posId: string | null;
};

type SyncQueueItem = {
  id: string; status: string; attempts: number; error: string | null;
  lastAttemptAt: string | null; createdAt: string;
  order?: { orderNumber: string; total: number } | null;
};

const SYNC_STATUS_BADGE: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'warning'> = {
  PENDING: 'warning',
  PROCESSING: 'default',
  SYNCED: 'success',
  FAILED: 'destructive',
};

export default function FBRPage() {
  const qc = useQueryClient();
  const { activeBranch } = useBranchStore();
  const [terminalOpen, setTerminalOpen] = useState(false);

  const { data: terminals = [], isLoading: loadingTerminals } = useQuery({
    queryKey: ['fbr-terminals', activeBranch?.id],
    queryFn: () => fbrApi.getTerminals(activeBranch!.id),
    enabled: !!activeBranch?.id,
  });

  const { data: syncQueue = [], isLoading: loadingQueue, refetch: refetchQueue, isFetching } = useQuery({
    queryKey: ['fbr-sync-queue'],
    queryFn: fbrApi.getSyncQueue,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    terminalId: string; terminalName?: string; posId?: string;
  }>();

  const registerMut = useMutation({
    mutationFn: (data: { terminalId: string; terminalName?: string; posId?: string }) =>
      fbrApi.registerTerminal({ ...data, branchId: activeBranch!.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fbr-terminals'] });
      toast.success('Terminal registered');
      setTerminalOpen(false);
      reset();
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const submitMut = useMutation({
    mutationFn: fbrApi.submitInvoice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fbr-sync-queue'] });
      toast.success('Invoice submitted to FBR');
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const pending = (syncQueue as SyncQueueItem[]).filter((i) => i.status === 'PENDING').length;
  const failed = (syncQueue as SyncQueueItem[]).filter((i) => i.status === 'FAILED').length;
  const synced = (syncQueue as SyncQueueItem[]).filter((i) => i.status === 'SYNCED').length;

  return (
    <div>
      <PageHeader
        title="FBR Integration"
        description="Federal Board of Revenue POS terminals and invoice sync"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetchQueue()} loading={isFetching}>
              <RefreshCw className="w-4 h-4" /> Refresh Queue
            </Button>
            <Button onClick={() => { reset(); setTerminalOpen(true); }} disabled={!activeBranch}>
              <Plus className="w-4 h-4" /> Register Terminal
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-yellow-50 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pending}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{synced}</p>
              <p className="text-sm text-gray-500">Synced</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{failed}</p>
              <p className="text-sm text-gray-500">Failed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Terminals */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Registered Terminals</h2>
          {!activeBranch && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              Select a branch to view terminals.
            </div>
          )}
          {loadingTerminals && activeBranch && <PageSpinner />}
          <div className="space-y-3">
            {(terminals as FbrTerminal[]).length === 0 && activeBranch && (
              <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-6 text-center text-gray-400 text-sm">
                No terminals registered
              </div>
            )}
            {(terminals as FbrTerminal[]).map((t) => (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center">
                      <Terminal className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.terminalName || t.terminalId}</p>
                      <p className="text-xs font-mono text-gray-400">{t.terminalId}</p>
                      {t.posId && <p className="text-xs text-gray-400">POS: {t.posId}</p>}
                    </div>
                  </div>
                  <Badge variant={t.isActive ? 'success' : 'secondary'}>{t.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sync Queue */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Sync Queue</h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Last Attempt</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(syncQueue as SyncQueueItem[]).length === 0 && <TableEmpty message="Sync queue is empty" />}
                {(syncQueue as SyncQueueItem[]).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">
                      {item.order?.orderNumber || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={SYNC_STATUS_BADGE[item.status] || 'secondary'}>{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">{item.attempts}</TableCell>
                    <TableCell className="text-gray-500 text-xs">
                      {item.lastAttemptAt ? formatDateTime(item.lastAttemptAt) : '—'}
                    </TableCell>
                    <TableCell>
                      {item.error && (
                        <span className="text-xs text-red-600 max-w-[200px] block truncate" title={item.error}>
                          {item.error}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.status === 'FAILED' && item.order && (
                        <Button size="sm" variant="outline" onClick={() => submitMut.mutate(item.id)} loading={submitMut.isPending}>
                          Retry
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Register Terminal Dialog */}
      <Dialog open={terminalOpen} onOpenChange={setTerminalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Register FBR Terminal</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => registerMut.mutateAsync(d))}>
            <DialogBody>
              <Input
                label="Terminal ID"
                placeholder="FBR-assigned terminal ID"
                error={errors.terminalId?.message}
                {...register('terminalId', { required: 'Required' })}
              />
              <Input label="Terminal Name" placeholder="e.g. Main Counter" {...register('terminalName')} />
              <Input label="POS ID" placeholder="Optional POS identifier" {...register('posId')} />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setTerminalOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Register</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
