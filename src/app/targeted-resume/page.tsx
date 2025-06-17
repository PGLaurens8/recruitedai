"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { tailorResumeToJobSpec, type TailorResumeToJobSpecOutput } from '@/ai/flows/tailor-resume-to-job-spec';
import { fileToDataURI, textToDataURI } from '@/lib/file-utils';
import { ResumeSection } from '@/components/feature/resume-section';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, FileText, Briefcase, AlertTriangle, Target, UploadCloud } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type JobSpecInputType = "file" | "text" | "url";

export default function TargetedResumePage() {
  const [masterResumeText, setMasterResumeText] = useState('');
  const [jobSpecInputType, setJobSpecInputType] = useState<JobSpecInputType>("text");
  const [jobSpecFile, setJobSpecFile] = useState<File | null>(null);
  const [jobSpecText, setJobSpecText] = useState('');
  const [jobSpecUrl, setJobSpecUrl] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState<TailorResumeToJobSpecOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleJobSpecFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setJobSpecFile(event.target.files[0]);
      setJobSpecText(''); 
      setJobSpecUrl('');
    }
  };

  const handleSubmit = async () => {
    if (!masterResumeText.trim()) {
      toast({ variant: "destructive", title: "Missing Master Resume", description: "Please paste your master resume text." });
      return;
    }

    let jobSpecInputDataUri: string | undefined = undefined;
    let jobSpecInputText: string | undefined = jobSpecText.trim() || undefined;

    if (jobSpecInputType === "file" && jobSpecFile) {
      jobSpecInputDataUri = await fileToDataURI(jobSpecFile);
      jobSpecInputText = undefined; // Prefer file if both provided
    } else if (jobSpecInputType === "url" && jobSpecUrl.trim()) {
      // For MVP, we'll treat URL as text. Actual fetching would need a backend due to CORS.
      // Or, the AI model might handle URL fetching if capable. The prompt for tailorResumeToJobSpec
      // suggests it can take a URL. However, the schema for `jobSpecDataUri` expects a data URI.
      // So, we'd ideally fetch and convert, or pass as `jobSpecText`.
      // For now, let's pass it in `jobSpecText` and inform the user.
      jobSpecInputText = `Job Specification from URL: ${jobSpecUrl.trim()}`;
      toast({ title: "URL as Text", description: "Job spec URL content will be treated as text. For best results, paste content directly or upload a file."});
    }


    if (!jobSpecInputDataUri && !jobSpecInputText) {
       toast({ variant: "destructive", title: "Missing Job Specification", description: "Please provide the job specification (file, text, or URL)." });
      return;
    }

    setIsLoading(true);
    setAiOutput(null);
    setError(null);

    try {
      const masterResumeDataUri = textToDataURI(masterResumeText);
      
      const result = await tailorResumeToJobSpec({
        masterResumeDataUri,
        jobSpecDataUri: jobSpecInputDataUri,
        jobSpecText: jobSpecInputText,
      });
      setAiOutput(result);
      toast({
        title: "Resume Tailored Successfully!",
        description: "Your resume has been customized for the job specification.",
      });
    } catch (e: any) {
      console.error("Error tailoring resume:", e);
      setError(e.message || "An unexpected error occurred.");
      toast({
        variant: "destructive",
        title: "Error Tailoring Resume",
        description: e.message || "Could not tailor the resume. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight font-headline text-primary">Targeted Resume Builder</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Tailor your resume to specific job descriptions using AI.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center"><User className="mr-2 h-6 w-6 text-primary"/> Your Master Resume</CardTitle>
            <CardDescription>Paste the text of your master resume below.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Paste your master resume content here..."
              value={masterResumeText}
              onChange={(e) => setMasterResumeText(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              aria-label="Master Resume Text Area"
            />
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center"><Target className="mr-2 h-6 w-6 text-primary"/> Job Specification</CardTitle>
            <CardDescription>Provide the job specification (upload file, paste text, or enter URL).</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="text" onValueChange={(value) => setJobSpecInputType(value as JobSpecInputType)}>
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="file">Upload File</TabsTrigger>
                <TabsTrigger value="text">Paste Text</TabsTrigger>
                <TabsTrigger value="url">Enter URL</TabsTrigger>
              </TabsList>
              <TabsContent value="file">
                <Label htmlFor="job-spec-file" className="sr-only">Upload job specification file</Label>
                <Input
                  id="job-spec-file"
                  type="file"
                  accept=".pdf,.doc,.docx,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleJobSpecFileChange}
                  className="w-full"
                />
                {jobSpecFile && <p className="mt-2 text-sm text-muted-foreground">Selected: {jobSpecFile.name}</p>}
              </TabsContent>
              <TabsContent value="text">
                 <Textarea
                  placeholder="Paste the job description text here..."
                  value={jobSpecText}
                  onChange={(e) => { setJobSpecText(e.target.value); setJobSpecFile(null); setJobSpecUrl(''); }}
                  className="min-h-[200px] font-mono text-sm"
                  aria-label="Job Specification Text Area"
                />
              </TabsContent>
              <TabsContent value="url">
                <Input
                  type="url"
                  placeholder="https://example.com/job-listing"
                  value={jobSpecUrl}
                  onChange={(e) => { setJobSpecUrl(e.target.value); setJobSpecFile(null); setJobSpecText(''); }}
                  className="w-full"
                  aria-label="Job Specification URL Input"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center">
        <Button onClick={handleSubmit} disabled={isLoading} size="lg">
          {isLoading ? (
            <>
              <Spinner size={20} className="mr-2" /> Tailoring Resume...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" /> Tailor My Resume
            </>
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Processing Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {aiOutput && (
        <ScrollArea className="mt-12 p-1 rounded-lg border bg-card shadow-lg max-h-[80vh]">
          <div className="p-6 space-y-8">
            <h2 className="text-3xl font-bold text-center font-headline text-primary">Your Tailored Resume</h2>
            
            <ResumeSection
              title="AI Tailored Resume"
              icon={<FileText className="h-6 w-6 text-accent" />}
              content={aiOutput.tailoredResume || "No tailored resume content provided."}
            />

            <Separator />
            
            {aiOutput.questions && aiOutput.questions.length > 0 && (
              <ResumeSection
                title="Clarifying Questions from AI"
                icon={<Lightbulb className="h-6 w-6 text-blue-500" />}
                content={aiOutput.questions}
                className="border-blue-500/50"
              />
            )}
             <div className="mt-8 text-center">
                <Button size="lg">
                    <Download className="mr-2 h-5 w-5" /> Download Tailored Resume (Coming Soon)
                </Button>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// Dummy icons if not available, replace with actual if needed
const Download = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
const Sparkles = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2z"/><path d="M22 2L20 6"/><path d="M2 22L6 20"/><path d="M20 22L22 20"/><path d="M2 2L6 6"/></svg>
);

const User = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
