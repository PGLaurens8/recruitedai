
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from "next/link";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { tailorResumeToJobSpec, type TailorResumeToJobSpecOutput } from '@/ai/flows/tailor-resume-to-job-spec';
import { assessJobMatch, type AssessJobMatchInput, type AssessJobMatchOutput } from '@/ai/flows/assess-job-match';
import { generateCoverLetter, type GenerateCoverLetterInput, type GenerateCoverLetterOutput } from '@/ai/flows/generate-cover-letter';
import { fileToDataURI, textToDataURI } from '@/lib/file-utils';
import { ResumeSection } from '@/components/feature/resume-section';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, FileText, Briefcase, AlertTriangle, Target, UploadCloud, Download, Sparkles, UserCheck, FileSignature, BarChartBig, Brain, HelpCircle as HelpCircleIcon, Edit, CheckCircle, Mail, Phone, Linkedin, MapPin } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';


type JobSpecInputType = "file" | "text" | "url";

const LOCAL_STORAGE_KEYS = {
  MASTER_RESUME_TEXT: 'recruitedAI_masterResumeText',
  MASTER_RESUME_USER_TITLE: 'recruitedAI_masterResumeUserTitle',
  MASTER_RESUME_TIMESTAMP: 'recruitedAI_masterResumeTimestamp',
  MASTER_RESUME_EXTRACTED_NAME: 'recruitedAI_masterResumeExtractedName',
  MASTER_RESUME_EXTRACTED_JOB_TITLE: 'recruitedAI_masterResumeExtractedJobTitle',
  MASTER_RESUME_CONTACT_INFO: 'recruitedAI_masterResumeContactInfo',
  MASTER_RESUME_SKILLS: 'recruitedAI_masterResumeSkills',
  MASTER_RESUME_AVATAR_URI: 'recruitedAI_masterResumeAvatarUri',
};

interface ContactInfo {
  email?: string;
  phone?: string;
  linkedin?: string;
  location?: string;
}

export default function JobMatchingPage() {
  const [masterResumeText, setMasterResumeText] = useState('');
  const [masterResumeUserTitle, setMasterResumeUserTitle] = useState('');
  const [masterResumeTimestamp, setMasterResumeTimestamp] = useState('');
  const [isMasterResumeFromStorage, setIsMasterResumeFromStorage] = useState(false);
  
  const [loadedExtractedName, setLoadedExtractedName] = useState<string | null>(null);
  const [loadedExtractedJobTitle, setLoadedExtractedJobTitle] = useState<string | null>(null);
  const [loadedContactInfo, setLoadedContactInfo] = useState<ContactInfo | null>(null);
  const [loadedSkills, setLoadedSkills] = useState<string[] | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const [jobSpecInputType, setJobSpecInputType] = useState<JobSpecInputType>("text");
  const [jobSpecFile, setJobSpecFile] = useState<File | null>(null);
  const [jobSpecText, setJobSpecText] = useState('');
  const [jobSpecUrl, setJobSpecUrl] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitleForCoverLetter, setJobTitleForCoverLetter] = useState('');

  const [isLoadingAssessment, setIsLoadingAssessment] = useState(false);
  const [isLoadingTailoring, setIsLoadingTailoring] = useState(false);
  const [isLoadingCoverLetter, setIsLoadingCoverLetter] = useState(false);

  const [assessmentOutput, setAssessmentOutput] = useState<AssessJobMatchOutput | null>(null);
  const [tailoredResumeOutput, setTailoredResumeOutput] = useState<TailorResumeToJobSpecOutput | null>(null);
  const [coverLetterOutput, setCoverLetterOutput] = useState<GenerateCoverLetterOutput | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const storedText = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_TEXT);
    const storedUserTitle = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_USER_TITLE);
    const storedTimestamp = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_TIMESTAMP);
    const storedName = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_EXTRACTED_NAME);
    const storedJobTitle = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_EXTRACTED_JOB_TITLE);
    const storedContact = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_CONTACT_INFO);
    const storedSkills = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_SKILLS);
    const storedAvatar = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_AVATAR_URI);


    if (storedText && storedUserTitle && storedTimestamp) {
      setMasterResumeText(storedText);
      setMasterResumeUserTitle(storedUserTitle);
      setMasterResumeTimestamp(storedTimestamp);
      setIsMasterResumeFromStorage(true);
    } else {
      setIsMasterResumeFromStorage(false);
    }
    
    if (storedName) setLoadedExtractedName(storedName);
    if (storedJobTitle) setLoadedExtractedJobTitle(storedJobTitle);
    if (storedContact) setLoadedContactInfo(JSON.parse(storedContact));
    if (storedSkills) setLoadedSkills(JSON.parse(storedSkills));
    if (storedAvatar) setAvatarUri(storedAvatar);

  }, []);

  const handleClearStoredMasterResume = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_TEXT);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_USER_TITLE);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_TIMESTAMP);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_EXTRACTED_NAME); 
    localStorage.removeItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_EXTRACTED_JOB_TITLE);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_CONTACT_INFO);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_SKILLS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_AVATAR_URI);


    setMasterResumeText('');
    setMasterResumeUserTitle('');
    setMasterResumeTimestamp('');
    setIsMasterResumeFromStorage(false);
    setAssessmentOutput(null); 
    setTailoredResumeOutput(null);
    setCoverLetterOutput(null);
    toast({ title: "Stored Master Resume Cleared", description: "You can now paste new resume content here if needed." });
  };


  const handleJobSpecFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setJobSpecFile(event.target.files[0]);
      setJobSpecText(''); 
      setJobSpecUrl('');
    }
  };

  const getJobSpecInputs = async (): Promise<{ jobSpecDataUri?: string; jobSpecText?: string; hasInput: boolean }> => {
    let jobSpecInputDataUri: string | undefined = undefined;
    let jobSpecInputTextValue: string | undefined = jobSpecText.trim() || undefined;
    let hasValidInput = false;

    if (jobSpecInputType === "file" && jobSpecFile) {
      jobSpecInputDataUri = await fileToDataURI(jobSpecFile);
      jobSpecInputTextValue = undefined; 
      hasValidInput = true;
    } else if (jobSpecInputType === "text" && jobSpecText.trim()) {
      hasValidInput = true;
    } else if (jobSpecInputType === "url" && jobSpecUrl.trim()) {
      jobSpecInputTextValue = `Job Specification from URL: ${jobSpecUrl.trim()}`; 
      toast({ title: "URL as Text", description: "Job spec URL content will be treated as text. For best results, paste content directly or upload a file."});
      hasValidInput = true;
    }
    
    return { jobSpecDataUri: jobSpecInputDataUri, jobSpecText: jobSpecInputTextValue, hasInput: hasValidInput };
  };
  
  const handleAssessMatch = async () => {
    if (!masterResumeText.trim()) {
      toast({ variant: "destructive", title: "Missing Master Resume", description: "Please provide your master resume text using the 'Master Resume' page, or clear the stored resume to paste new content here." });
      return;
    }
    const { jobSpecDataUri, jobSpecText: currentJobSpecText, hasInput } = await getJobSpecInputs();
    if (!hasInput) {
       toast({ variant: "destructive", title: "Missing Job Specification", description: "Please provide the job specification (file, text, or URL)." });
      return;
    }

    setIsLoadingAssessment(true);
    setAssessmentOutput(null);
    setTailoredResumeOutput(null); 
    setCoverLetterOutput(null);  
    setError(null);

    try {
      const masterResumeDataUri = textToDataURI(masterResumeText);
      const input: AssessJobMatchInput = { masterResumeDataUri, jobSpecDataUri, jobSpecText: currentJobSpecText };
      const result = await assessJobMatch(input);
      setAssessmentOutput(result);
      toast({ title: "Job Match Assessed!", description: "AI has analyzed your resume against the job spec." });
    } catch (e: any) {
      console.error("Error assessing job match:", e);
      setError(e.message || "An unexpected error occurred during assessment.");
      toast({ variant: "destructive", title: "Assessment Error", description: e.message });
    } finally {
      setIsLoadingAssessment(false);
    }
  };

  const handleTailorAndGenerateCoverLetter = async () => {
    if (!masterResumeText.trim()) {
       toast({ variant: "destructive", title: "Missing Master Resume", description: "Please provide your master resume text using the 'Master Resume' page, or clear the stored resume to paste new content here." });
      return;
    }
    const { jobSpecDataUri, jobSpecText: currentJobSpecText, hasInput } = await getJobSpecInputs();
    if (!hasInput) {
       toast({ variant: "destructive", title: "Missing Job Specification", description: "Please provide the job specification (file, text, or URL)." });
      return;
    }

    setIsLoadingTailoring(true);
    setIsLoadingCoverLetter(true);
    setTailoredResumeOutput(null);
    setCoverLetterOutput(null);
    setError(null);

    const masterResumeDataUriVal = textToDataURI(masterResumeText);

    try {
      const tailorInput = { masterResumeDataUri: masterResumeDataUriVal, jobSpecDataUri, jobSpecText: currentJobSpecText };
      const tailoredResult = await tailorResumeToJobSpec(tailorInput);
      setTailoredResumeOutput(tailoredResult);
      toast({ title: "Resume Tailored!", description: "Your resume has been customized for the job." });

      const coverLetterInput: GenerateCoverLetterInput = {
        masterResumeDataUri: masterResumeDataUriVal,
        jobSpecDataUri,
        jobSpecText: currentJobSpecText,
        companyName: companyName.trim() || undefined,
        jobTitle: jobTitleForCoverLetter.trim() || undefined,
        tailoredResumeText: tailoredResult.tailoredResume, 
      };
      const coverLetterResult = await generateCoverLetter(coverLetterInput);
      setCoverLetterOutput(coverLetterResult);
      toast({ title: "Cover Letter Generated!", description: "AI has drafted a cover letter for you." });

    } catch (e: any)      {
      console.error("Error in tailoring/cover letter generation:", e);
      setError(e.message || "An unexpected error occurred.");
      toast({ variant: "destructive", title: "Processing Error", description: e.message });
    } finally {
      setIsLoadingTailoring(false);
      setIsLoadingCoverLetter(false);
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
    const input = document.getElementById('tailored-resume-content');
    if (input && tailoredResumeOutput) {
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
          pdf.save("tailored_resume.pdf");
          toast({ title: "PDF Downloaded!", description: "Your tailored resume has been saved." });
        });
    } else {
        toast({ variant: "destructive", title: "Error", description: "Could not find resume content to generate PDF." });
    }
  };

  const downloadDocx = () => {
    if (!tailoredResumeOutput) {
        toast({ variant: "destructive", title: "Error", description: "No tailored resume to download." });
        return;
    }
    toast({ title: "Generating DOCX...", description: "This may take a moment." });

    const name = loadedExtractedName || 'Candidate Name';
    const title = loadedExtractedJobTitle || 'Professional Title';

    const contactParts: string[] = [];
    if (loadedContactInfo?.location) contactParts.push(loadedContactInfo.location);
    if (loadedContactInfo?.phone) contactParts.push(loadedContactInfo.phone);
    if (loadedContactInfo?.email) contactParts.push(loadedContactInfo.email);
    if (loadedContactInfo?.linkedin && loadedContactInfo.linkedin !== 'null') contactParts.push(loadedContactInfo.linkedin);

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
                new Paragraph({ text: "" }), // Spacer
                ...(loadedSkills && loadedSkills.length > 0 ? [
                     new Paragraph({
                        children: [new TextRun({ text: "Skills", bold: true })],
                        heading: HeadingLevel.HEADING_2,
                    }),
                    new Paragraph({
                        text: loadedSkills.join(', '),
                    }),
                    new Paragraph({ text: "" }), // Spacer
                ] : []),
                ...tailoredResumeOutput.tailoredResume.split('\n').map(line => new Paragraph(line)),
            ],
        }],
        styles: {
             paragraphStyles: [
                {
                    id: "heading1",
                    name: "Heading 1",
                    basedOn: "Normal",
                    next: "Normal",
                    quickFormat: true,
                    run: {
                        size: 32, // 16pt
                        bold: true,
                    },
                },
                {
                    id: "heading2",
                    name: "Heading 2",
                    basedOn: "Normal",
                    next: "Normal",
                    quickFormat: true,
                    run: {
                        size: 24, // 12pt
                        italics: true,
                        color: "555555",
                    },
                },
                {
                    id: "contact",
                    name: "Contact",
                    basedOn: "Normal",
                    next: "Normal",
                    run: {
                        size: 20, // 10pt
                        color: "888888",
                    },
                },
            ]
        }
    });

    Packer.toBlob(doc).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "tailored_resume.docx";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "DOCX Downloaded!", description: "Your tailored resume has been saved." });
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight font-headline text-primary">Job Matching AI</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Assess your resume against a job spec, then let AI tailor your resume and draft a cover letter.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center"><Briefcase className="mr-2 h-6 w-6 text-primary"/> Your Master Resume</CardTitle>
            {!isMasterResumeFromStorage && (
              <CardDescription>Paste the content of your AI-crafted Master Resume here, or <Link href="/master-resume" className="underline text-primary hover:text-primary/80">create one on the 'Master Resume' page</Link> to use it automatically.</CardDescription>
            )}
             {isMasterResumeFromStorage && (
              <CardDescription>Using Master Resume from local storage. Create or update on the 'Master Resume' page.</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {isMasterResumeFromStorage ? (
              <Card className="bg-primary/5 border-primary">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center text-primary-dark">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-500" /> Loaded: {masterResumeUserTitle}
                  </CardTitle>
                  <CardDescription>
                    Processed: {masterResumeTimestamp}
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="outline" size="sm" onClick={handleClearStoredMasterResume}>
                    <Edit className="mr-2 h-4 w-4" /> Use Different Resume
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <Textarea
                placeholder="Paste your master resume content here..."
                value={masterResumeText}
                onChange={(e) => setMasterResumeText(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                aria-label="Master Resume Text Area"
              />
            )}
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center"><Target className="mr-2 h-6 w-6 text-primary"/> Job Specification</CardTitle>
            <CardDescription>Provide the job specification by uploading a file, pasting text, or entering a URL.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  className="min-h-[150px] font-mono text-sm"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="companyName" className="text-sm font-medium">Company Name (Optional)</Label>
                    <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Innovatech" className="mt-1"/>
                </div>
                <div>
                    <Label htmlFor="jobTitleForCoverLetter" className="text-sm font-medium">Job Title (Optional)</Label>
                    <Input id="jobTitleForCoverLetter" value={jobTitleForCoverLetter} onChange={(e) => setJobTitleForCoverLetter(e.target.value)} placeholder="e.g. Software Engineer" className="mt-1"/>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
        <Button onClick={handleAssessMatch} disabled={isLoadingAssessment || isLoadingTailoring || isLoadingCoverLetter} size="lg">
          {isLoadingAssessment ? <Spinner size={20} className="mr-2" /> : <UserCheck className="mr-2 h-5 w-5" />}
          Assess Match First
        </Button>
        <Button onClick={handleTailorAndGenerateCoverLetter} disabled={isLoadingTailoring || isLoadingCoverLetter || isLoadingAssessment} size="lg" variant="default">
          {(isLoadingTailoring || isLoadingCoverLetter) ? <Spinner size={20} className="mr-2" /> : <Sparkles className="mr-2 h-5 w-5" />}
          Tailor Resume & Draft Cover Letter
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Processing Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {(isLoadingAssessment || isLoadingTailoring || isLoadingCoverLetter) && !error && (
        <div className="mt-8 flex justify-center items-center">
          <Spinner size={48} className="text-primary" />
          <p className="ml-4 text-lg text-muted-foreground">AI is working its magic...</p>
        </div>
      )}
      
       <div className="mt-8 space-y-8">
        { (assessmentOutput) && !(isLoadingAssessment) && (
            <Card className="shadow-lg border-primary">
              <CardHeader className="bg-primary/10">
                <CardTitle className="flex items-center text-2xl font-headline text-primary"><Brain className="mr-3 h-7 w-7"/>AI Match Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="text-center">
                  <p className="text-muted-foreground text-lg">Overall Match Score</p>
                  <div className="relative mx-auto my-2 h-32 w-32">
                    <svg className="h-full w-full origin-center -rotate-90 transform" viewBox="0 0 36 36">
                      <circle
                        className="text-muted/20"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="transparent"
                        r="15.9155"
                        cx="18"
                        cy="18"
                      />
                      <circle
                        className="text-primary"
                        strokeWidth="3.5"
                        strokeDasharray={`${assessmentOutput.matchScore}, 100`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="15.9155"
                        cx="18"
                        cy="18"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold text-primary">{assessmentOutput.matchScore}%</span>
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-foreground/90">{assessmentOutput.summary}</p>
                </div>
                <Separator />
                <ResumeSection
                  title="Strengths Aligned with Job Spec"
                  icon={<BarChartBig className="h-6 w-6 text-green-500" />}
                  content={assessmentOutput.strengths.length > 0 ? assessmentOutput.strengths : "No specific strengths highlighted by AI for this job."}
                />
                <ResumeSection
                  title="Areas for Improvement"
                  icon={<Lightbulb className="h-6 w-6 text-yellow-500" />}
                  content={assessmentOutput.areasForImprovement.length > 0 ? assessmentOutput.areasForImprovement : "AI found no specific areas to improve for this job spec!"}
                />
              </CardContent>
            </Card>
          )}
          
            <div className="space-y-8">
               {tailoredResumeOutput && !isLoadingTailoring && (
                  <Card className="bg-card shadow-xl overflow-hidden border-accent">
                    <ScrollArea className="max-h-[1200px] w-full">
                      <CardHeader className="bg-accent/10">
                          <CardTitle className="flex items-center text-accent-foreground">
                              <FileText className="h-5 w-5 mr-2" />
                              AI Tailored Resume
                          </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6">
                          <div id="tailored-resume-content" className="p-4 rounded-lg border bg-background">
                              {(loadedExtractedName || loadedExtractedJobTitle) && (
                                  <header className="flex items-center mb-6 pb-4 border-b">
                                       <div className="relative">
                                          <Avatar className="h-20 w-20 mr-5">
                                              <AvatarImage src={avatarUri || "https://placehold.co/128x128.png"} data-ai-hint="professional portrait" />
                                              <AvatarFallback className="text-2xl">
                                                  {loadedExtractedName?.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() || '??'}
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
                                          <h2 className="text-3xl font-bold font-headline text-primary">{loadedExtractedName || '[Candidate Name]'}</h2>
                                          <p className="text-lg text-muted-foreground">{loadedExtractedJobTitle || '[Professional Title]'}</p>
                                      </div>
                                  </header>
                              )}

                              <div className="grid md:grid-cols-3 gap-6">
                                  <aside className="md:col-span-1 space-y-4">
                                      {loadedContactInfo && (
                                          <div className="space-y-2 text-sm">
                                              <h3 className="font-semibold text-primary">Contact</h3>
                                              <Separator />
                                              {loadedContactInfo.location && <p className="flex items-start gap-2 pt-1"><MapPin size={14} className="mt-0.5 shrink-0"/> <span>{loadedContactInfo.location}</span></p>}
                                              {loadedContactInfo.phone && <p className="flex items-start gap-2"><Phone size={14} className="mt-0.5 shrink-0"/> <span>{loadedContactInfo.phone}</span></p>}
                                              {loadedContactInfo.email && <p className="flex items-start gap-2"><Mail size={14} className="mt-0.5 shrink-0"/> <span className="break-all">{loadedContactInfo.email}</span></p>}
                                              {loadedContactInfo.linkedin && loadedContactInfo.linkedin !== 'null' && (
                                                  <p className="flex items-start gap-2">
                                                      <Linkedin size={14} className="mt-0.5 shrink-0"/>
                                                      <Link href={!loadedContactInfo.linkedin.startsWith('http') ? `https://${loadedContactInfo.linkedin}` : loadedContactInfo.linkedin} target="_blank" className="text-primary hover:underline break-all">{loadedContactInfo.linkedin.replace(/^https?:\/\//, '')}</Link>
                                                  </p>
                                              )}
                                          </div>
                                      )}
                                      {loadedSkills && loadedSkills.length > 0 && (
                                          <div className="space-y-2 text-sm pt-2">
                                              <h3 className="font-semibold text-primary">Skills</h3>
                                              <Separator />
                                              <div className="flex flex-wrap gap-2 pt-2">
                                                  {loadedSkills.map((skill, index) => (
                                                      <Badge key={`${skill}-${index}`} variant="secondary">{skill}</Badge>
                                                  ))}
                                              </div>
                                          </div>
                                      )}
                                  </aside>
                                  
                                  <main className="md:col-span-2">
                                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-card-foreground">
                                          {tailoredResumeOutput.tailoredResume || "No tailored resume content provided."}
                                      </pre>
                                  </main>
                              </div>
                          </div>

                          {tailoredResumeOutput.questions && tailoredResumeOutput.questions.length > 0 && (
                            <>
                              <Separator className="my-6" />
                              <ResumeSection
                                title="Clarifying Questions from AI (for Tailoring)"
                                icon={<HelpCircleIcon className="h-6 w-6 text-blue-500" />}
                                content={tailoredResumeOutput.questions}
                                className="border-blue-500/50 bg-transparent shadow-none"
                              />
                            </>
                          )}
                      </CardContent>
                      <CardFooter>
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button disabled={!tailoredResumeOutput.tailoredResume}>
                                      <Download className="mr-2 h-5 w-5" /> Download Resume
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={downloadPdf}>
                                      as PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={downloadDocx}>
                                      as DOCX
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => downloadTextFile("tailored_resume.txt", tailoredResumeOutput.tailoredResume)}>
                                      as TXT
                                  </DropdownMenuItem>
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </CardFooter>
                    </ScrollArea>
                  </Card>
                )}

                {coverLetterOutput && !isLoadingCoverLetter && (
                  <Card className="bg-card shadow-xl overflow-hidden border-accent">
                    <ScrollArea className="max-h-[1200px] w-full">
                      <CardHeader className="bg-accent/10">
                        <CardTitle className="flex items-center text-accent-foreground">
                            <FileSignature className="h-5 w-5 mr-2" />
                            AI Generated Cover Letter
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6">
                            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-card-foreground bg-muted/30 p-4 rounded-md border h-full">
                                {coverLetterOutput.coverLetter || "No cover letter content provided."}
                            </pre>
                      </CardContent>
                      <CardFooter>
                          <Button onClick={() => downloadTextFile("cover_letter.txt", coverLetterOutput.coverLetter)} disabled={!coverLetterOutput.coverLetter}>
                              <Download className="mr-2 h-5 w-5" /> Download Cover Letter (TXT)
                          </Button>
                      </CardFooter>
                    </ScrollArea>
                  </Card>
                )}
            </div>
      </div>
    </div>
  );
}
