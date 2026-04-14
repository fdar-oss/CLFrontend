'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { marketingApi } from '@/lib/api/marketing.api';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageSpinner } from '@/components/ui/spinner';
import { Plus, Send, Megaphone } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/format';

type Campaign = {
  id: string; name: string; type: string; status: string;
  scheduledAt: string | null; sentAt: string | null;
  _count?: { logs: number };
};

type Segment = { id: string; name: string; description: string | null; memberCount: number | null };

const CAMPAIGN_TYPES = ['EMAIL', 'SMS', 'WHATSAPP', 'PUSH'];
const CAMPAIGN_STATUS_BADGE: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'info'> = {
  DRAFT: 'secondary',
  SCHEDULED: 'info',
  SENDING: 'warning',
  SENT: 'success',
  FAILED: 'default',
};

// ─── Campaigns Tab ────────────────────────────────────────────────────────────

function CampaignsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery({ queryKey: ['campaigns'], queryFn: marketingApi.listCampaigns });
  const { data: segments = [] } = useQuery({ queryKey: ['segments'], queryFn: marketingApi.listSegments });
  const { data: templates = [] } = useQuery({ queryKey: ['templates'], queryFn: marketingApi.listTemplates });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    name: string; type: string; segmentId: string; templateId?: string; subject?: string; body?: string;
  }>();

  const createMut = useMutation({
    mutationFn: marketingApi.createCampaign,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign created'); setOpen(false); reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const sendMut = useMutation({
    mutationFn: marketingApi.sendCampaignNow,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign sent!'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { reset({ type: 'SMS' }); setOpen(true); }}><Plus className="w-4 h-4" /> New Campaign</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Logs</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(campaigns as Campaign[]).length === 0 && <TableEmpty message="No campaigns yet" />}
            {(campaigns as Campaign[]).map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell><Badge variant="secondary">{c.type}</Badge></TableCell>
                <TableCell><Badge variant={CAMPAIGN_STATUS_BADGE[c.status] || 'secondary'}>{c.status}</Badge></TableCell>
                <TableCell className="text-gray-500 text-sm">{c.scheduledAt ? formatDateTime(c.scheduledAt) : '—'}</TableCell>
                <TableCell className="text-gray-500 text-sm">{c.sentAt ? formatDateTime(c.sentAt) : '—'}</TableCell>
                <TableCell className="text-gray-500">{c._count?.logs ?? 0}</TableCell>
                <TableCell>
                  {c.status === 'DRAFT' && (
                    <Button size="sm" variant="outline" onClick={() => sendMut.mutate(c.id)} loading={sendMut.isPending}>
                      <Send className="w-3.5 h-3.5 mr-1" /> Send Now
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Campaign</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createMut.mutateAsync(d))}>
            <DialogBody>
              <Input label="Campaign Name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Channel"
                  options={CAMPAIGN_TYPES.map((t) => ({ value: t, label: t }))}
                  {...register('type', { required: 'Required' })}
                />
                <Select
                  label="Audience Segment"
                  options={(segments as Segment[]).map((s) => ({ value: s.id, label: s.name }))}
                  placeholder="All customers"
                  error={errors.segmentId?.message}
                  {...register('segmentId', { required: 'Required' })}
                />
              </div>
              <Input label="Subject (for email)" {...register('subject')} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message Body</label>
                <textarea
                  {...register('body')}
                  rows={4}
                  placeholder="Enter your message…"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Create Campaign</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Segments Tab ─────────────────────────────────────────────────────────────

function SegmentsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: segments = [], isLoading } = useQuery({ queryKey: ['segments'], queryFn: marketingApi.listSegments });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    name: string; description?: string; minSpend?: number; minVisits?: number;
  }>();

  const createMut = useMutation({
    mutationFn: marketingApi.createSegment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['segments'] }); toast.success('Segment created'); setOpen(false); reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const calcMut = useMutation({
    mutationFn: marketingApi.calculateSegment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['segments'] }); toast.success('Segment recalculated'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { reset(); setOpen(true); }}><Plus className="w-4 h-4" /> New Segment</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(segments as Segment[]).length === 0 && (
          <div className="col-span-full text-center text-gray-400 py-8 text-sm">No segments yet</div>
        )}
        {(segments as Segment[]).map((seg) => (
          <Card key={seg.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-brand-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{seg.memberCount ?? '—'}</span>
            </div>
            <h3 className="font-semibold text-sm text-gray-900">{seg.name}</h3>
            {seg.description && <p className="text-xs text-gray-400 mt-0.5">{seg.description}</p>}
            <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => calcMut.mutate(seg.id)} loading={calcMut.isPending}>
              Recalculate
            </Button>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Segment</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createMut.mutateAsync(d))}>
            <DialogBody>
              <Input label="Segment Name" placeholder="e.g. VIP Customers" error={errors.name?.message} {...register('name', { required: 'Required' })} />
              <Input label="Description" {...register('description')} />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2 mb-1">Filters</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Min Total Spend (₨)" type="number" step="0.01" {...register('minSpend', { valueAsNumber: true })} />
                <Input label="Min Visit Count" type="number" {...register('minVisits', { valueAsNumber: true })} />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  return (
    <div>
      <PageHeader
        title="Marketing"
        description="Campaigns, segments, and customer communications"
      />
      <Tabs defaultValue="campaigns">
        <TabsList className="mb-6">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
        </TabsList>
        <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
        <TabsContent value="segments"><SegmentsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
