
"use client";

import { useState, useMemo, Suspense } from "react";
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, FilePenLine, Plus, Search, Star, Trash2, Upload } from "lucide-react";
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

  const { data: profile } = useCurrentProfile(user);
  const companyId = profile?.companyId;
  const { data: candidates, isLoading } = useCandidates(companyId, refreshKey);

  const sortedCandidates = useMemo(() => {
    if (!candidates) return [];
    let sortableItems = [...candidates];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key!] || "";
        const bValue = b[sortConfig.key!] || "";

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [candidates, sortConfig]);

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

  const handleDelete = (candidateId: string) => {
    if (!companyId || !confirm("Are you sure you want to delete this candidate?")) return;
    void removeCandidate(companyId, candidateId).then(() => {
      setRefreshKey((current) => current + 1);
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Spinner size={48} className="text-primary mb-4" />
        <p className="text-muted-foreground">Loading candidates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Candidate Management</h1>
        <p className="mt-1 text-muted-foreground">
          View, manage, and track all candidates in your pipeline.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name..." className="pl-9 w-64" />
          </div>
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sourced">Sourced</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="interviewing">Interviewing</SelectItem>
              <SelectItem value="offer">Offer</SelectItem>
              <SelectItem value="hired">Hired</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Bulk Import</Button>
          <Button asChild><Link href="/ai-parser"><Plus className="mr-2 h-4 w-4" /> Add Candidate</Link></Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Candidates ({sortedCandidates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox />
                </TableHead>
                <SortableTableHeader sortKey="name">Candidate</SortableTableHeader>
                <SortableTableHeader sortKey="status">Status</SortableTableHeader>
                <SortableTableHeader sortKey="aiScore">AI Score</SortableTableHeader>
                <SortableTableHeader sortKey="currentJob">Current Job / Company</SortableTableHeader>
                <TableHead className="w-[120px] text-left pl-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCandidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No candidates found. Use the Smart Parser to add your first candidate.
                  </TableCell>
                </TableRow>
              ) : (
                sortedCandidates.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell>
                      <Checkbox />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={candidate.avatar} data-ai-hint="person portrait"/>
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
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
                        <span className="font-semibold">{candidate.aiScore || 0}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{candidate.currentJob || "N/A"}</p>
                      <p className="text-sm text-muted-foreground">{candidate.currentCompany || "N/A"}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link href={`/candidates/${candidate.id}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(candidate.id)}>
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
    </div>
  );
}

export default function CandidatesPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CandidatesPageContent />
        </Suspense>
    )
}
