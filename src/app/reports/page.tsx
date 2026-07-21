
"use client"

import { useEffect, useMemo, useState } from "react"
import { addDays, format } from "date-fns"
import { DateRange } from "react-day-picker"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Users, Briefcase, DollarSign, Target, TrendingUp, UserCheck, Percent, Download, Calendar as CalendarIcon, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/auth-context"
import { useCandidates, useClients, useCompany, useCurrentProfile, useJobs, useSubmissions } from "@/lib/data/hooks"
import { getJson } from "@/lib/api-client"
import type { CompanyMemberRecord } from "@/server/api/company-members"
import { currencySymbol, formatPrice } from "@/lib/currency"


// Submission statuses grouped into the client-facing sales funnel. Values are
// summed from real submissions' placementFee (company currency); see salesMetrics.
const FUNNEL_STAGES: { label: string; statuses: string[] }[] = [
  { label: "Submitted", statuses: ["submitted"] },
  { label: "Client Reviewing", statuses: ["client_reviewing"] },
  { label: "Interviewing", statuses: ["interview_scheduled", "interview_completed"] },
  { label: "Offer", statuses: ["offer_extended", "offer_accepted"] },
  { label: "Placed", statuses: ["placed"] },
]

const placementsChartConfig = {
  placements: {
    label: "Placements",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export default function ReportsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: profile } = useCurrentProfile(user);
  const { data: candidates } = useCandidates(profile?.companyId);
  const { data: submissions } = useSubmissions(profile?.companyId);
  const { data: jobs } = useJobs(profile?.companyId);
  const { data: clients } = useClients(profile?.companyId);
  const { data: company } = useCompany(profile?.companyId);
  const currency = company?.currency ?? 'ZAR';
  const showSampleDataBanner = (candidates?.length ?? 0) < 20;

  // Team members, used to attribute placements to real recruiters in the
  // leaderboard and to populate the recruiter/sales-rep filters. Best-effort:
  // on failure (e.g. mock mode) the leaderboard simply shows an empty state.
  const [members, setMembers] = useState<CompanyMemberRecord[]>([]);
  useEffect(() => {
    if (!profile?.companyId) return;
    let cancelled = false;
    getJson<CompanyMemberRecord[]>('/api/company/members')
      .then((data) => { if (!cancelled) setMembers(data); })
      .catch(() => { if (!cancelled) setMembers([]); });
    return () => { cancelled = true; };
  }, [profile?.companyId]);

  // Successful placements metric: real submissions in the placed state. Compares
  // this calendar month against last month so the delta line stays meaningful as
  // data accumulates. Falls back to a "no prior baseline" copy when last month is
  // empty (avoids divide-by-zero and misleading +Infinity% labels).
  const placementsMetric = useMemo(() => {
    const placed = (submissions || []).filter((sub) => sub.status === 'placed');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const placedAt = (iso?: string) => (iso ? new Date(iso) : null);

    const thisMonth = placed.filter((sub) => {
      const date = placedAt(sub.placementDate);
      return date && Number.isFinite(date.getTime()) && date >= monthStart;
    }).length;
    const lastMonth = placed.filter((sub) => {
      const date = placedAt(sub.placementDate);
      return date && Number.isFinite(date.getTime()) && date >= prevMonthStart && date < monthStart;
    }).length;

    let deltaLabel: string;
    if (lastMonth === 0 && thisMonth === 0) {
      deltaLabel = 'No placements yet';
    } else if (lastMonth === 0) {
      deltaLabel = `+${thisMonth} this month`;
    } else {
      const pct = ((thisMonth - lastMonth) / lastMonth) * 100;
      const sign = pct >= 0 ? '+' : '';
      deltaLabel = `${sign}${pct.toFixed(1)}% from last month`;
    }

    return { total: placed.length, deltaLabel };
  }, [submissions]);

  // Real money metrics, all in the company's currency. placementFee is only
  // populated once a submission reaches placement, so pipeline potential and
  // funnel values stay at 0 until fees are recorded — that's the honest state,
  // and the "Sample Data" banner already warns early-stage tenants.
  const feeOf = (fee?: number) => (typeof fee === 'number' && Number.isFinite(fee) ? fee : 0);

  const salesMetrics = useMemo(() => {
    const subs = submissions || [];
    const terminal = new Set(['placed', 'rejected', 'withdrew']);
    const pipelineValue = subs
      .filter((s) => !terminal.has(s.status))
      .reduce((sum, s) => sum + feeOf(s.placementFee), 0);
    const funnel = FUNNEL_STAGES.map((stage) => {
      const inStage = subs.filter((s) => stage.statuses.includes(s.status));
      return {
        stage: stage.label,
        value: inStage.reduce((sum, s) => sum + feeOf(s.placementFee), 0),
        count: inStage.length,
      };
    });
    return { pipelineValue, funnel };
  }, [submissions]);

  const executiveMetrics = useMemo(() => {
    const placed = (submissions || []).filter((s) => s.status === 'placed');
    const withFee = placed.filter((s) => typeof s.placementFee === 'number');
    const totalRevenue = withFee.reduce((sum, s) => sum + feeOf(s.placementFee), 0);
    const avgFee = withFee.length ? totalRevenue / withFee.length : 0;

    // Last 6 calendar months of placement revenue, oldest first.
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        month: d.toLocaleString('en-US', { month: 'short' }),
        revenue: 0,
        placements: 0,
      };
    });
    const byKey = new Map(months.map((m) => [m.key, m]));
    for (const s of placed) {
      if (!s.placementDate) continue;
      const d = new Date(s.placementDate);
      if (Number.isNaN(d.getTime())) continue;
      const bucket = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (bucket) {
        bucket.revenue += feeOf(s.placementFee);
        bucket.placements += 1;
      }
    }
    return { totalRevenue, avgFee, totalPlacements: placed.length, monthly: months };
  }, [submissions]);

  const executiveChartConfig = useMemo(
    () =>
      ({
        revenue: {
          label: `Revenue (${currencySymbol[currency]})`,
          color: 'hsl(var(--primary))',
        },
        placements: {
          label: 'Placements',
          color: 'hsl(var(--accent-foreground))',
        },
      }) satisfies ChartConfig,
    [currency]
  );

  // Recruiter-tab KPIs, computed from the tenant's real candidates & submissions.
  const recruiterKpis = useMemo(() => {
    const subs = submissions || [];
    const candidateCount = (candidates || []).length;
    const interviews = subs.filter(
      (s) => s.status === 'interview_scheduled' || s.status === 'interview_completed'
    ).length;
    const offers = subs.filter(
      (s) => s.status === 'offer_extended' || s.status === 'offer_accepted'
    ).length;
    const placements = subs.filter((s) => s.status === 'placed').length;
    const sourcedToPlacement = candidateCount > 0 ? (placements / candidateCount) * 100 : 0;
    return { candidateCount, interviews, offers, sourcedToPlacement };
  }, [submissions, candidates]);

  // Leaderboard: placed submissions attributed to the recruiter who submitted
  // them (submittedBy), with average time-to-fill (placementDate − createdAt).
  const recruiterLeaderboard = useMemo(() => {
    const nameById = new Map(members.map((m) => [m.id, m.name || m.email || 'Unknown']));
    const byRecruiter = new Map<
      string,
      { name: string; placements: number; totalDays: number; filled: number }
    >();
    for (const s of submissions || []) {
      if (s.status !== 'placed' || !s.submittedBy) continue;
      const entry =
        byRecruiter.get(s.submittedBy) ??
        { name: nameById.get(s.submittedBy) ?? 'Unknown', placements: 0, totalDays: 0, filled: 0 };
      entry.placements += 1;
      if (s.placementDate && s.createdAt) {
        const days =
          (new Date(s.placementDate).getTime() - new Date(s.createdAt).getTime()) / 86_400_000;
        if (Number.isFinite(days) && days >= 0) {
          entry.totalDays += days;
          entry.filled += 1;
        }
      }
      byRecruiter.set(s.submittedBy, entry);
    }
    return Array.from(byRecruiter.values())
      .map((e) => ({
        name: e.name,
        placements: e.placements,
        timeToFill: e.filled ? String(Math.round(e.totalDays / e.filled)) : '—',
      }))
      .sort((a, b) => b.placements - a.placements);
  }, [submissions, members]);

  // Sales-tab KPIs from real clients, jobs and submissions.
  const salesKpis = useMemo(() => {
    const subs = submissions || [];
    const allJobs = jobs || [];
    const activeJobs = allJobs.filter((j) => String(j.status).toLowerCase() === 'active').length;
    const clientCount = (clients || []).length;
    const placed = subs.filter((s) => s.status === 'placed').length;
    const conversionRate = subs.length > 0 ? (placed / subs.length) * 100 : 0;
    const fillRate = allJobs.length > 0 ? (placed / allJobs.length) * 100 : 0;
    return { activeJobs, clientCount, conversionRate, fillRate };
  }, [jobs, clients, submissions]);

  // Real recruiter options for the report filters (falls back to empty).
  const recruiterFilterOptions = useMemo(
    () =>
      members.map((m) => ({
        value: m.id,
        label: m.name || m.email || 'Unknown',
      })),
    [members]
  );

  const [recruiterDate, setRecruiterDate] = useState<DateRange | undefined>({ from: addDays(new Date(), -30), to: new Date() });
  const [salesDate, setSalesDate] = useState<DateRange | undefined>({ from: addDays(new Date(), -90), to: new Date() });
  const [executiveDate, setExecutiveDate] = useState<DateRange | undefined>({ from: addDays(new Date(), -180), to: new Date() });

  const downloadReport = async (reportId: string, fileName: string) => {
    const input = document.getElementById(reportId);
    if (!input) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not find report content to download.' });
      return;
    }
    toast({ title: 'Generating PDF...', description: 'Please wait a moment.' });
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    html2canvas(input, { scale: 2, useCORS: true })
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        const imgWidth = pdfWidth;
        const imgHeight = imgWidth / ratio;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        pdf.save(`${fileName}_report.pdf`);
        toast({ title: 'PDF Downloaded!', description: 'Your report has been saved successfully.' });
      })
      .catch(err => {
        toast({ variant: 'destructive', title: 'PDF Generation Failed', description: 'An error occurred while creating the PDF.' });
        console.error(err);
      });
  };
  
  const FilterBar = ({
    date,
    setDate,
    selectOptions,
    selectPlaceholder,
    reportId,
    reportName,
  }: {
    date: DateRange | undefined;
    setDate: (date: DateRange | undefined) => void;
    selectOptions?: { value: string; label: string }[];
    selectPlaceholder?: string;
    reportId: string;
    reportName: string;
  }) => (
    <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <CardTitle className="text-lg">Filters & Actions</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "w-[240px] justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? (
                                date.to ? (
                                    <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(date.from, "LLL dd, y")
                                )
                                ) : (
                                <span>Pick a date</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="z-50 w-auto p-0" align="end">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
                    {selectOptions && (
                        <Select>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={selectPlaceholder || "Select..."} />
                            </SelectTrigger>
                            <SelectContent>
                                {selectOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <Button onClick={() => downloadReport(reportId, reportName)}>
                        <Download className="mr-2 h-4 w-4"/>
                        Download PDF
                    </Button>
                </div>
            </div>
        </CardHeader>
    </Card>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Track performance, monitor pipelines, and gain valuable insights.
        </p>
      </div>

      {showSampleDataBanner && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Sample Data</AlertTitle>
          <AlertDescription className="text-blue-700">
            You are viewing sample data. Your real metrics will appear here as you add candidates and complete placements.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="recruiter" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recruiter">Recruiter Performance</TabsTrigger>
          <TabsTrigger value="sales">Sales Pipeline</TabsTrigger>
          <TabsTrigger value="executive">Executive Summary</TabsTrigger>
        </TabsList>
        
        <TabsContent value="recruiter" className="mt-6 space-y-6">
          <FilterBar
            date={recruiterDate}
            setDate={setRecruiterDate}
            selectOptions={recruiterFilterOptions}
            selectPlaceholder="Filter by Recruiter"
            reportId="recruiter-report"
            reportName="recruiter_performance"
          />
          <div id="recruiter-report" className="space-y-6 bg-background p-4 rounded-lg">
            <Card>
              <CardHeader>
                <CardTitle>Recruiter KPIs</CardTitle>
                <CardDescription>Key performance indicators for the recruitment team.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Candidates Sourced</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{recruiterKpis.candidateCount}</div>
                    <p className="text-xs text-muted-foreground">In your pipeline</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Interviews Scheduled</CardTitle>
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{recruiterKpis.interviews}</div>
                    <p className="text-xs text-muted-foreground">Scheduled &amp; completed</p>
                  </CardContent>
                </Card>
                 <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Offers Extended</CardTitle>
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{recruiterKpis.offers}</div>
                    <p className="text-xs text-muted-foreground">Extended &amp; accepted</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Successful Placements</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{placementsMetric.total}</div>
                    <p className="text-xs text-muted-foreground">{placementsMetric.deltaLabel}</p>
                  </CardContent>
                </Card>
                 <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Sourced to Placement Rate</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{recruiterKpis.sourcedToPlacement.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">Placements ÷ candidates</p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
            
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Placements Over Time</CardTitle>
                  <CardDescription>Monthly successful placements in the last 6 months.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={placementsChartConfig} className="h-[250px] w-full">
                    <BarChart data={executiveMetrics.monthly} accessibilityLayer>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="placements" fill="var(--color-placements)" radius={4} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Recruiter Leaderboard</CardTitle>
                  <CardDescription>Top performers by successful placements.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recruiter</TableHead>
                        <TableHead className="text-right">Placements</TableHead>
                        <TableHead className="text-right">Avg. Time-to-Fill (Days)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recruiterLeaderboard.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">
                            No placements recorded yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        recruiterLeaderboard.map((recruiter) => (
                          <TableRow key={recruiter.name}>
                            <TableCell className="font-medium">{recruiter.name}</TableCell>
                            <TableCell className="text-right">{recruiter.placements}</TableCell>
                            <TableCell className="text-right">{recruiter.timeToFill}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="mt-6 space-y-6">
            <FilterBar
                date={salesDate}
                setDate={setSalesDate}
                selectOptions={recruiterFilterOptions}
                selectPlaceholder="Filter by Sales Rep"
                reportId="sales-report"
                reportName="sales_pipeline"
            />
            <div id="sales-report" className="space-y-6 bg-background p-4 rounded-lg">
               <Card>
                <CardHeader>
                  <CardTitle>Sales KPIs</CardTitle>
                   <CardDescription>Key performance indicators for the sales team.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{salesKpis.clientCount}</div>
                       <p className="text-xs text-muted-foreground">Active client accounts</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Open Job Orders</CardTitle>
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{salesKpis.activeJobs}</div>
                      <p className="text-xs text-muted-foreground">Across {salesKpis.clientCount} clients</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatPrice(salesMetrics.pipelineValue, currency)}</div>
                      <p className="text-xs text-muted-foreground">Estimated potential revenue</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                      <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{salesKpis.conversionRate.toFixed(0)}%</div>
                      <p className="text-xs text-muted-foreground">Submissions to placements</p>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
               <Card>
                  <CardHeader>
                    <CardTitle>Sales Funnel</CardTitle>
                    <CardDescription>Value and count of clients at each stage.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Stage</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                          <TableHead className="text-right">Job Orders</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesMetrics.funnel.map((item) => (
                          <TableRow key={item.stage}>
                            <TableCell className="font-medium">{item.stage}</TableCell>
                            <TableCell className="text-right">{formatPrice(item.value, currency)}</TableCell>
                            <TableCell className="text-right">{item.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="executive" className="mt-6 space-y-6">
            <FilterBar
                date={executiveDate}
                setDate={setExecutiveDate}
                reportId="executive-report"
                reportName="executive_summary"
            />
            <div id="executive-report" className="space-y-6 bg-background p-4 rounded-lg">
                <Card>
                    <CardHeader>
                        <CardTitle>Business Overview</CardTitle>
                        <CardDescription>High-level view of company performance.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={executiveChartConfig} className="h-[300px] w-full">
                            <LineChart data={executiveMetrics.monthly} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="month" />
                                <YAxis yAxisId="left" stroke="var(--color-revenue)" />
                                <YAxis yAxisId="right" orientation="right" stroke="var(--color-placements)" />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} />
                                <Line yAxisId="right" type="monotone" dataKey="placements" stroke="var(--color-placements)" strokeWidth={2} />
                            </LineChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                   <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatPrice(executiveMetrics.totalRevenue, currency)}</div>
                        <p className="text-xs text-muted-foreground">From completed placements</p>
                      </CardContent>
                    </Card>
                     <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Placement Fee</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatPrice(Math.round(executiveMetrics.avgFee), currency)}</div>
                        <p className="text-xs text-muted-foreground">Across placed candidates</p>
                      </CardContent>
                    </Card>
                     <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Placements</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{executiveMetrics.totalPlacements}</div>
                        <p className="text-xs text-muted-foreground">Completed placements</p>
                      </CardContent>
                    </Card>
                     <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Job Fill Rate</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{salesKpis.fillRate.toFixed(0)}%</div>
                        <p className="text-xs text-muted-foreground">Placements vs. Openings</p>
                      </CardContent>
                    </Card>
                </div>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

    
