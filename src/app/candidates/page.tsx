
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, Eye, FilePenLine, Plus, Search, Star, Trash2, Upload } from "lucide-react";

const candidates = [
  {
    id: "C001",
    name: "Elena Rodriguez",
    email: "elena.r@example.com",
    avatar: "https://placehold.co/40x40.png",
    status: "Sourced",
    aiScore: 92,
    currentJob: "Senior UX Designer",
    company: "Innovate Inc.",
    appliedFor: "Lead Product Designer",
  },
  {
    id: "C002",
    name: "Marcus Chen",
    email: "marcus.c@example.com",
    avatar: "https://placehold.co/40x40.png",
    status: "Applied",
    aiScore: 88,
    currentJob: "Data Scientist",
    company: "DataDriven Co.",
    appliedFor: "Senior Data Scientist",
  },
  {
    id: "C003",
    name: "Aisha Khan",
    email: "aisha.k@example.com",
    avatar: "https://placehold.co/40x40.png",
    status: "Interviewing",
    aiScore: 95,
    currentJob: "Backend Engineer",
    company: "CloudNet",
    appliedFor: "Senior Backend Engineer",
  },
  {
    id: "C004",
    name: "David Miller",
    email: "david.m@example.com",
    avatar: "https://placehold.co/40x40.png",
    status: "Offer",
    aiScore: 85,
    currentJob: "Marketing Manager",
    company: "GrowthLeap",
    appliedFor: "Head of Marketing",
  },
  {
    id: "C005",
    name: "Sophia Loren",
    email: "sophia.l@example.com",
    avatar: "https://placehold.co/40x40.png",
    status: "Hired",
    aiScore: 91,
    currentJob: "DevOps Engineer",
    company: "SecureStack",
    appliedFor: "DevOps Lead",
  },
    {
    id: "C006",
    name: "James Smith",
    email: "james.s@example.com",
    avatar: "https://placehold.co/40x40.png",
    status: "Applied",
    aiScore: 78,
    currentJob: "Frontend Developer",
    company: "WebWeavers",
    appliedFor: "Senior Frontend Developer",
  },
];

const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case "sourced":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "applied":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "interviewing":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "offer":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "hired":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "secondary";
  }
};


export default function CandidatesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Candidate Management</h1>
        <p className="mt-1 text-muted-foreground">
          View, manage, and track all candidates in your pipeline.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, skills, or role..." className="pl-9 w-64" />
          </div>
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sourced">Sourced</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="interviewing">Interviewing</SelectItem>
              <SelectItem value="offer">Offer</SelectItem>
              <SelectItem value="hired">Hired</SelectItem>
            </SelectContent>
          </Select>
           <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="AI Match Score" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="90+">90+</SelectItem>
              <SelectItem value="80-89">80-89</SelectItem>
              <SelectItem value="70-79">70-79</SelectItem>
              <SelectItem value="below-70">Below 70</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Bulk Import</Button>
          <Button><Plus className="mr-2 h-4 w-4" /> Add Candidate</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Candidates ({candidates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox />
                </TableHead>
                <TableHead>Candidate</TableHead>
                <TableHead className="w-[150px]">Status</TableHead>
                <TableHead className="w-[150px]">AI Score</TableHead>
                <TableHead>Current Job / Company</TableHead>
                <TableHead>Applied For</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell>
                    <Checkbox />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={candidate.avatar} data-ai-hint="person portrait"/>
                        <AvatarFallback>{candidate.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{candidate.name}</p>
                        <p className="text-sm text-muted-foreground">{candidate.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusBadgeVariant(candidate.status)}>{candidate.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
                      <span className="font-semibold">{candidate.aiScore}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{candidate.currentJob}</p>
                    <p className="text-sm text-muted-foreground">{candidate.company}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{candidate.appliedFor}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <FilePenLine className="h-4 w-4" />
                      </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Showing 1 to 6 of {candidates.length} candidates</p>
            <div className="flex gap-2">
                <Button variant="outline" size="sm">Previous</Button>
                <Button variant="outline" size="sm">Next</Button>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
