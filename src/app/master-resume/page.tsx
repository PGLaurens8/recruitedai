
"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUploadCard } from '@/components/feature/file-upload-card';
import { reformatResume, type ReformatResumeOutput } from '@/ai/flows/reformat-resume';
import { fileToDataURI } from '@/lib/file-utils';
import { ResumeSection } from '@/components/feature/resume-section';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, FileText, HelpCircle, AlertTriangle, UploadCloud, Download, Linkedin, Mail, MapPin, Phone, Edit } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

const LOCAL_STORAGE_KEYS = {
  MASTER_RESUME_TEXT: 'careerCraft_masterResumeText',
  MASTER_RESUME_USER_TITLE: 'careerCraft_masterResumeUserTitle', 
  MASTER_RESUME_EXTRACTED_NAME: 'careerCraft_masterResumeExtractedName',
  MASTER_RESUME_EXTRACTED_JOB_TITLE: 'careerCraft_masterResumeExtractedJobTitle',
  MASTER_RESUME_CONTACT_INFO: 'careerCraft_masterResumeContactInfo',
  MASTER_RESUME_SKILLS: 'careerCraft_masterResumeSkills',
  MASTER_RESUME_TIMESTAMP: 'careerCraft_masterResumeTimestamp',
  MASTER_RESUME_AVATAR_URI: 'careerCraft_masterResumeAvatarUri',
};

export default function MasterResumePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState<ReformatResumeOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [resumeUserTitle, setResumeUserTitle] = useState("My Master Resume"); 
  const [processedTimestamp, setProcessedTimestamp] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedUserTitle = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_USER_TITLE);
    const storedTimestamp = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_TIMESTAMP);
    const storedText = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_TEXT);
    const storedExtractedName = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_EXTRACTED_NAME);
    const storedExtractedJobTitle = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_EXTRACTED_JOB_TITLE);
    const storedContactInfo = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_CONTACT_INFO);
    const storedSkills = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_SKILLS);
    const storedAvatar = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_AVATAR_URI);
    
    if (storedUserTitle) {
      setResumeUserTitle(storedUserTitle);
    }
    if (storedAvatar) {
      setAvatarUri(storedAvatar);
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
  
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        try {
            const file = e.target.files[0];
            const dataUri = await fileToDataURI(file);
            setAvatarUri(dataUri);
            localStorage.setItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_AVATAR_URI, dataUri);
            toast({
                title: "Profile Photo Updated!",
                description: "Your new photo is now set for this session.",
            });
        } catch (error) {
            console.error("Error setting profile photo:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not set the profile photo.",
            });
        }
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

  const downloadPdf = () => {
    const input = document.getElementById('master-resume-content');
    if (input && aiOutput) {
      toast({ title: "Generating PDF...", description: "This may take a moment." });
      html2canvas(input, { scale: 2 })
        .then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          const ratio = canvasWidth / canvasHeight;
          const imgWidth = pdfWidth;
          const imgHeight = imgWidth / ratio;

          let heightLeft = imgHeight;
          let position = 0;
          
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;

          while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
          }
          pdf.save("master_resume.pdf");
          toast({ title: "PDF Downloaded!", description: "Your master resume has been saved." });
        });
    } else {
        toast({ variant: "destructive", title: "Error", description: "Could not find resume content to generate PDF." });
    }
  };

  const downloadDocx = () => {
    if (!aiOutput) {
        toast({ variant: "destructive", title: "Error", description: "No resume to download." });
        return;
    }
    toast({ title: "Generating DOCX...", description: "This may take a moment." });

    const name = aiOutput.fullName || 'Candidate Name';
    const title = aiOutput.currentJobTitle || 'Professional Title';

    const contactParts: string[] = [];
    if (aiOutput.contactInfo?.location) contactParts.push(aiOutput.contactInfo.location);
    if (aiOutput.contactInfo?.phone) contactParts.push(aiOutput.contactInfo.phone);
    if (aiOutput.contactInfo?.email) contactParts.push(aiOutput.contactInfo.email);
    if (aiOutput.contactInfo?.linkedin && aiOutput.contactInfo.linkedin !== 'null') contactParts.push(aiOutput.contactInfo.linkedin);

    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({
                    text: name,
                    heading: HeadingLevel.HEADING_1,
                    style: "heading1",
                }),
                new Paragraph({
                    text: title,
                    style: "heading2",
                }),
                new Paragraph({
                    text: contactParts.join(' | '),
                    style: "contact",
                }),
                new Paragraph({ text: "" }),
                ...(aiOutput.skills && aiOutput.skills.length > 0 ? [
                     new Paragraph({
                        children: [new TextRun({ text: "Skills", bold: true })],
                        heading: HeadingLevel.HEADING_2,
                    }),
                    new Paragraph({
                        text: aiOutput.skills.join(', '),
                    }),
                    new Paragraph({ text: "" }),
                ] : []),
                ...aiOutput.reformattedResume.split('\n').map(line => new Paragraph(line)),
            ],
        }],
        styles: {
             paragraphStyles: [
                {
                    id: "heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
                    run: { size: 32, bold: true },
                },
                {
                    id: "heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
                    run: { size: 24, italics: true, color: "555555" },
                },
                {
                    id: "contact", name: "Contact", basedOn: "Normal", next: "Normal",
                    run: { size: 20, color: "888888" },
                },
            ]
        }
    });

    Packer.toBlob(doc).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "master_resume.docx";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "DOCX Downloaded!", description: "Your master resume has been saved." });
    });
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
        <div className="mt-12 p-1 rounded-lg border bg-background shadow-lg">
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
                <ScrollArea className="h-[700px] w-full">
                  <div id="master-resume-content" className="p-4 rounded-lg border bg-background">
                    {(aiOutput.fullName || aiOutput.currentJobTitle) && (
                      <header className="flex items-center mb-6 pb-4 border-b">
                        <div className="relative">
                            <Avatar className="h-20 w-20 mr-5">
                                <AvatarImage src={avatarUri || "https://placehold.co/128x128.png"} data-ai-hint="professional portrait"/>
                                <AvatarFallback className="text-2xl">
                                    {aiOutput.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??'}
                                </AvatarFallback>
                            </Avatar>
                            <Button
                                size="icon"
                                variant="outline"
                                className="absolute bottom-0 left-14 rounded-full h-8 w-8 bg-background"
                                onClick={() => profileImageInputRef.current?.click()}
                            >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit profile picture</span>
                            </Button>
                            <Input
                                ref={profileImageInputRef}
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold font-headline text-primary">{aiOutput.fullName || '[Candidate Name]'}</h2>
                          <p className="text-lg text-muted-foreground">{aiOutput.currentJobTitle || '[Professional Title]'}</p>
                        </div>
                      </header>
                    )}

                    <div className="grid md:grid-cols-3 gap-6">
                      <aside className="md:col-span-1 space-y-4">
                        {aiOutput.contactInfo && (
                          <div className="space-y-2 text-sm">
                            <h3 className="font-semibold text-primary">Contact</h3>
                            <Separator />
                            {aiOutput.contactInfo.location && <p className="flex items-start gap-2 pt-1"><MapPin size={14} className="mt-0.5 shrink-0" /> <span>{aiOutput.contactInfo.location}</span></p>}
                            {aiOutput.contactInfo.phone && <p className="flex items-start gap-2"><Phone size={14} className="mt-0.5 shrink-0" /> <span>{aiOutput.contactInfo.phone}</span></p>}
                            {aiOutput.contactInfo.email && <p className="flex items-start gap-2"><Mail size={14} className="mt-0.5 shrink-0" /> <span className="break-all">{aiOutput.contactInfo.email}</span></p>}
                            {aiOutput.contactInfo.linkedin && aiOutput.contactInfo.linkedin !== 'null' && (
                              <p className="flex items-start gap-2">
                                <Linkedin size={14} className="mt-0.5 shrink-0" />
                                <Link href={!aiOutput.contactInfo.linkedin.startsWith('http') ? `https://${aiOutput.contactInfo.linkedin}` : aiOutput.contactInfo.linkedin} target="_blank" className="text-primary hover:underline break-all">{aiOutput.contactInfo.linkedin.replace(/^https?:\/\//, '')}</Link>
                              </p>
                            )}
                          </div>
                        )}
                        {aiOutput.skills && aiOutput.skills.length > 0 && (
                          <div className="space-y-2 text-sm pt-2">
                            <h3 className="font-semibold text-primary">Skills</h3>
                            <Separator />
                            <div className="flex flex-wrap gap-2 pt-2">
                              {aiOutput.skills.map(skill => (
                                <Badge key={skill} variant="secondary">{skill}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </aside>
                      <main className="md:col-span-2">
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-card-foreground">
                          {aiOutput.reformattedResume || "The AI didn't return any resume content. Please check your uploaded file."}
                        </pre>
                      </main>
                    </div>
                  </div>
                </ScrollArea>
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
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="lg" disabled={!aiOutput.reformattedResume}>
                            <Download className="mr-2 h-5 w-5" /> Download Master Resume
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                        <DropdownMenuItem onClick={downloadPdf}>as PDF</DropdownMenuItem>
                        <DropdownMenuItem onClick={downloadDocx}>as DOCX</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadTextFile(`${resumeUserTitle.replace(/\s+/g, '_') || 'master_resume'}.txt`, aiOutput.reformattedResume)}>
                            as TXT
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <p className="text-xs text-muted-foreground mt-2">Editing capabilities are available via the 'My Resumes' dashboard (feature in development).</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
