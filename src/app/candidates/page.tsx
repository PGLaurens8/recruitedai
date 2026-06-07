
"use client";

import { useState, useMemo, Suspense } from "react";
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Check, Clock, Eye, Plus, RefreshCw, Search, Star, Trash2, Upload, UserPlus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { createCandidate, removeCandidate, updateCandidate, useCandidates, useCurrentProfile } from "@/lib/data/hooks";
import type { CandidateRecord } from "@/lib/data/types";

const QUICK_ADD_STATUS_OPTIONS = ['Sourced', 'Applied', 'Interviewing', 'Offer', 'Hired', 'Rejected'] as const;
type QuickAddStatus = (typeof QUICK_ADD_STATUS_OPTIONS)[number];

type CandidateKey = keyof CandidateRecord;

const getStatusBadgeVariant = (status: string) => {
  switch (status?.toLowerCase()) {
    case "sourced":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "applied":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "interviewing":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "offer":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "hired":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "secondary";
  }
};

const getAiScorePillClass = (score: number) => {
  if (score >= 80) return "bg-green-100 text-green-800";
  if (score >= 60) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
};

function CandidatesPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: CandidateKey | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // Inline status editing: optimistic overrides keep the dropdown responsive
  // without a full list refetch, plus per-row saving/saved indicators.
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [savedStatusId, setSavedStatusId] = useState<string | null>(null);

  const { data: profile } = useCurrentProfile(user);
  const companyId = profile?.companyId;
  const { data: candidates, isLoading, error } = useCandidates(companyId, refreshKey);

  // Quick Add dialog state.
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [quickAdd, setQuickAdd] = useState({
    name: '',
    email: '',
    phone: '',
    currentJob: '',
    currentCompany: '',
    status: 'Sourced' as QuickAddStatus,
    notes: '',
  });

  const openQuickAdd = () => {
    setQuickAdd({ name: '', email: '', phone: '', currentJob: '', currentCompany: '', status: 'Sourced', notes: '' });
    setShowQuickAdd(true);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !quickAdd.name.trim()) return;
    setIsQuickAdding(true);
    try {
      const created = await createCandidate(companyId, {
        name: quickAdd.name.trim(),
        email: quickAdd.email.trim() || undefined,
        phone: quickAdd.phone.trim() || undefined,
        currentJob: quickAdd.currentJob.trim() || undefined,
        currentCompany: quickAdd.currentCompany.trim() || undefined,
        status: quickAdd.status,
        notes: quickAdd.notes.trim() || undefined,
      });
      setShowQuickAdd(false);
      setRefreshKey((k) => k + 1);
      toast({
        title: 'Candidate added',
        description: (
          <Link href={`/candidates/${created.id}`} className="underline font-medium">
            View profile →
          </Link>
        ),
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could not add candidate', description: err?.message || 'Please try again.' });
    } finally {
      setIsQuickAdding(false);
    }
  };

  const sortedCandidates = useMemo(() => {
    if (!candidates) return [];
    let items = [...candidates];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      items = items.filter(
        (c) =>
          c.name?.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          c.currentJob?.toLowerCase().includes(term) ||
          c.currentCompany?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "all") {
      items = items.filter((c) => c.status?.toLowerCase() === statusFilter);
    }

    if (sortConfig.key) {
      items.sort((a, b) => {
        const aValue = a[sortConfig.key!] || "";
        const bValue = b[sortConfig.key!] || "";
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [candidates, sortConfig, searchTerm, statusFilter]);

  const requestSort = (key: CandidateKey) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };
  
  const SortableTableHeader = ({ sortKey, children, className, info }: { sortKey: CandidateKey; children: React.ReactNode; className?: string; info?: string }) => {
    const isSorted = sortConfig.key === sortKey;
    return (
        <TableHead className={className}>
            <div className="flex items-center">
                <Button variant="ghost" onClick={() => requestSort(sortKey)} className="px-2">
                    {children}
                    {isSorted ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                    ) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />}
                </Button>
                {info && <InfoTooltip text={info} />}
            </div>
        </TableHead>
    );
  };

  const handleStatusChange = async (candidateId: string, nextStatus: string) => {
    if (!companyId) return;
    setStatusOverrides((prev) => ({ ...prev, [candidateId]: nextStatus }));
    setSavingStatusId(candidateId);
    try {
      await updateCandidate(companyId, candidateId, { status: nextStatus });
      setSavedStatusId(candidateId);
      setTimeout(() => setSavedStatusId((current) => (current === candidateId ? null : current)), 2000);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could not update status', description: err?.message || 'Please try again.' });
      // Drop the optimistic override so the row reverts to the persisted value.
      setStatusOverrides((prev) => {
        const next = { ...prev };
        delete next[candidateId];
        return next;
      });
    } finally {
      setSavingStatusId((current) => (current === candidateId ? null : current));
    }
  };

  const confirmDelete = (candidateId: string) => {
    setPendingDeleteId(candidateId);
  };

  const handleDelete = () => {
    if (!companyId || !pendingDeleteId) return;
    void removeCandidate(companyId, pendingDeleteId).then(() => {
      setRefreshKey((current) => current + 1);
    });
    setPendingDeleteId(null);
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Candidate Management</h1>
          <InfoTooltip text="Your talent pool. Add candidates by uploading their CV through Smart Parser or manually via Add Candidate" />
        </div>
        <p className="mt-1 text-muted-foreground">
          View, manage, and track all candidates in your pipeline.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates..."
              className="pl-9 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="sourced">Sourced</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="interviewing">Interviewing</SelectItem>
              <SelectItem value="offer">Offer</SelectItem>
              <SelectItem value="hired">Hired</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openQuickAdd}>
            <UserPlus className="mr-2 h-4 w-4" /> Quick Add
          </Button>
          <Button asChild>
            <Link href="/ai-parser"><Plus className="mr-2 h-4 w-4" /> Import via Smart Parser</Link>
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to load candidates</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>Failed to load candidates. Please refresh the page or try again.</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
      <Card>
        <CardHeader>
          <CardTitle>
            {isLoading ? "Candidates" : `All Candidates (${sortedCandidates.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHeader sortKey="name">Candidate</SortableTableHeader>
                <SortableTableHeader sortKey="status">Status</SortableTableHeader>
                <SortableTableHeader sortKey="aiScore" info="AI match score from the last job match assessment. Green = strong match, Amber = partial match, Red = weak match">AI Score</SortableTableHeader>
                <SortableTableHeader sortKey="currentJob">Current Job / Company</SortableTableHeader>
                <TableHead className="w-[100px] text-left pl-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div></div></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : sortedCandidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12">
                    {searchTerm || statusFilter !== "all" ? (
                      <p className="text-center text-muted-foreground">No candidates match your filters.</p>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-center">
                        <p className="font-medium">No candidates yet</p>
                        <Button asChild>
                          <Link href="/ai-parser"><Plus className="mr-2 h-4 w-4" /> Add your first candidate via Smart Parser</Link>
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                sortedCandidates.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={candidate.avatar} data-ai-hint="person portrait" />
                          <AvatarFallback>{candidate.name?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <Link href={`/candidates/${candidate.id}`} className="font-medium hover:underline">{candidate.name}</Link>
                          <p className="text-sm text-muted-foreground">{candidate.email}</p>
                          {(candidate.yearsOfExperience != null || candidate.hasDegreeLevelEducation != null) && (
                            <div className="mt-1 flex items-center gap-2">
                              {candidate.yearsOfExperience != null && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />{candidate.yearsOfExperience} yrs
                                </span>
                              )}
                              {candidate.hasDegreeLevelEducation != null && (
                                candidate.hasDegreeLevelEducation ? (
                                  <Badge variant="outline" className="border-green-600/40 bg-green-500/10 text-green-700 text-[10px] dark:text-green-400">Degree</Badge>
                                ) : (
                                  <Badge variant="outline" className="border-amber-600/40 bg-amber-500/10 text-amber-700 text-[10px] dark:text-amber-400">Skills-Based</Badge>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={statusOverrides[candidate.id] ?? candidate.status}
                          onValueChange={(value) => handleStatusChange(candidate.id, value)}
                          disabled={savingStatusId === candidate.id}
                        >
                          <SelectTrigger className={`h-8 w-[140px] border ${getStatusBadgeVariant(statusOverrides[candidate.id] ?? candidate.status)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {QUICK_ADD_STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {savingStatusId === candidate.id && <Spinner size={14} />}
                        {savedStatusId === candidate.id && <Check className="h-4 w-4 text-green-600" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      {candidate.aiScore != null ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold ${getAiScorePillClass(candidate.aiScore)}`}>
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
                          {candidate.aiScore}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{candidate.currentJob || "—"}</p>
                      <p className="text-sm text-muted-foreground">{candidate.currentCompany || ""}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link href={`/candidates/${candidate.id}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => confirmDelete(candidate.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}

      <Dialog open={showQuickAdd} onOpenChange={(open) => { if (!isQuickAdding) setShowQuickAdd(open); }}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleQuickAdd}>
            <DialogHeader>
              <DialogTitle>Quick Add Candidate</DialogTitle>
              <DialogDescription>Add a candidate manually. Only the full name is required — you can enrich the profile later.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="qa-name">Full name *</Label>
                <Input id="qa-name" value={quickAdd.name} onChange={(e) => setQuickAdd((q) => ({ ...q, name: e.target.value }))} placeholder="Jane Doe" required autoFocus />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="qa-email">Email</Label>
                  <Input id="qa-email" type="email" value={quickAdd.email} onChange={(e) => setQuickAdd((q) => ({ ...q, email: e.target.value }))} placeholder="jane@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qa-phone">Phone</Label>
                  <Input id="qa-phone" value={quickAdd.phone} onChange={(e) => setQuickAdd((q) => ({ ...q, phone: e.target.value }))} placeholder="+1 555 123 4567" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="qa-role">Current role</Label>
                  <Input id="qa-role" value={quickAdd.currentJob} onChange={(e) => setQuickAdd((q) => ({ ...q, currentJob: e.target.value }))} placeholder="Senior Engineer" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qa-company">Current company</Label>
                  <Input id="qa-company" value={quickAdd.currentCompany} onChange={(e) => setQuickAdd((q) => ({ ...q, currentCompany: e.target.value }))} placeholder="Acme Inc." />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qa-status">Status</Label>
                <Select value={quickAdd.status} onValueChange={(v) => setQuickAdd((q) => ({ ...q, status: v as QuickAddStatus }))}>
                  <SelectTrigger id="qa-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUICK_ADD_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qa-notes">Notes</Label>
                <Textarea id="qa-notes" value={quickAdd.notes} onChange={(e) => setQuickAdd((q) => ({ ...q, notes: e.target.value }))} placeholder="Any context worth recording..." className="min-h-[80px]" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowQuickAdd(false)} disabled={isQuickAdding}>Cancel</Button>
              <Button type="submit" disabled={isQuickAdding || !quickAdd.name.trim()}>
                {isQuickAdding ? <Spinner size={16} className="mr-2" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Add Candidate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this candidate from your pipeline. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function CandidatesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-12"><Spinner size={48} /></div>}>
      <CandidatesPageContent />
    </Suspense>
  );
}
