'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { posApi } from '@/lib/api/pos.api';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { PageSpinner } from '@/components/ui/spinner';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

export default function VoidRequestsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['void-requests', statusFilter],
    queryFn: () => posApi.listVoidRequests(statusFilter || undefined),
    refetchInterval: 10000,
  });

  const approveMut = useMutation({
    mutationFn: posApi.approveVoid,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['void-requests'] }); qc.invalidateQueries({ queryKey: ['admin-orders'] }); toast.success('Void approved — order cancelled'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const rejectMut = useMutation({
    mutationFn: () => posApi.rejectVoid(rejectId!, rejectNote || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['void-requests'] }); toast.success('Void rejected — order restored'); setRejectId(null); setRejectNote(''); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const pending = (requests as any[]).filter((r: any) => r.status === 'PENDING');

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader
        title="Void Requests"
        description="Review and approve/reject order void requests from staff"
        action={
          pending.length > 0 ? (
            <Badge variant="destructive" className="text-sm px-3 py-1">
              <AlertTriangle className="w-4 h-4 mr-1" /> {pending.length} pending
            </Badge>
          ) : undefined
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="">All</option>
        </select>
        <span className="text-sm text-gray-500">{(requests as any[]).length} request{(requests as any[]).length !== 1 ? 's' : ''}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(requests as any[]).length === 0 && <TableEmpty message="No void requests" />}
            {(requests as any[]).map((req: any) => (
              <TableRow key={req.id} className={req.status === 'PENDING' ? 'bg-amber-50/50' : ''}>
                <TableCell className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(req.createdAt)}</TableCell>
                <TableCell>
                  <p className="font-mono font-semibold text-sm text-brand-800">{req.order?.orderNumber}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={req.type === 'FULL_VOID' ? 'destructive' : 'warning'}>
                    {req.type === 'FULL_VOID' ? 'Full Void' : 'Item Removal'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">{req.requestedBy?.fullName}</p>
                    <p className="text-[10px] text-gray-400">{req.requestedBy?.role}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-700 max-w-[200px] truncate">{req.reason}</TableCell>
                <TableCell className="font-semibold">{formatCurrency(req.order?.total)}</TableCell>
                <TableCell>
                  <Badge variant={req.status === 'PENDING' ? 'warning' : req.status === 'APPROVED' ? 'success' : 'destructive'}>
                    {req.status}
                  </Badge>
                  {req.approvedBy && (
                    <p className="text-[10px] text-gray-400 mt-0.5">by {req.approvedBy.fullName}</p>
                  )}
                </TableCell>
                <TableCell>
                  {req.status === 'PENDING' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => approveMut.mutate(req.id)}
                        className="p-1.5 rounded-md text-green-500 hover:text-green-700 hover:bg-green-50 transition-colors"
                        title="Approve void"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setRejectId(req.id)}
                        className="p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                        title="Reject void"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejectId} onOpenChange={() => { setRejectId(null); setRejectNote(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Void Request</DialogTitle></DialogHeader>
          <DialogBody>
            <p className="text-sm text-gray-600 mb-3">The order will be restored and the staff member will be notified.</p>
            <Input
              label="Rejection Note (optional)"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Customer is still here, process payment instead"
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectId(null); setRejectNote(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejectMut.mutate()} loading={rejectMut.isPending}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
