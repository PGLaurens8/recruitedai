"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Send, Users, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getJson, postJson } from "@/lib/api-client";
import type { CompanyMemberRecord } from "@/server/api/company-members";
import type { CompanyInviteRecord } from "@/server/api/company-invites";

const ASSIGNABLE_ROLES = ["Admin", "Recruiter", "Sales", "Candidate", "Developer"] as const;

const roleBadgeClass: Record<string, string> = {
  Admin: "bg-purple-100 text-purple-800 border-purple-200",
  Recruiter: "bg-blue-100 text-blue-800 border-blue-200",
  Sales: "bg-green-100 text-green-800 border-green-200",
  Candidate: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Developer: "bg-gray-100 text-gray-800 border-gray-200",
};

const statusBadgeClass: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  accepted: "bg-green-100 text-green-800 border-green-200",
  revoked: "bg-gray-100 text-gray-800 border-gray-200",
  expired: "bg-red-100 text-red-800 border-red-200",
};

export default function TeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [members, setMembers] = useState<CompanyMemberRecord[]>([]);
  const [invites, setInvites] = useState<CompanyInviteRecord[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingInvites, setIsLoadingInvites] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("Recruiter");
  const [isSending, setIsSending] = useState(false);
  const [lastAcceptLink, setLastAcceptLink] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoadingMembers(true);
    setIsLoadingInvites(true);
    try {
      const [membersData, invitesData] = await Promise.all([
        getJson<CompanyMemberRecord[]>("/api/company/members"),
        getJson<CompanyInviteRecord[]>("/api/company/invites"),
      ]);
      setMembers(membersData);
      setInvites(invitesData);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to load team data", description: err.message });
    } finally {
      setIsLoadingMembers(false);
      setIsLoadingInvites(false);
    }
  };

  useEffect(() => {
    void loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsSending(true);
    setLastAcceptLink(null);
    try {
      const result = await postJson<{ invite: CompanyInviteRecord; acceptToken: string }>(
        "/api/company/invites",
        { email: inviteEmail.trim(), role: inviteRole }
      );
      const acceptUrl = `${window.location.origin}/invite?token=${result.acceptToken}`;
      setLastAcceptLink(acceptUrl);
      setInviteEmail("");
      toast({ title: "Invite created", description: `Copy the link below and send it to ${result.invite.email}.` });
      void loadData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Invite failed", description: err.message });
    } finally {
      setIsSending(false);
    }
  };

  const copyLink = () => {
    if (!lastAcceptLink) return;
    void navigator.clipboard.writeText(lastAcceptLink);
    toast({ title: "Copied", description: "Invite link copied to clipboard." });
  };

  if (!user) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
        <p className="mt-1 text-muted-foreground">Invite and manage your agency team members.</p>
      </div>

      {/* Send Invite */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Invite a Team Member</CardTitle>
          <CardDescription>
            Generate an invite link to share with a colleague. They must sign up (or sign in) with the same email address, then open the link to join your agency.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="inviteEmail">Email address</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="colleague@agency.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inviteRole">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-[160px]" id="inviteRole">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isSending}>
              <Send className="mr-2 h-4 w-4" />
              {isSending ? "Sending..." : "Generate Invite"}
            </Button>
          </form>

          {lastAcceptLink && (
            <Alert className="mt-4 bg-green-50 border-green-200">
              <AlertDescription className="space-y-2">
                <p className="text-sm font-medium text-green-800">Invite link ready. Share this with your colleague:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white border rounded px-2 py-1.5 break-all text-green-700">
                    {lastAcceptLink}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyLink} type="button">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-green-700">
                  This link expires in 7 days. The recipient must sign in with the invited email address to accept.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Current Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {isLoadingMembers ? "Team Members" : `Team Members (${members.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingMembers ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No team members found.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.name || "—"}
                      {member.id === user.id && (
                        <Badge variant="outline" className="ml-2 text-[10px]">You</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{member.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleBadgeClass[member.role] ?? ""}>{member.role}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sent Invites */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isLoadingInvites ? "Sent Invites" : `Sent Invites (${invites.length})`}
          </CardTitle>
          <CardDescription>Track all invitations sent to colleagues.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingInvites ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : invites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No invites sent yet.
                  </TableCell>
                </TableRow>
              ) : (
                invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleBadgeClass[invite.role] ?? ""}>{invite.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize ${statusBadgeClass[invite.status] ?? ""}`}>
                        {invite.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(invite.expires_at).toLocaleDateString()}
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
