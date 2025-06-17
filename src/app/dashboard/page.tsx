import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, FileText } from "lucide-react";

// Sample data - replace with actual data fetching
const sampleResumes = [
  { id: "1", title: "Software Engineer Master Resume", updatedDate: "2024-07-28" },
  { id: "2", title: "Product Manager - Targeted for Google", updatedDate: "2024-07-27" },
  { id: "3", title: "UX Designer Portfolio Resume", updatedDate: "2024-07-25" },
];

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold font-headline">My Resumes</h1>
        <Button asChild>
          <Link href="/resume/new"> {/* Assuming /resume/new or similar for creation */}
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Resume
          </Link>
        </Button>
      </div>

      {sampleResumes.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle>No Resumes Yet</CardTitle>
            <CardDescription>Start building your career by creating your first resume.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" asChild>
              <Link href="/master-resume">Create Master Resume</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sampleResumes.map((resume) => (
            <Card key={resume.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="truncate">{resume.title}</CardTitle>
                <CardDescription>Last updated: {new Date(resume.updatedDate).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-end space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/resume/${resume.id}`}>Edit</Link>
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
