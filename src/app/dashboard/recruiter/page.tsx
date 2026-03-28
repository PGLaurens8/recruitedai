"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useCandidates, useClients, useJobs } from "@/lib/data/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Mic2, FilePlus2, Search } from "lucide-react";

function formatAverageScore(values: number[]) {
  if (values.length === 0) {
    return "N/A";
  }

  const avg = values.reduce((sum, current) => sum + current, 0) / values.length;
  return `${Math.round(avg)}`;
}

export default function RecruiterDashboardPage() {
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

    const scoredCandidates = candidates
      .map((candidate) => candidate.aiScore)
      .filter((score): score is number => typeof score === "number");

    return {
      totalCandidates: candidates.length,
      interviewingCandidates: candidates.filter((candidate) => candidate.status === "Interviewing").length,
      activeJobs: jobs.filter((job) => String(job.status).toLowerCase() === "active").length,
      totalClients: clients.length,
      averageAiScore: formatAverageScore(scoredCandidates),
      recentCandidates: candidates.slice(0, 5),
    };
  }, [candidatesState.data, jobsState.data, clientsState.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Recruiter Dashboard</h1>
        <p className="text-muted-foreground">Live hiring metrics for your current workspace.</p>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Could not load metrics</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Candidates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{isLoading ? "..." : metrics.totalCandidates}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Interviewing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{isLoading ? "..." : metrics.interviewingCandidates}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{isLoading ? "..." : metrics.activeJobs}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{isLoading ? "..." : metrics.totalClients}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average AI Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{isLoading ? "..." : metrics.averageAiScore}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for recruitment operations.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/jobs/new">
                <Mic2 className="mr-2 h-4 w-4" /> Create Job Brief (Voice)
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/ai-parser">
                <UserPlus className="mr-2 h-4 w-4" /> Smart Parse Resume
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/interview-analysis">
                <FilePlus2 className="mr-2 h-4 w-4" /> Start AI Note Taker
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/company-finder">
                <Search className="mr-2 h-4 w-4" /> Find Matching Leads
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Candidates</CardTitle>
            <CardDescription>Most recently loaded candidate records.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading candidates...</p>
            ) : metrics.recentCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No candidate records yet.</p>
            ) : (
              <div className="space-y-2">
                {metrics.recentCandidates.map((candidate) => (
                  <div key={candidate.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className="font-medium">{candidate.name}</span>
                    <span className="text-sm text-muted-foreground">{candidate.status}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
