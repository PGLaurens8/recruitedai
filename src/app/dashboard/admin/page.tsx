"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useCandidates, useClients, useJobs } from "@/lib/data/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Briefcase,
  Building,
  Star,
  UserPlus,
  Mic2,
  Contact,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  const candidatesState = useCandidates(companyId);
  const jobsState = useJobs(companyId);
  const clientsState = useClients(companyId);

  const isLoading = candidatesState.isLoading || jobsState.isLoading || clientsState.isLoading;

  const metrics = useMemo(() => {
    const candidates = candidatesState.data || [];
    const jobs = jobsState.data || [];
    const clients = clientsState.data || [];
    return {
      totalCandidates: candidates.length,
      activeJobs: jobs.filter((j) => String(j.status).toLowerCase() === "active").length,
      totalClients: clients.length,
      interviewing: candidates.filter((c) => c.status === "Interviewing").length,
      recentCandidates: [...candidates]
        .sort((a, b) => (a.name < b.name ? -1 : 1))
        .slice(0, 5),
    };
  }, [candidatesState.data, jobsState.data, clientsState.data]);

  const statCards = [
    { title: "Total Candidates", value: metrics.totalCandidates, icon: <Users className="h-5 w-5 text-blue-500" />, iconBg: "bg-blue-100" },
    { title: "Active Jobs", value: metrics.activeJobs, icon: <Briefcase className="h-5 w-5 text-green-500" />, iconBg: "bg-green-100" },
    { title: "Active Clients", value: metrics.totalClients, icon: <Contact className="h-5 w-5 text-purple-500" />, iconBg: "bg-purple-100" },
    { title: "Interviewing", value: metrics.interviewing, icon: <Star className="h-5 w-5 text-orange-500" />, iconBg: "bg-orange-100" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Agency Overview</h1>
        <p className="text-muted-foreground">Live metrics for your recruitment agency.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`flex items-center justify-center h-8 w-8 rounded-full ${card.iconBg}`}>
                {card.icon}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <div className="text-3xl font-bold">{card.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Candidates</CardTitle>
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
            ) : metrics.recentCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No candidates yet.</p>
            ) : (
              <div className="space-y-2">
                {metrics.recentCandidates.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <Link href={`/candidates/${c.id}`} className="font-medium hover:underline text-sm">{c.name}</Link>
                    <span className="text-sm text-muted-foreground">{c.status}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/candidates">View All Candidates</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/ai-parser"><UserPlus className="mr-2 h-4 w-4" /> Add Candidate via Smart Parser</Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/jobs/new"><Mic2 className="mr-2 h-4 w-4" /> AI Brief Builder</Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/clients"><Building className="mr-2 h-4 w-4" /> Manage Clients</Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/team"><Users className="mr-2 h-4 w-4" /> Team Management</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
