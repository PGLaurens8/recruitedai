"use client";

import { useMemo } from "react";

import { useAuth } from "@/context/auth-context";
import { useCandidates, useClients, useJobs } from "@/lib/data/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building, Users } from "lucide-react";

export default function SalesDashboardPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  const candidatesState = useCandidates(companyId);
  const jobsState = useJobs(companyId);
  const clientsState = useClients(companyId);

  const isLoading = candidatesState.isLoading || jobsState.isLoading || clientsState.isLoading;
  const error = candidatesState.error || jobsState.error || clientsState.error;

  const metrics = useMemo(() => {
    const candidates = candidatesState.data || [];
    const jobs = jobsState.data || [];
    const clients = clientsState.data || [];

    return {
      totalClients: clients.length,
      activeClients: clients.filter((client) => String(client.status).toLowerCase() === "active").length,
      activeJobs: jobs.filter((job) => String(job.status).toLowerCase() === "active").length,
      pendingApprovals: jobs.filter((job) => String(job.approval).toLowerCase() === "pending").length,
      activePipelineCandidates: candidates.filter((candidate) => {
        const status = String(candidate.status).toLowerCase();
        return status === "sourced" || status === "applied" || status === "interviewing" || status === "offer";
      }).length,
      recentClients: clients.slice(0, 5),
    };
  }, [candidatesState.data, jobsState.data, clientsState.data]);

  // Sales person's book of business: each active client with their open vacancy count
  // and the candidates in play across those vacancies. Candidates aren't linked to a
  // client directly, so the candidate count is summed from the applicant counts of the
  // client's linked jobs.
  const pipelineByClient = useMemo(() => {
    const clients = clientsState.data || [];
    const jobs = jobsState.data || [];

    return clients
      .filter((client) => String(client.status).toLowerCase() === "active")
      .map((client) => {
        const clientJobs = jobs.filter((job) => job.clientId === client.id);
        return {
          id: client.id,
          name: client.name,
          openJobs: clientJobs.filter((job) => String(job.status).toLowerCase() === "active").length,
          activeCandidates: clientJobs.reduce((sum, job) => sum + (job.candidates ?? 0), 0),
        };
      })
      .sort((a, b) => b.openJobs - a.openJobs);
  }, [clientsState.data, jobsState.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sales Dashboard</h1>
        <p className="text-muted-foreground">Live business and pipeline metrics for your team.</p>
      </div>

      {error && (
        <Card>
          <CardHeader>
            <CardTitle>Could not load metrics</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Clients", value: metrics.totalClients },
          { label: "Active Clients", value: metrics.activeClients },
          { label: "Active Jobs", value: metrics.activeJobs },
          { label: "Pending Approvals", value: metrics.pendingApprovals },
          { label: "Pipeline Candidates", value: metrics.activePipelineCandidates },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <p className="text-3xl font-semibold">{value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline by Client</CardTitle>
          <CardDescription>Open vacancies and candidates in play across your active clients.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : pipelineByClient.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active clients yet. Add a client and link jobs to build your pipeline.</p>
          ) : (
            <div className="space-y-2">
              {pipelineByClient.map((client) => (
                <div key={client.id} className="flex flex-col gap-1 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/clients/${client.id}`} className="font-medium hover:underline">{client.name}</Link>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-800">
                      {client.openJobs} open {client.openJobs === 1 ? "vacancy" : "vacancies"}
                    </span>
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 font-medium text-purple-800">
                      {client.activeCandidates} candidate{client.activeCandidates === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Clients</CardTitle>
            <CardDescription>Most recently loaded client records.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : metrics.recentClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No client records yet.</p>
            ) : (
              <div className="space-y-2">
                {metrics.recentClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className="font-medium">{client.name}</span>
                    <span className="text-sm text-muted-foreground">{client.status}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for sales operations.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/clients"><Building className="mr-2 h-4 w-4" /> Manage Clients</Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/jobs"><Users className="mr-2 h-4 w-4" /> View Job Board</Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/company-finder"><Users className="mr-2 h-4 w-4" /> Smart Lead Finder</Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/reports"><Users className="mr-2 h-4 w-4" /> View Reports</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
