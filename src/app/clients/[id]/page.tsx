"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ArrowLeft, AlertTriangle, Briefcase, Building, Clock, Globe, Mail, Pencil, Save, User, X } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/auth-context';
import { ApiClientError, updateClient, useClient, useCurrentProfile, useJobs } from '@/lib/data/hooks';

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

const getJobStatusBadgeVariant = (status: string) => {
  switch (status?.toLowerCase()) {
    case "active":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "closed":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "secondary";
  }
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = typeof params?.id === "string" ? params.id : "";
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: profile } = useCurrentProfile(user);
  const companyId = profile?.companyId;
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: client, isLoading, error } = useClient(companyId, clientId, refreshKey);
  const { data: jobs } = useJobs(companyId);

  // Details edit form.
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    contactName: '',
    contactEmail: '',
    website: '',
    status: 'prospect' as ClientStatus,
  });

  // Notes are edited independently of the core details form.
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name || '',
        contactName: client.contactName || '',
        contactEmail: client.contactEmail || '',
        website: client.website || '',
        status: (CLIENT_STATUS_OPTIONS.includes(client.status as ClientStatus)
          ? (client.status as ClientStatus)
          : 'prospect'),
      });
      setNotes(client.notes || '');
    }
  }, [client]);

  const linkedJobs = useMemo(
    () => (jobs || []).filter((job) => job.clientId === clientId),
    [jobs, clientId],
  );

  const startEdit = () => {
    if (!client) return;
    setForm({
      name: client.name || '',
      contactName: client.contactName || '',
      contactEmail: client.contactEmail || '',
      website: client.website || '',
      status: (CLIENT_STATUS_OPTIONS.includes(client.status as ClientStatus)
        ? (client.status as ClientStatus)
        : 'prospect'),
    });
    setIsEditing(true);
  };

  const handleSaveDetails = async () => {
    if (!companyId || !clientId || !form.name.trim()) return;
    setIsSaving(true);
    try {
      await updateClient(companyId, clientId, {
        name: form.name.trim(),
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim(),
        website: form.website.trim(),
        status: form.status,
      });
      toast({ title: 'Client updated', description: 'The client details have been saved.' });
      setIsEditing(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could not save client', description: err?.message || 'Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!companyId || !clientId) return;
    setIsSavingNotes(true);
    try {
      await updateClient(companyId, clientId, { notes: notes.trim() });
      toast({ title: 'Notes saved', description: 'Your notes for this client have been updated.' });
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could not save notes', description: err?.message || 'Please try again.' });
    } finally {
      setIsSavingNotes(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Spinner size={32} />
        <p className="mt-4 text-muted-foreground">Loading client...</p>
      </div>
    );
  }

  if (error) {
    const isNotFound = error instanceof ApiClientError && error.status === 404;
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-bold">{isNotFound ? "Client Not Found" : "Something went wrong"}</p>
        <p className="mt-1 text-muted-foreground">
          {isNotFound
            ? "This client does not exist or has been removed."
            : "Something went wrong loading this client. Please try again."}
        </p>
        <div className="mt-4 flex items-center gap-2">
          {!isNotFound && <Button onClick={() => window.location.reload()}>Try Again</Button>}
          <Button variant="outline" onClick={() => router.push('/clients')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Spinner size={32} />
        <p className="mt-4 text-muted-foreground">Loading client...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/clients')}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to clients</span>
          </Button>
          <Avatar className="h-16 w-16 rounded-md">
            <AvatarImage src={client.logo} data-ai-hint="company logo" />
            <AvatarFallback className="rounded-md bg-muted"><Building className="h-7 w-7 text-muted-foreground" /></AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
            <div className="mt-1">
              <Badge variant="outline" className={getStatusBadgeVariant(client.status)}>{client.status}</Badge>
            </div>
          </div>
        </div>
        {!isEditing && (
          <Button onClick={startEdit}>
            <Pencil className="mr-2 h-4 w-4" /> Edit Client
          </Button>
        )}
      </header>

      <Breadcrumb items={[{ label: "Client CRM", href: "/clients" }, { label: client.name }]} />

      <Card>
        <CardHeader>
          <CardTitle>Client Details</CardTitle>
          <CardDescription>Contact information and relationship status for this client.</CardDescription>
        </CardHeader>
        {isEditing ? (
          <>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Client name *</Label>
                <Input id="client-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Contact name</Label>
                  <Input id="contact-name" value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} placeholder="Jane Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Contact email</Label>
                  <Input id="contact-email" type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} placeholder="jane@acme.com" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://acme.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as ClientStatus }))}>
                    <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLIENT_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button onClick={handleSaveDetails} disabled={isSaving || !form.name.trim()}>
                {isSaving ? <Spinner size={16} className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </CardFooter>
          </>
        ) : (
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground w-32">Contact</span>
              <span className="font-medium">{client.contactName || '—'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground w-32">Email</span>
              {client.contactEmail ? (
                <a href={`mailto:${client.contactEmail}`} className="font-medium hover:underline">{client.contactEmail}</a>
              ) : (
                <span className="font-medium">—</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground w-32">Website</span>
              {client.website ? (
                <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">{client.website}</a>
              ) : (
                <span className="font-medium">—</span>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" /> Open Jobs</CardTitle>
          <CardDescription>Vacancies linked to this client.</CardDescription>
        </CardHeader>
        <CardContent>
          {linkedJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs linked to this client yet.</p>
          ) : (
            <ul className="space-y-2">
              {linkedJobs.map((job) => (
                <li key={job.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <Link href={`/jobs/${job.id}`} className="font-medium hover:underline">{job.title}</Link>
                  <Badge variant="outline" className={getJobStatusBadgeVariant(job.status)}>{job.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>Internal notes about this client relationship.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this client — contacts, preferences, history..."
            className="min-h-[140px]"
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveNotes} disabled={isSavingNotes}>
            {isSavingNotes ? <Spinner size={16} className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
            Save Notes
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-muted-foreground" /> Activity Log</CardTitle>
          <CardDescription>A timeline of interactions with this client.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center">
            <Clock className="h-6 w-6 text-muted-foreground/60" />
            <p className="text-sm font-medium text-muted-foreground">Activity logging coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
