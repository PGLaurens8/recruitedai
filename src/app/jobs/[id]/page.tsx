"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, ArrowLeft, Briefcase, DollarSign, MapPin, Pencil, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import {
  updateJob,
  updateSubmission,
  useClients,
  useCurrentProfile,
  useJobSubmissions,
  useJobs,
} from '@/lib/data/hooks';
import type { SubmissionStatus } from '@/lib/data/types';
import {
  SUBMISSION_STATUS_BADGE_CLASS,
  SUBMISSION_STATUS_LABEL,
  SUBMISSION_STATUS_ORDER,
} from '@/lib/submissions-ui';

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const jobId = typeof params?.id === 'string' ? params.id : '';

  const { data: profile } = useCurrentProfile(user);
  const companyId = profile?.companyId;
  const [jobsRefresh, setJobsRefresh] = useState(0);
  const { data: jobs, isLoading: isJobsLoading, error: jobsError } = useJobs(companyId, jobsRefresh);
  const { data: clients } = useClients(companyId);
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: submissions, isLoading: isSubsLoading, error: subsError } = useJobSubmissions(
    companyId,
    jobId,
    refreshKey,
  );

  // useJobs returns the company's job list; pick out this specific job. Avoids
  // adding a per-job GET endpoint just for the detail page.
  const job = useMemo(() => (jobs || []).find((item) => item.id === jobId) || null, [jobs, jobId]);

  const [pendingId, setPendingId] = useState<string | null>(null);

  const NO_CLIENT = 'none';
  const JOB_STATUS_OPTIONS = [
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending Approval' },
    { value: 'active', label: 'Active' },
    { value: 'closed', label: 'Closed' },
  ];

  const [editOpen, setEditOpen] = useState(false);
  const [isSavingJob, setIsSavingJob] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    location: '',
    salary: '',
    status: 'draft',
    clientId: NO_CLIENT,
  });

  const openEdit = () => {
    if (!job) return;
    setJobForm({
      title: job.title || '',
      description: job.description || '',
      location: job.location || '',
      salary: job.salary || '',
      status: job.status || 'draft',
      clientId: job.clientId || NO_CLIENT,
    });
    setEditOpen(true);
  };

  const handleSaveJob = async () => {
    if (!companyId || !jobId || !jobForm.title.trim()) return;
    setIsSavingJob(true);
    try {
      await updateJob(companyId, jobId, {
        title: jobForm.title.trim(),
        description: jobForm.description.trim() || null,
        location: jobForm.location.trim() || null,
        salary: jobForm.salary.trim() || null,
        status: jobForm.status,
        clientId: jobForm.clientId === NO_CLIENT ? null : jobForm.clientId,
      });
      toast({ title: 'Vacancy updated', description: 'Your changes have been saved.' });
      setEditOpen(false);
      setJobsRefresh((prev) => prev + 1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not update job.';
      toast({ variant: 'destructive', title: 'Update failed', description: message });
    } finally {
      setIsSavingJob(false);
    }
  };

  const handleStatusChange = async (submissionId: string, nextStatus: SubmissionStatus) => {
    if (!companyId) return;
    setPendingId(submissionId);
    try {
      await updateSubmission(companyId, submissionId, { status: nextStatus });
      toast({
        title: 'Pipeline updated',
        description: `Status set to ${SUBMISSION_STATUS_LABEL[nextStatus]}.`,
      });
      setRefreshKey((prev) => prev + 1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not update status.';
      toast({ variant: 'destructive', title: 'Update failed', description: message });
    } finally {
      setPendingId(null);
    }
  };

  if (isJobsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Spinner size={32} />
        <p className="mt-4 text-muted-foreground">Loading job...</p>
      </div>
    );
  }

  if (jobsError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Failed to load job</AlertTitle>
        <AlertDescription>{jobsError.message}</AlertDescription>
      </Alert>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-bold">Vacancy Not Found</p>
        <p className="mt-1 text-muted-foreground">This vacancy does not exist or has been removed.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/jobs')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Vacancies
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/jobs')}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to jobs</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {(job.clientName || job.company) && (
                <span className="inline-flex items-center gap-1"><Briefcase className="h-4 w-4" /> {job.clientName || job.company}</span>
              )}
              {job.location && (
                <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {job.location}</span>
              )}
              <Badge variant="outline" className="capitalize">{job.status}</Badge>
            </div>
            {job.salary && (
              <p className="mt-1 text-sm font-semibold text-green-600">{job.salary}</p>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={openEdit} className="shrink-0">
          <Pencil className="mr-2 h-4 w-4" /> Edit Vacancy
        </Button>
      </header>

      <Breadcrumb items={[{ label: 'Vacancies', href: '/jobs' }, { label: job.title }]} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" /> Vacancy Specification</CardTitle>
          <CardDescription>The full spec for this vacancy. Use <span className="font-medium">Edit Vacancy</span> to update it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> Location</p>
              <p className="text-sm font-medium">{job.location || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><DollarSign className="h-3.5 w-3.5" /> Salary</p>
              <p className="text-sm font-medium">{job.salary || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Briefcase className="h-3.5 w-3.5" /> Client</p>
              <p className="text-sm font-medium">{job.clientName || job.company || '—'}</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Description</p>
            {job.description ? (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{job.description}</p>
            ) : (
              <p className="text-sm italic text-muted-foreground/70">No description yet. Click Edit Vacancy to add one.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Candidate Pipeline</CardTitle>
          <CardDescription>Candidates submitted to this vacancy and their current pipeline stage.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {subsError ? (
            <Alert variant="destructive" className="m-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Could not load pipeline</AlertTitle>
              <AlertDescription>{subsError.message}</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[220px]">Update stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isSubsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-44" /></TableCell>
                    </TableRow>
                  ))
                ) : !submissions || submissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                      No candidates submitted yet. Open a candidate profile and click <span className="font-medium">Submit to Vacancy</span>.
                    </TableCell>
                  </TableRow>
                ) : (
                  submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <Link href={`/candidates/${submission.candidateId}`} className="font-medium text-primary hover:underline">
                          {submission.candidateName || 'Unknown candidate'}
                        </Link>
                        {submission.notes && (
                          <p className="mt-1 line-clamp-2 max-w-md text-xs text-muted-foreground">{submission.notes}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(submission.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={SUBMISSION_STATUS_BADGE_CLASS[submission.status]}>
                          {SUBMISSION_STATUS_LABEL[submission.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={submission.status}
                          onValueChange={(value) => handleStatusChange(submission.id, value as SubmissionStatus)}
                          disabled={pendingId === submission.id}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SUBMISSION_STATUS_ORDER.map((status) => (
                              <SelectItem key={status} value={status}>
                                {SUBMISSION_STATUS_LABEL[status]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={(open) => { if (!isSavingJob) setEditOpen(open); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Vacancy</DialogTitle>
            <DialogDescription>Update the vacancy details. Changes are saved to this job.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input id="edit-title" value={jobForm.title} onChange={(e) => setJobForm((f) => ({ ...f, title: e.target.value }))} placeholder="Senior Frontend Engineer" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" value={jobForm.description} onChange={(e) => setJobForm((f) => ({ ...f, description: e.target.value }))} placeholder="Role responsibilities, requirements, and context..." className="min-h-[120px]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input id="edit-location" value={jobForm.location} onChange={(e) => setJobForm((f) => ({ ...f, location: e.target.value }))} placeholder="Remote, US" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-salary">Salary</Label>
                <Input id="edit-salary" value={jobForm.salary} onChange={(e) => setJobForm((f) => ({ ...f, salary: e.target.value }))} placeholder="R600k-R850k" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={jobForm.status} onValueChange={(v) => setJobForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger id="edit-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JOB_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-client">Client</Label>
                <Select value={jobForm.clientId} onValueChange={(v) => setJobForm((f) => ({ ...f, clientId: v }))}>
                  <SelectTrigger id="edit-client"><SelectValue placeholder="No client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CLIENT}>No client</SelectItem>
                    {(clients || []).map((client) => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isSavingJob}>Cancel</Button>
            <Button onClick={handleSaveJob} disabled={isSavingJob || !jobForm.title.trim()}>
              {isSavingJob ? <Spinner size={16} className="mr-2" /> : <Pencil className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
