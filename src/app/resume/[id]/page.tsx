"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sparkles, Save, Trash2, PlusCircle } from "lucide-react";
import { useParams } from 'next/navigation'; // To get resume ID

// This is a very basic placeholder for the resume editor.
// A real implementation would involve complex state management, forms, and data binding.

const ResumeSectionEditor = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <AccordionItem value={title.toLowerCase().replace(/\s+/g, '-')}>
    <AccordionTrigger className="text-xl font-semibold hover:no-underline">
      {title}
    </AccordionTrigger>
    <AccordionContent>
      <div className="space-y-4 p-4 border rounded-md bg-muted/20">
        {children}
        <Button variant="outline" size="sm" className="mt-2">
          <Sparkles className="mr-2 h-4 w-4" /> AI Suggest Improvements
        </Button>
      </div>
    </AccordionContent>
  </AccordionItem>
);

export default function ResumeEditorPage() {
  const params = useParams();
  const resumeId = typeof params?.id === "string" ? params.id : "new"; // 'new' or an actual ID

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold font-headline">
          {resumeId === 'new' ? 'Create New Resume' : `Edit Resume: ${resumeId}`}
        </h1>
        <div className="space-x-2">
          <Button variant="outline"><Trash2 className="mr-2 h-4 w-4"/> Delete</Button>
          <Button><Save className="mr-2 h-4 w-4"/> Save Resume</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resume Title</CardTitle>
          <Input defaultValue={resumeId !== 'new' ? `My Awesome Resume ${resumeId}` : ""} placeholder="e.g., Senior Software Engineer Resume" />
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full space-y-4" defaultValue={['summary', 'work-experience']}>
            <ResumeSectionEditor title="Summary">
              <Textarea placeholder="Write a compelling professional summary..." className="min-h-[150px]" />
            </ResumeSectionEditor>

            <ResumeSectionEditor title="Work Experience">
              {/* This would be a list of experience items, each editable */}
              <div className="space-y-3 p-3 border rounded-md bg-background">
                <Input placeholder="Job Title" />
                <Input placeholder="Company Name" />
                <Input placeholder="Location (e.g., San Francisco, CA)" />
                <div className="flex space-x-2">
                  <Input type="month" placeholder="Start Date" />
                  <Input type="month" placeholder="End Date (or Present)" />
                </div>
                <Textarea placeholder="Key responsibilities and achievements..." />
                <Button variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4"/> Add Bullet Point</Button>
              </div>
              <Button variant="secondary" className="mt-4"><PlusCircle className="mr-2 h-4 w-4"/> Add Experience</Button>
            </ResumeSectionEditor>

            <ResumeSectionEditor title="Education">
               <div className="space-y-3 p-3 border rounded-md bg-background">
                <Input placeholder="Degree (e.g., Master of Science)" />
                <Input placeholder="Field of Study (e.g., Computer Science)" />
                <Input placeholder="Institution Name" />
                <Input placeholder="Location" />
                <Input type="year" placeholder="Graduation Year" />
              </div>
              <Button variant="secondary" className="mt-4"><PlusCircle className="mr-2 h-4 w-4"/> Add Education</Button>
            </ResumeSectionEditor>

            <ResumeSectionEditor title="Skills">
              <Textarea placeholder="List your skills, separated by commas or new lines..." />
            </ResumeSectionEditor>
            
            {/* Add more sections like Projects, Certifications, etc. */}
             <Button variant="ghost" className="w-full mt-4 justify-center text-primary hover:bg-primary/10">
                <PlusCircle className="mr-2 h-5 w-5"/> Add Custom Section
             </Button>

          </Accordion>
        </CardContent>
        <CardFooter className="flex justify-end">
           <Button><Save className="mr-2 h-4 w-4"/> Save Resume</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
