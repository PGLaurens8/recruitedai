"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertTriangle, Check, Eye, Plus, RefreshCw, Search, ArrowUp, ArrowDown, ArrowUpDown, Mic2 } from "lucide-react";
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { updateJob, useClients, useCurrentProfile, useJobs } from '@/lib/data/hooks';
import type { JobRecord } from '@/lib/data/types';

const JOB_STATUS_OPTIONS = ['draft', 'pending', 'active', 'closed'] as const;

type JobKey = keyof JobRecord;

const getStatusBadgeClass = (status: string) => {
    switch(status?.toLowerCase()) {
        case 'active': return 'bg-green-100 text-green-800 border-green-200';
        case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'draft': return 'bg-slate-100 text-slate-800 border-slate-200';
        case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
        default: return 'bg-secondary text-secondary-foreground';
    }
}

const getApprovalBadgeClass = (approval: string) => {
    switch(approval?.toLowerCase()) {
        case 'approved': return 'bg-green-100 text-green-800 border-green-200';
        case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-secondary text-secondary-foreground';
    }
}

const ALL_CLIENTS = 'all';

export default function JobsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sortConfig, setSortConfig] = useState<{ key: JobKey | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState(ALL_CLIENTS);

  // Inline status edit: optimistic override per row plus saving/saved markers.
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [savedStatusId, setSavedStatusId] = useState<string | null>(null);

  const { data: profile } = useCurrentProfile(user);
  const companyId = profile?.companyId;
  const { data: jobs, isLoading, error } = useJobs(companyId);
  const { data: clients } = useClients(companyId);

  const handleStatusChange = async (jobId: string, nextStatus: string) => {
    if (!companyId) return;
    setStatusOverrides((prev) => ({ ...prev, [jobId]: nextStatus }));
    setSavingStatusId(jobId);
    try {
      await updateJob(companyId, jobId, { status: nextStatus });
      setSavedStatusId(jobId);
      setTimeout(() => setSavedStatusId((current) => (current === jobId ? null : current)), 2000);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could not update status', description: err?.message || 'Please try again.' });
      // Drop the optimistic override so the row reverts to the persisted value.
      setStatusOverrides((prev) => {
        const next = { ...prev };
        delete next[jobId];
        return next;
      });
    } finally {
      setSavingStatusId((current) => (current === jobId ? null : current));
    }
  };

  const sortedJobs = useMemo(() => {
    if (!jobs) return [];
    let sortableItems = [...jobs];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      sortableItems = sortableItems.filter(
        (job) =>
          job.title?.toLowerCase().includes(term) ||
          job.company?.toLowerCase().includes(term) ||
          job.clientName?.toLowerCase().includes(term) ||
          job.location?.toLowerCase().includes(term)
      );
    }

    if (clientFilter !== ALL_CLIENTS) {
      sortableItems = sortableItems.filter((job) => job.clientId === clientFilter);
    }

    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const aValue = String(a[sortConfig.key!] || "");
        const bValue = String(b[sortConfig.key!] || "");
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [jobs, sortConfig, searchTerm, clientFilter]);

  const requestSort = (key: JobKey) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const SortableTableHeader = ({ sortKey, children, className }: { sortKey: JobKey; children: React.ReactNode; className?: string }) => {
    const isSorted = sortConfig.key === sortKey;
    return (
        <TableHead className={className}>
            <Button variant="ghost" onClick={() => requestSort(sortKey)} className="px-2">
                {children}
                {isSorted ? (
                    sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                ) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />}
            </Button>
        </TableHead>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Vacancy Management</h1>
            <InfoTooltip text="Active vacancies you are filling for clients. Link vacancies to clients to track the full placement pipeline" />
          </div>
          <p className="mt-1 text-muted-foreground">
            Manage and create AI-powered vacancies.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none" asChild>
            <Link href="/jobs/new">
              <Mic2 className="mr-2 h-4 w-4" /> AI Brief Builder
            </Link>
          </Button>
          <Button className="flex-1 sm:flex-none" asChild>
            <Link href="/jobs/new">
              <Plus className="mr-2 h-4 w-4" /> New Vacancy
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to load vacancies</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>Failed to load vacancies. Please refresh the page or try again.</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>{isLoading ? "Vacancies" : `All Vacancies (${sortedJobs.length})`}</CardTitle>
            <CardDescription>View and manage all active, pending, and closed vacancies.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search postings..."
                className="pl-9 w-full md:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CLIENTS}>All Clients</SelectItem>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="hidden sm:table">
            <TableHeader>
              <TableRow>
                <SortableTableHeader sortKey="title">Vacancy Details</SortableTableHeader>
                <SortableTableHeader sortKey="clientName">Client</SortableTableHeader>
                <SortableTableHeader sortKey="status">Status</SortableTableHeader>
                <SortableTableHeader sortKey="approval">Approval</SortableTableHeader>
                <SortableTableHeader sortKey="candidates">Candidates</SortableTableHeader>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : sortedJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    {searchTerm || clientFilter !== ALL_CLIENTS
                      ? "No job postings match your filters."
                      : "No job postings yet. Create your first posting above."}
                  </TableCell>
                </TableRow>
              ) : (
                sortedJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Link href={`/jobs/${job.id}`} className="font-medium text-primary hover:underline">{job.title}</Link>
                      {job.salary && <p className="text-sm text-green-600 font-semibold">{job.salary}</p>}
                      {job.location && <p className="text-xs text-muted-foreground">{job.location}</p>}
                    </TableCell>
                    <TableCell>
                      {job.clientId ? (
                        <Link href={`/clients/${job.clientId}`} className="font-medium text-primary hover:underline">
                          {job.clientName || job.company || "—"}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{job.company || "—"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={statusOverrides[job.id] ?? job.status}
                          onValueChange={(value) => handleStatusChange(job.id, value)}
                          disabled={savingStatusId === job.id}
                        >
                          <SelectTrigger className={`h-8 w-[130px] border capitalize ${getStatusBadgeClass(statusOverrides[job.id] ?? job.status)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {JOB_STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {savingStatusId === job.id && <Spinner size={14} />}
                        {savedStatusId === job.id && <Check className="h-4 w-4 text-green-600" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getApprovalBadgeClass(job.approval) + " capitalize"}>{job.approval}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{job.candidates ?? 0}</p>
                      <p className="text-sm text-muted-foreground">applied</p>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/jobs/${job.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Mobile: stacked card list (the table overflows on < 640px). */}
          <div className="space-y-3 p-4 sm:hidden">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="p-4 space-y-2">
                  <Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24" />
                </Card>
              ))
            ) : sortedJobs.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                {searchTerm || clientFilter !== ALL_CLIENTS
                  ? "No job postings match your filters."
                  : "No job postings yet. Create your first posting above."}
              </Card>
            ) : (
              sortedJobs.map((job) => (
                <Card key={job.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/jobs/${job.id}`} className="block truncate font-medium text-primary hover:underline">{job.title}</Link>
                      {job.salary && <p className="text-sm font-semibold text-green-600">{job.salary}</p>}
                      {job.location && <p className="truncate text-xs text-muted-foreground">{job.location}</p>}
                    </div>
                    <Badge variant="outline" className={getStatusBadgeClass(job.status) + " capitalize shrink-0"}>{job.status}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{job.candidates ?? 0} applied</span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/jobs/${job.id}`}><Eye className="mr-2 h-4 w-4" /> View</Link>
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
