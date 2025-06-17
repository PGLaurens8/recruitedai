
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


export default function MasterResumePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState<ReformatResumeOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [resumeTitle, setResumeTitle] = useState("My Master Resume");
  const [processedTimestamp, setProcessedTimestamp] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setAiOutput(null);
    setError(null);
    setProcessedTimestamp(null);

    try {
      const resumeDataUri = await fileToDataURI(file);
      const result = await reformatResume({ resumeDataUri });
      setAiOutput(result);
      setProcessedTimestamp(new Date().toLocaleString());
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
    const fileBlob = new Blob([text], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(fileBlob);
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
          Upload your existing resume. Our AI will analyze and reformat it. This becomes your Master Resume.
        </p>
      </div>

      <FileUploadCard
        title="Upload Your Resume"
        description="Supports PDF, DOC, DOCX files. The AI will reformat it into a professional template."
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
        <ScrollArea className="mt-12 p-1 rounded-lg border bg-background shadow-lg max-h-[100vh]">
          <div className="p-4 sm:p-6 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
              <Input 
                value={resumeTitle} 
                onChange={(e) => setResumeTitle(e.target.value)} 
                placeholder="Enter Your Resume Title"
                className="text-xl font-semibold !text-primary flex-grow border-primary focus:!border-primary focus:!ring-primary"
                aria-label="Resume Title"
              />
              {processedTimestamp && <p className="text-sm text-muted-foreground text-left sm:text-right shrink-0 pt-2 sm:pt-0">Processed: {processedTimestamp}</p>}
            </div>
            
            <Card className="bg-card shadow-xl overflow-hidden border-primary">
              <CardHeader className="bg-primary/10">
                <CardTitle className="flex items-center text-primary">
                  <FileText className="h-5 w-5 mr-2" />
                  Your AI-Crafted Master Resume
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-card-foreground bg-background p-4 rounded-md border">
                  {aiOutput.reformattedResume || "The AI didn't return any resume content. Please check your uploaded file."}
                </pre>
              </CardContent>
            </Card>
            
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
                <Button size="lg" onClick={() => downloadTextFile(`${resumeTitle.replace(/\s+/g, '_') || 'master_resume'}.txt`, aiOutput.reformattedResume)} disabled={!aiOutput.reformattedResume}>
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
