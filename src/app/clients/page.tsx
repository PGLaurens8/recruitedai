
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building, Eye, FilePenLine, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";

const clients = [
  {
    id: "CLI001",
    name: "TechCorp",
    logo: "https://placehold.co/40x40.png",
    contactName: "John Doe",
    contactEmail: "john.doe@techcorp.com",
    status: "Active",
    openJobs: 5,
  },
  {
    id: "CLI002",
    name: "Innovate LLC",
    logo: "https://placehold.co/40x40.png",
    contactName: "Jane Smith",
    contactEmail: "jane.s@innovatellc.com",
    status: "Active",
    openJobs: 2,
  },
  {
    id: "CLI003",
    name: "Data Solutions",
    logo: "https://placehold.co/40x40.png",
    contactName: "Sam Wilson",
    contactEmail: "sam.w@datasolutions.com",
    status: "Prospect",
    openJobs: 0,
  },
  {
    id: "CLI004",
    name: "Growth Partners",
    logo: "https://placehold.co/40x40.png",
    contactName: "Emily White",
    contactEmail: "emily.w@growthpartners.com",
    status: "On Hold",
    openJobs: 1,
  },
  {
    id: "CLI005",
    name: "CloudNet",
    logo: "https://placehold.co/40x40.png",
    contactName: "Michael Brown",
    contactEmail: "michael.b@cloudnet.com",
    status: "Inactive",
    openJobs: 0,
  },
];

const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-green-100 text-green-800 border-green-200";
    case "prospect":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "on hold":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "inactive":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "secondary";
  }
};

export default function ClientsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Client Management</h1>
        <p className="mt-1 text-muted-foreground">
          View, manage, and track all your clients and their job postings.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by client name or contact..." className="pl-9 w-64" />
          </div>
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button><Plus className="mr-2 h-4 w-4" /> Add Client</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clients ({clients.length})</CardTitle>
          <CardDescription>A list of all clients in your system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Open Jobs</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="rounded-md">
                        <AvatarImage src={client.logo} data-ai-hint="company logo"/>
                        <AvatarFallback className="rounded-md bg-muted"><Building className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{client.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{client.contactName}</p>
                      <p className="text-sm text-muted-foreground">{client.contactEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusBadgeVariant(client.status)}>{client.status}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {client.openJobs > 0 ? client.openJobs : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                        <DropdownMenuItem><FilePenLine className="mr-2 h-4 w-4" /> Edit Client</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Client
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Showing 1 to {clients.length} of {clients.length} clients</p>
            <div className="flex gap-2">
                <Button variant="outline" size="sm">Previous</Button>
                <Button variant="outline" size="sm">Next</Button>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
