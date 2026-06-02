
"use client";

import { useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Building, MoreHorizontal, Plus, RefreshCw, Search, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { postJson } from '@/lib/api-client';
import { removeClient, useClients, useCurrentProfile } from '@/lib/data/hooks';
import type { ClientRecord } from '@/lib/data/types';

type ClientKey = keyof ClientRecord;
type ClientStatus = 'active' | 'prospect' | 'on hold' | 'inactive';
const CLIENT_STATUS_OPTIONS: ClientStatus[] = ['active', 'prospect', 'on hold', 'inactive'];

const getStatusBadgeVariant = (status: string) => {
  switch (status?.toLowerCase()) {
    case "active":
      return "bg-green-100 text-green-800 border-green-200";
    case "prospect":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "on hold":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "inactive":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "secondary";
  }
};

export default function ClientsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: ClientKey | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newStatus, setNewStatus] = useState<ClientStatus>('prospect');

  const { data: profile } = useCurrentProfile(user);
  const companyId = profile?.companyId;
  const { data: clients, isLoading, error } = useClients(companyId, refreshKey);

  const openAddDialog = () => {
    setNewClientName('');
    setNewContactName('');
    setNewContactEmail('');
    setNewStatus('prospect');
    setShowAddDialog(true);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    setIsCreating(true);
    try {
      await postJson<unknown>('/api/clients', {
        name: newClientName.trim(),
        contactName: newContactName.trim() || undefined,
        contactEmail: newContactEmail.trim() || undefined,
        status: newStatus,
      });
      toast({ title: 'Client added', description: `${newClientName.trim()} is now in your client list.` });
      setShowAddDialog(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Could not add client',
        description: err?.message || 'Please try again.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const sortedClients = useMemo(() => {
    if (!clients) return [];
    let sortableItems = [...clients];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      sortableItems = sortableItems.filter(
        (c) =>
          c.name?.toLowerCase().includes(term) ||
          c.contactName?.toLowerCase().includes(term) ||
          c.contactEmail?.toLowerCase().includes(term)
      );
    }
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
  }, [clients, sortConfig, searchTerm]);

  const requestSort = (key: ClientKey) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const SortableTableHeader = ({ sortKey, children, className }: { sortKey: ClientKey; children: React.ReactNode; className?: string }) => {
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

  const confirmDelete = (clientId: string) => setPendingDeleteId(clientId);

  const handleDelete = () => {
    if (!companyId || !pendingDeleteId) return;
    void removeClient(companyId, pendingDeleteId).then(() => {
      setRefreshKey((current) => current + 1);
    });
    setPendingDeleteId(null);
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Client Management</h1>
          <InfoTooltip text="Companies you recruit for. Link vacancies to clients to track submissions and placements per client relationship" />
        </div>
        <p className="mt-1 text-muted-foreground">
          View, manage, and track all your clients and their job postings.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              className="pl-9 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openAddDialog}><Plus className="mr-2 h-4 w-4" /> Add Client</Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to load clients</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>Failed to load clients. Please refresh the page or try again.</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
      <Card>
        <CardHeader>
          <CardTitle>{isLoading ? "Clients" : `All Clients (${sortedClients.length})`}</CardTitle>
          <CardDescription>A list of all clients in your system.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHeader sortKey="name">Client</SortableTableHeader>
                <SortableTableHeader sortKey="contactName">Contact</SortableTableHeader>
                <SortableTableHeader sortKey="status">Status</SortableTableHeader>
                <SortableTableHeader sortKey="openJobs" className="text-center">Open Jobs</SortableTableHeader>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-md" /><Skeleton className="h-4 w-28" /></div></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : sortedClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    {searchTerm ? "No clients match your search." : "No clients found."}
                  </TableCell>
                </TableRow>
              ) : (
                sortedClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="rounded-md">
                          <AvatarImage src={client.logo} data-ai-hint="company logo"/>
                          <AvatarFallback className="rounded-md bg-muted"><Building className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{client.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{client.contactName}</p>
                        <p className="text-sm text-muted-foreground">{client.contactEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadgeVariant(client.status)}>{client.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {client.openJobs || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => confirmDelete(client.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Client
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}

      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!isCreating) setShowAddDialog(open); }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateClient}>
            <DialogHeader>
              <DialogTitle>Add Client</DialogTitle>
              <DialogDescription>Create a new client record. You can add jobs and contacts after.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Client name *</Label>
                <Input
                  id="client-name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Acme Inc."
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="client-contact-name">Contact name</Label>
                  <Input
                    id="client-contact-name"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-contact-email">Contact email</Label>
                  <Input
                    id="client-contact-email"
                    type="email"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    placeholder="jane@acme.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-status">Status</Label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ClientStatus)}>
                  <SelectTrigger id="client-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || !newClientName.trim()}>
                {isCreating ? 'Adding...' : 'Add Client'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this client from your system. This action cannot be undone.
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
