
"use client";

import { useState, useMemo, Suspense } from "react";
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Plus, Search, Star, Trash2, Upload } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import { removeCandidate, useCandidates, useCurrentProfile } from "@/lib/data/hooks";
import type { CandidateRecord } from "@/lib/data/types";

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

function CandidatesPageContent() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: CandidateKey | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: profile } = useCurrentProfile(user);
  const companyId = profile?.companyId;
  const { data: candidates, isLoading } = useCandidates(companyId, refreshKey);

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
  
  const SortableTableHeader = ({ sortKey, children, className }: { sortKey: CandidateKey; children: React.ReactNode; className?: string }) => {
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Candidate Management</h1>
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
          <Button asChild>
            <Link href="/ai-parser"><Plus className="mr-2 h-4 w-4" /> Add Candidate</Link>
          </Button>
        </div>
      </div>

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
                <SortableTableHeader sortKey="aiScore">AI Score</SortableTableHeader>
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
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    {searchTerm || statusFilter !== "all"
                      ? "No candidates match your filters."
                      : "No candidates yet. Use the Smart Parser to add your first candidate."}
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
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadgeVariant(candidate.status)}>{candidate.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {candidate.aiScore != null ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
                          <span className="font-semibold">{candidate.aiScore}%</span>
                        </div>
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
