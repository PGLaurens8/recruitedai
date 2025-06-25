
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Eye, FileText, Plus, Search, Star, X } from "lucide-react";

const jobSpecifications = [
  {
    title: "Senior Frontend Developer",
    company: "TechCorp",
    location: "San Francisco, CA",
    salary: "$120k - $150k",
    description: "We are looking for an experienced frontend developer to join our dynamic team.",
    buttonVariant: "default",
  },
  {
    title: "Data Scientist",
    company: "DataFlow Inc",
    location: "Remote",
    salary: "$100k - $130k",
    description: "Join our data science team to build cutting-edge ML models and analytics solutions.",
    buttonVariant: "default",
  },
  {
    title: "UX Designer",
    company: "DesignStudio",
    location: "New York, NY",
    salary: "$80k - $100k",
    description: "Create beautiful and intuitive user experiences for our digital products.",
    buttonVariant: "default",
  },
];

const jobPostings = [
  {
    id: "J001",
    title: "Senior Frontend Developer",
    salary: "$120k - $150k",
    posted: "Full-time • Posted 3 days ago",
    company: "TechCorp",
    location: "San Francisco, CA",
    status: "active",
    approval: "approved",
    candidates: 15,
    aiMatches: 8,
  },
  {
    id: "J002",
    title: "Data Scientist",
    salary: "$100k - $130k",
    posted: "Full-time • Posted 1 day ago",
    company: "DataFlow Inc",
    location: "Remote",
    status: "pending",
    approval: "pending",
    candidates: 7,
    aiMatches: 3,
  },
  {
    id: "J003",
    title: "UX Designer",
    salary: "$80k - $100k",
    posted: "Contract • Posted 1 week ago",
    company: "DesignStudio",
    location: "New York, NY",
    status: "active",
    approval: "approved",
    candidates: 22,
    aiMatches: 12,
  },
    {
    id: "J004",
    title: "Backend Engineer",
    salary: "$110k - $140k",
    posted: "Full-time • Posted 5 days ago",
    company: "CloudNet",
    location: "Austin, TX",
    status: "closed",
    approval: "approved",
    candidates: 35,
    aiMatches: 20,
  },
];

const getStatusBadgeClass = (status: string) => {
    switch(status) {
        case 'active': return 'bg-green-100 text-green-800 border-green-200';
        case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
        default: return 'bg-secondary text-secondary-foreground';
    }
}

const getApprovalBadgeClass = (approval: string) => {
    switch(approval) {
        case 'approved': return 'bg-green-100 text-green-800 border-green-200';
        case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-secondary text-secondary-foreground';
    }
}


export default function JobsPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Job Management</h1>
                <p className="mt-1 text-muted-foreground">
                Create, manage, and auto-generate job postings with AI.
                </p>
            </div>
            <div className="flex gap-2">
                <Button variant="default"><Plus className="mr-2 h-4 w-4" /> Add Job Spec</Button>
                <Button variant="secondary"><Plus className="mr-2 h-4 w-4" /> Create Job</Button>
            </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Job Specifications ({jobSpecifications.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobSpecifications.map((spec, index) => (
            <Card key={index} className="flex flex-col">
              <CardHeader>
                <CardTitle>{spec.title}</CardTitle>
                <CardDescription>{spec.company} • {spec.location}</CardDescription>
                 <p className="font-semibold text-green-600 pt-1">{spec.salary}</p>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground text-sm">{spec.description}</p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="secondary">
                  <Star className="mr-2 h-4 w-4" /> Create Ad
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Job Postings ({jobPostings.length})
          </h2>
           <div className="flex items-center gap-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search jobs by title or company..." className="pl-9 w-64" />
            </div>
            <Select>
                <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
            </Select>
           </div>
        </div>

        <Card>
            <CardContent className="p-0">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Job Details</TableHead>
                    <TableHead>Company & Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead>Candidates</TableHead>
                    <TableHead>AI Matches</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {jobPostings.map((job) => (
                    <TableRow key={job.id}>
                        <TableCell>
                        <p className="font-medium">{job.title}</p>
                        <p className="text-sm text-green-600 font-semibold">{job.salary}</p>
                        <p className="text-xs text-muted-foreground">{job.posted}</p>
                        </TableCell>
                        <TableCell>
                        <p className="font-medium">{job.company}</p>
                        <p className="text-sm text-muted-foreground">{job.location}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusBadgeClass(job.status) + " capitalize"}>{job.status}</Badge>
                        </TableCell>
                        <TableCell>
                           <Badge variant="outline" className={getApprovalBadgeClass(job.approval) + " capitalize"}>{job.approval}</Badge>
                        </TableCell>
                        <TableCell>
                        <p className="font-medium">{job.candidates}</p>
                        <p className="text-sm text-muted-foreground">applied</p>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-1 font-semibold">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
                                <span>{job.aiMatches}</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Eye className="h-4 w-4" />
                                </Button>
                                {job.approval === 'pending' && (
                                    <>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700">
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
