
"use client"

import { useState } from "react"
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
import { Users, Briefcase, DollarSign, Target, TrendingUp, UserCheck, Percent, Download, Calendar as CalendarIcon, FlaskConical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const recruiterStats = [
  { name: "Anna Smith", placements: 12, timeToFill: 28 },
  { name: "John Doe", placements: 9, timeToFill: 35 },
  { name: "Maria Garcia", placements: 8, timeToFill: 31 },
]

const salesPipeline = [
  { stage: "Prospecting", value: 150000, count: 25 },
  { stage: "Qualification", value: 120000, count: 20 },
  { stage: "Proposal Sent", value: 95000, count: 15 },
  { stage: "Negotiation", value: 60000, count: 8 },
  { stage: "Closed-Won", value: 45000, count: 5 },
]

const monthlyPlacements = [
  { month: "Jan", placements: 5 },
  { month: "Feb", placements: 8 },
  { month: "Mar", placements: 12 },
  { month: "Apr", placements: 10 },
  { month: "May", placements: 15 },
  { month: "Jun", placements: 18 },
]
const placementsChartConfig = {
  placements: {
    label: "Placements",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

const executiveData = [
    { month: "Jan", revenue: 50000, placements: 5 },
    { month: "Feb", revenue: 80000, placements: 8 },
    { month: "Mar", revenue: 120000, placements: 12 },
    { month: "Apr", revenue: 100000, placements: 10 },
    { month: "May", revenue: 150000, placements: 15 },
    { month: "Jun", revenue: 180000, placements: 18 },
]
const executiveChartConfig = {
    revenue: {
        label: "Revenue ($)",
        color: "hsl(var(--primary))",
    },
    placements: {
        label: "Placements",
        color: "hsl(var(--accent-foreground))",
    },
} satisfies ChartConfig


export default function ReportsPage() {
  const { toast } = useToast();
  const [recruiterDate, setRecruiterDate] = useState<DateRange | undefined>({ from: addDays(new Date(), -30), to: new Date() });
  const [salesDate, setSalesDate] = useState<DateRange | undefined>({ from: addDays(new Date(), -90), to: new Date() });
  const [executiveDate, setExecutiveDate] = useState<DateRange | undefined>({ from: addDays(new Date(), -180), to: new Date() });

  const downloadReport = (reportId: string, fileName: string) => {
    const input = document.getElementById(reportId);
    if (!input) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not find report content to download.' });
      return;
    }
    toast({ title: 'Generating PDF...', description: 'Please wait a moment.' });
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
                        <PopoverContent className="w-auto p-0" align="end">
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

      <Alert className="border-amber-200 bg-amber-50">
        <FlaskConical className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Sample Data</AlertTitle>
        <AlertDescription className="text-amber-700">
          The charts and figures on this page use illustrative sample data. Live analytics connected to your actual pipeline are coming in a future update.
        </AlertDescription>
      </Alert>

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
            selectOptions={recruiterStats.map(r => ({ value: r.name.toLowerCase().replace(' ', '-'), label: r.name }))}
            selectPlaceholder="Filter by Recruiter"
            reportId="recruiter-report"
            reportName="recruiter_performance"
          />
          <div id="recruiter-report" className="space-y-6 bg-background p-4 rounded-lg">
            <Card>
              <CardHeader>
                <CardTitle>Recruiter KPIs (This Month)</CardTitle>
                <CardDescription>Key performance indicators for the recruitment team.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Candidates Sourced</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">452</div>
                    <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Interviews Scheduled</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">128</div>
                    <p className="text-xs text-muted-foreground">+15.2% from last month</p>
                  </CardContent>
                </Card>
                 <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Offers Extended</CardTitle>
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">45</div>
                    <p className="text-xs text-muted-foreground">+10% from last month</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Successful Placements</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">23</div>
                    <p className="text-xs text-muted-foreground">+8.5% from last month</p>
                  </CardContent>
                </Card>
                 <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Sourced to Placement Rate</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">5.1%</div>
                    <p className="text-xs text-muted-foreground">-2% from last month</p>
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
                    <BarChart data={monthlyPlacements} accessibilityLayer>
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
                      {recruiterStats.map((recruiter) => (
                        <TableRow key={recruiter.name}>
                          <TableCell className="font-medium">{recruiter.name}</TableCell>
                          <TableCell className="text-right">{recruiter.placements}</TableCell>
                          <TableCell className="text-right">{recruiter.timeToFill}</TableCell>
                        </TableRow>
                      ))}
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
                selectOptions={[{ value: 'rep1', label: 'Sales Rep 1'}, { value: 'rep2', label: 'Sales Rep 2'}]}
                selectPlaceholder="Filter by Sales Rep"
                reportId="sales-report"
                reportName="sales_pipeline"
            />
            <div id="sales-report" className="space-y-6 bg-background p-4 rounded-lg">
               <Card>
                <CardHeader>
                  <CardTitle>Sales KPIs (This Quarter)</CardTitle>
                   <CardDescription>Key performance indicators for the sales team.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">New Clients Acquired</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">12</div>
                       <p className="text-xs text-muted-foreground">+5 from last quarter</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Open Job Orders</CardTitle>
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">89</div>
                      <p className="text-xs text-muted-foreground">Across 34 clients</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$250,500</div>
                      <p className="text-xs text-muted-foreground">Estimated potential revenue</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                      <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">18%</div>
                      <p className="text-xs text-muted-foreground">From prospect to client</p>
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
                        {salesPipeline.map((item) => (
                          <TableRow key={item.stage}>
                            <TableCell className="font-medium">{item.stage}</TableCell>
                            <TableCell className="text-right">${item.value.toLocaleString()}</TableCell>
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
                            <LineChart data={executiveData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
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
                        <CardTitle className="text-sm font-medium">Total Revenue (Q2)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">$450,231.89</div>
                        <p className="text-xs text-muted-foreground">+20.1% from last quarter</p>
                      </CardContent>
                    </Card>
                     <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Placement Fee</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">$19,575</div>
                        <p className="text-xs text-muted-foreground">Up 5% from last quarter</p>
                      </CardContent>
                    </Card>
                     <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Placements (Q2)</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">43</div>
                        <p className="text-xs text-muted-foreground">+12 from last quarter</p>
                      </CardContent>
                    </Card>
                     <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Job Fill Rate</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">75%</div>
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

    
