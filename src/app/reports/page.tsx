
"use client"

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

import { Users, Briefcase, DollarSign, Target, TrendingUp, Calendar, UserCheck, Percent } from "lucide-react"

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
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Track performance, monitor pipelines, and gain valuable insights.
        </p>
      </div>

      <Tabs defaultValue="recruiter" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recruiter">Recruiter Performance</TabsTrigger>
          <TabsTrigger value="sales">Sales Pipeline</TabsTrigger>
          <TabsTrigger value="executive">Executive Summary</TabsTrigger>
        </TabsList>
        
        {/* Recruiter Performance Tab */}
        <TabsContent value="recruiter" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recruiter KPIs (This Month)</CardTitle>
              <CardDescription>Key performance indicators for the recruitment team.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
        </TabsContent>

        {/* Sales Pipeline Tab */}
        <TabsContent value="sales" className="mt-6 space-y-6">
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
        </TabsContent>

        {/* Executive Summary Tab */}
        <TabsContent value="executive" className="mt-6 space-y-6">
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
