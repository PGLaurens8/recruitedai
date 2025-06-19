
"use client";

import { useState, useEffect } from 'react';
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

const LOCAL_STORAGE_KEYS = {
  MASTER_RESUME_TEXT: 'careerCraft_masterResumeText',
  MASTER_RESUME_USER_TITLE: 'careerCraft_masterResumeUserTitle', 
  MASTER_RESUME_EXTRACTED_NAME: 'careerCraft_masterResumeExtractedName',
  MASTER_RESUME_EXTRACTED_JOB_TITLE: 'careerCraft_masterResumeExtractedJobTitle',
  MASTER_RESUME_CONTACT_INFO: 'careerCraft_masterResumeContactInfo',
  MASTER_RESUME_SKILLS: 'careerCraft_masterResumeSkills',
  MASTER_RESUME_TIMESTAMP: 'careerCraft_masterResumeTimestamp',
};

export default function MasterResumePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState<ReformatResumeOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [resumeUserTitle, setResumeUserTitle] = useState("My Master Resume"); 
  const [processedTimestamp, setProcessedTimestamp] = useState<string | null>(null);

  useEffect(() => {
    const storedUserTitle = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_USER_TITLE);
    const storedTimestamp = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_TIMESTAMP);
    const storedText = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_TEXT);
    const storedExtractedName = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_EXTRACTED_NAME);
    const storedExtractedJobTitle = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_EXTRACTED_JOB_TITLE);
    const storedContactInfo = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_CONTACT_INFO);
    const storedSkills = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_SKILLS);
    
    if (storedUserTitle) {
      setResumeUserTitle(storedUserTitle);
    }
    if (storedTimestamp && storedText) {
        setAiOutput({ 
          reformattedResume: storedText, 
          fullName: storedExtractedName || undefined,
          currentJobTitle: storedExtractedJobTitle || undefined,
          contactInfo: storedContactInfo ? JSON.parse(storedContactInfo) : undefined,
          skills: storedSkills ? JSON.parse(storedSkills) : [],
          missingInformation: [], 
          questions: [] 
        });
        setProcessedTimestamp(storedTimestamp);
    }
  }, []);


  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setAiOutput(null);
    setError(null);
    
    const currentTimestamp = new Date().toLocaleString();
    
    try {
      const resumeDataUri = await fileToDataURI(file);
      const result = await reformatResume({ resumeDataUri });
      setAiOutput(result);
      setProcessedTimestamp(currentTimestamp); 
      
      localStorage.setItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_TEXT, result.reformattedResume);
      localStorage.setItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_USER_TITLE, resumeUserTitle);
      localStorage.setItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_TIMESTAMP, currentTimestamp);

      if (result.fullName) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_EXTRACTED_NAME, result.fullName);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_EXTRACTED_NAME);
      }
      if (result.currentJobTitle) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_EXTRACTED_JOB_TITLE, result.currentJobTitle);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_EXTRACTED_JOB_TITLE);
      }
      if (result.contactInfo) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_CONTACT_INFO, JSON.stringify(result.contactInfo));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_CONTACT_INFO);
      }
      if (result.skills && result.skills.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_SKILLS, JSON.stringify(result.skills));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_SKILLS);
      }

      toast({
        title: "Resume Processed Successfully!",
        description: "Your master resume has been reformatted and key details saved for this session.",
      });
    } catch (e: any) {
      console.error("Error reformatting resume:", e);
      setError(e.message || "An unexpected error occurred.");
      setProcessedTimestamp(null); 
      toast({
        variant: "destructive",
        title: "Error Processing Resume",
        description: e.message || "Could not reformat the resume. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setResumeUserTitle(newTitle);
    if (localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_TEXT)) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_USER_TITLE, newTitle);
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
          Upload your existing resume (PDF or TXT). Our AI will analyze, reformat it, and extract key details. This becomes your Master Resume.
        </p>
      </div>

      <FileUploadCard
        title="Upload Your Resume"
        description="Supports PDF and TXT files. The AI will reformat it into a professional template."
        onFileUpload={handleFileUpload}
        ctaText={isLoading ? "Processing..." : "Reformat Resume"}
        icon={<UploadCloud className="h-10 w-10 text-primary mb-2" />}
        acceptedFileTypes=".pdf,.txt,application/pdf,text/plain" 
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
        <ScrollArea className="mt-12 p-1 rounded-lg border bg-background shadow-lg max-h-[75vh]">
          <div className="p-4 sm:p-6 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
              <Input 
                value={resumeUserTitle} 
                onChange={handleTitleChange} 
                placeholder="Enter Your Resume Title (e.g., My Software Eng Resume)"
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
                 {aiOutput.fullName && (
                  <p className="text-lg font-semibold text-card-foreground mb-1">Extracted Name: {aiOutput.fullName}</p>
                )}
                {aiOutput.currentJobTitle && (
                  <p className="text-md text-muted-foreground mb-3">Extracted Job Title: {aiOutput.currentJobTitle}</p>
                )}
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-card-foreground bg-muted/20 p-4 rounded-md border">
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
                <Button size="lg" onClick={() => downloadTextFile(`${resumeUserTitle.replace(/\s+/g, '_') || 'master_resume'}.txt`, aiOutput.reformattedResume)} disabled={!aiOutput.reformattedResume}>
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
