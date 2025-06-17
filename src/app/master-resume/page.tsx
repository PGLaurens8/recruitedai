
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileUploadCard } from '@/components/feature/file-upload-card';
import { reformatResume, type ReformatResumeOutput } from '@/ai/flows/reformat-resume';
import { fileToDataURI } from '@/lib/file-utils';
import { ResumeSection } from '@/components/feature/resume-section';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, FileText, HelpCircle, AlertTriangle, UploadCloud, Download } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function MasterResumePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState<ReformatResumeOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setAiOutput(null);
    setError(null);

    try {
      const resumeDataUri = await fileToDataURI(file);
      const result = await reformatResume({ resumeDataUri });
      setAiOutput(result);
      toast({
        title: "Resume Processed Successfully!",
        description: "Your master resume has been reformatted by AI.",
      });
    } catch (e: any) {
      console.error("Error reformatting resume:", e);
      setError(e.message || "An unexpected error occurred.");
      toast({
        variant: "destructive",
        title: "Error Processing Resume",
        description: e.message || "Could not reformat the resume. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTextFile = (filename: string, text: string) => {
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight font-headline text-primary">Master Resume Builder</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Upload your existing resume (Word or PDF). Our AI will analyze and reformat it into a modern, professional template. This becomes your Master Resume.
        </p>
      </div>

      <FileUploadCard
        title="Upload Your Resume"
        description="Let our AI craft your master resume. Supports PDF, DOC, DOCX files."
        onFileUpload={handleFileUpload}
        ctaText={isLoading ? "Processing..." : "Reformat Resume"}
        icon={<UploadCloud className="h-10 w-10 text-primary mb-2" />}
      />

      {isLoading && (
        <div className="mt-8 flex justify-center items-center">
          <Spinner size={48} className="text-primary" />
          <p className="ml-4 text-lg text-muted-foreground">AI is working its magic...</p>
        </div>
      )}

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
            <h2 className="text-3xl font-bold text-center font-headline text-primary">Your New Master Resume</h2>
            
            <ResumeSection
                title="AI Processed Resume"
                icon={<FileText className="h-6 w-6 text-accent" />}
                content={aiOutput.reformattedResume || "No reformatted resume content provided."}
              />
            
            <Separator />

            {aiOutput.missingInformation && aiOutput.missingInformation.length > 0 && (
              <ResumeSection
                title="Missing Information (Suggestions from AI)"
                icon={<HelpCircle className="h-6 w-6 text-yellow-500" />}
                content={aiOutput.missingInformation}
                className="border-yellow-500/50"
              />
            )}
            
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
                <Button size="lg" onClick={() => downloadTextFile("master_resume.txt", aiOutput.reformattedResume)} disabled={!aiOutput.reformattedResume}>
                    <Download className="mr-2 h-5 w-5" /> Download Master Resume (TXT)
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Full PDF/Word download coming soon. Editing capabilities are available via the 'My Resumes' dashboard (feature in development).</p>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
