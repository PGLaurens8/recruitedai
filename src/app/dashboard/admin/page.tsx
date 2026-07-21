"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useCandidates, useClients, useJobs } from "@/lib/data/hooks";
import { getJson } from "@/lib/api-client";
import type { AiStats } from "@/app/api/admin/ai-stats/route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OnboardingChecklist } from "@/components/feature/onboarding-checklist";
import { TrialBanner } from "@/components/feature/trial-banner";
import {
  Users,
  Briefcase,
  Building,
  Star,
  UserPlus,
  Mic2,
  Contact,
  Activity,
  DollarSign,
  Clock,
  Zap,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  const candidatesState = useCandidates(companyId);
  const jobsState = useJobs(companyId);
  const clientsState = useClients(companyId);

  const isLoading = candidatesState.isLoading || jobsState.isLoading || clientsState.isLoading;

  // AI usage stats for the current calendar month. Best-effort: if the request
  // fails (e.g. mock mode with no backend), the card simply shows zeros/—.
  const [aiStats, setAiStats] = useState<AiStats | null>(null);
  const [aiStatsLoading, setAiStatsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    setAiStatsLoading(true);
    getJson<AiStats>("/api/admin/ai-stats")
      .then((stats) => {
        if (!cancelled) setAiStats(stats);
      })
      .catch(() => {
        if (!cancelled) setAiStats(null);
      })
      .finally(() => {
        if (!cancelled) setAiStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

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

  // Sublabels are honest descriptors, not fabricated week-over-week deltas —
  // there is no historical time-series to compute a real trend from yet.
  const statCards = [
    { title: "Total Candidates", value: metrics.totalCandidates, icon: <Users className="h-5 w-5 text-blue-500" />, iconBg: "bg-blue-100", border: "border-l-4 border-l-blue-500", trend: "In your company", trendClass: "text-muted-foreground" },
    { title: "Active Vacancies", value: metrics.activeJobs, icon: <Briefcase className="h-5 w-5 text-green-500" />, iconBg: "bg-green-100", border: "border-l-4 border-l-green-500", trend: "Currently active", trendClass: "text-muted-foreground" },
    { title: "Active Clients", value: metrics.totalClients, icon: <Contact className="h-5 w-5 text-purple-500" />, iconBg: "bg-purple-100", border: "border-l-4 border-l-purple-500", trend: "Total client accounts", trendClass: "text-muted-foreground" },
    { title: "Interviewing", value: metrics.interviewing, icon: <Star className="h-5 w-5 text-orange-500" />, iconBg: "bg-orange-100", border: "border-l-4 border-l-amber-500", trend: "In interview stage", trendClass: "text-muted-foreground" },
  ];

  // The AI-usage panel is an operational metric (provider cost is genuinely in
  // USD — Gemini bills in USD). It's most relevant to the Developer/operator
  // account, so we keep it prominent (up top) for Developers and tuck it at the
  // bottom of the page for regular agency admins.
  const isDeveloper = user?.role === "Developer";
  const aiUsageCard = (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5 text-indigo-500" />
          AI Usage This Month
        </CardTitle>
      </CardHeader>
      <CardContent>
        {aiStatsLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100">
                <Zap className="h-4 w-4 text-indigo-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{aiStats?.totalCalls ?? 0}</div>
                <p className="text-xs text-muted-foreground">Total AI calls</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
                <DollarSign className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  ${(aiStats?.estimatedCostUsd ?? 0).toFixed(4)}
                </div>
                <p className="text-xs text-muted-foreground">Est. AI provider cost (USD)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100">
                <Star className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <div className="truncate text-2xl font-bold">
                  {aiStats?.mostUsedFlow ?? "—"}
                </div>
                <p className="text-xs text-muted-foreground">Most used flow</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {((aiStats?.averageDurationMs ?? 0) / 1000).toFixed(1)}s
                </div>
                <p className="text-xs text-muted-foreground">Avg response time</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-3xl font-bold">Agency Overview</h1>
        <p className="text-muted-foreground">Live metrics for your recruitment agency.</p>
      </div>

      <TrialBanner />

      <OnboardingChecklist
        candidatesCount={candidatesState.data?.length ?? 0}
        clientsCount={clientsState.data?.length ?? 0}
        jobsCount={jobsState.data?.length ?? 0}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className={card.border}>
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
                <>
                  <div className="text-3xl font-bold">{card.value}</div>
                  <p className={`mt-1 text-xs font-medium ${card.trendClass}`}>{card.trend}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {isDeveloper && aiUsageCard}

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

      {!isDeveloper && aiUsageCard}
    </div>
  );
}
