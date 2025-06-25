
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Briefcase,
  Building,
  Star,
  Clock,
  CheckCircle,
  Mail,
  TrendingUp,
  UserPlus,
  FilePlus,
  Send,
  Contact
} from "lucide-react";

const statCards = [
  {
    title: "Active Candidates",
    value: "1,247",
    change: "+12%",
    icon: <Users className="h-5 w-5 text-blue-500" />,
    iconBg: "bg-blue-100",
  },
  {
    title: "Open Positions",
    value: "89",
    change: "+8%",
    icon: <Briefcase className="h-5 w-5 text-green-500" />,
    iconBg: "bg-green-100",
  },
  {
    title: "Active Clients",
    value: "156",
    change: "+15%",
    icon: <Contact className="h-5 w-5 text-purple-500" />,
    iconBg: "bg-purple-100",
  },
  {
    title: "Placements This Month",
    value: "23",
    change: "+25%",
    icon: <TrendingUp className="h-5 w-5 text-orange-500" />,
    iconBg: "bg-orange-100",
  },
];

const matchingPipeline = [
  {
    title: "Senior Developer - TechCorp",
    match: 98,
    color: "bg-green-500",
  },
  {
    title: "Marketing Manager - StartupXYZ",
    match: 85,
    color: "bg-blue-500",
  },
  {
    title: "Data Scientist - BigTech",
    match: 78,
    color: "bg-purple-500",
  },
  {
    title: "DevOps Engineer - CloudTech",
    match: 72,
    color: "bg-orange-500",
  },
];

const recentActivity = [
    {
        icon: <Star className="h-5 w-5 text-yellow-500" />,
        title: "High match found for Senior Developer",
        description: "Candidate: Sarah Johnson",
        time: "2 hours ago",
        match: 92
    },
    {
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        title: "Job posting approved",
        description: "Marketing Manager at TechCorp",
        time: "4 hours ago",
    },
    {
        icon: <Mail className="h-5 w-5 text-blue-500" />,
        title: "Automated follow-up sent",
        description: "Candidate: Mike Chen",
        time: "6 hours ago",
    },
    {
        icon: <Star className="h-5 w-5 text-yellow-500" />,
        title: "New candidate uploaded",
        description: "Candidate: Alex Rodriguez",
        time: "8 hours ago",
        match: 87
    }
]

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Top Stats Cards */}
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
              <div className="text-3xl font-bold">{card.value}</div>
              <p className="text-xs text-green-500">{card.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* AI Matching Pipeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="h-5 w-5 mr-2 text-primary" />
              AI Matching Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {matchingPipeline.map((item) => (
              <div key={item.title}>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  <span className="text-sm font-semibold text-primary">{item.match}% Match</span>
                </div>
                <Progress value={item.match} className="h-2" indicatorClassName={item.color} />
              </div>
            ))}
          </CardContent>
           <CardFooter>
            <Button variant="outline" className="w-full">View All Matches</Button>
          </CardFooter>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-4">
                    <div className="p-2 bg-muted rounded-full mt-1">
                        {activity.icon}
                    </div>
                    <div>
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                        {activity.match && <Badge variant="secondary" className="my-1"> {activity.match}% match </Badge>}
                        <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                    </div>
                </div>
            ))}
          </CardContent>
        </Card>
      </div>

       {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Button size="lg" className="w-full"><UserPlus className="mr-2 h-5 w-5"/> Add Candidate</Button>
            <Button size="lg" variant="secondary" className="w-full"><FilePlus className="mr-2 h-5 w-5"/> Create Job</Button>
            <Button size="lg" variant="secondary" className="w-full"><Building className="mr-2 h-5 w-5"/> Add Client</Button>
            <Button size="lg" variant="secondary" className="w-full"><Send className="mr-2 h-5 w-5"/> Send Message</Button>
        </div>
      </div>
    </div>
  );
}
