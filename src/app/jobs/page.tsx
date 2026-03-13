
"use client";

import { useState, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Eye, Plus, Search, Star, X, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/context/auth-context';
import { useCurrentProfile, useJobs } from '@/lib/data/hooks';
import type { JobRecord } from '@/lib/data/types';

type JobKey = keyof JobRecord;

const getStatusBadgeClass = (status: string) => {
    switch(status?.toLowerCase()) {
        case 'active': return 'bg-green-100 text-green-800 border-green-200';
        case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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

export default function JobsPage() {
  const { user } = useAuth();
  const [sortConfig, setSortConfig] = useState<{ key: JobKey | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  const { data: profile } = useCurrentProfile(user);
  const companyId = profile?.companyId;
  const { data: jobs, isLoading } = useJobs(companyId);

  const sortedJobs = useMemo(() => {
    if (!jobs) return [];
    let sortableItems = [...jobs];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key!] || "";
        const bValue = b[sortConfig.key!] || "";
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [jobs, sortConfig]);

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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Spinner size={48} className="text-primary mb-4" />
        <p className="text-muted-foreground">Loading job data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
          <div>
              <h1 className="text-3xl font-bold tracking-tight">Job Management</h1>
              <p className="mt-1 text-muted-foreground">
              Manage job specifications and create AI-powered job postings.
              </p>
          </div>
          <div className="flex gap-2">
              <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Add Job Spec</Button>
              <Button><Plus className="mr-2 h-4 w-4" /> Create Posting</Button>
          </div>
      </div>
      
      <Tabs defaultValue="postings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="specifications">Job Specifications</TabsTrigger>
            <TabsTrigger value="postings">Job Postings</TabsTrigger>
        </TabsList>

        <TabsContent value="postings" className="mt-6">
            <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <CardTitle>All Job Postings ({sortedJobs.length})</CardTitle>
                        <CardDescription>
                            View and manage all active, pending, and closed job postings.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search postings..." className="pl-9 w-full md:w-64" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <SortableTableHeader sortKey="title">Job Details</SortableTableHeader>
                            <SortableTableHeader sortKey="status">Status</SortableTableHeader>
                            <SortableTableHeader sortKey="approval">Approval</SortableTableHeader>
                            <SortableTableHeader sortKey="candidates">Candidates</SortableTableHeader>
                            <TableHead className="w-[120px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedJobs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No job postings found.</TableCell>
                                </TableRow>
                            ) : (
                                sortedJobs.map((job) => (
                                <TableRow key={job.id}>
                                    <TableCell>
                                    <p className="font-medium">{job.title}</p>
                                    <p className="text-sm text-green-600 font-semibold">{job.salary}</p>
                                    <p className="text-xs text-muted-foreground">{job.location}</p>
                                    </TableCell>
                                    <TableCell>
                                    <Badge variant="outline" className={getStatusBadgeClass(job.status) + " capitalize"}>{job.status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                    <Badge variant="outline" className={getApprovalBadgeClass(job.approval) + " capitalize"}>{job.approval}</Badge>
                                    </TableCell>
                                    <TableCell>
                                    <p className="font-medium">{job.candidates || 0}</p>
                                    <p className="text-sm text-muted-foreground">applied</p>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {job.approval === 'pending' && (
                                                <>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700">
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700">
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
