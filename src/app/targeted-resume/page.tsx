
"use client";

import { useState, useEffect } from 'react';
import Link from "next/link"; // Added import
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
import { Lightbulb, FileText, Briefcase, AlertTriangle, Target, UploadCloud, Download, Sparkles, UserCheck, FileSignature, PercentCircle, BarChartBig, Brain, HelpCircle as HelpCircleIcon, Edit3, CheckCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type JobSpecInputType = "file" | "text" | "url";

const LOCAL_STORAGE_KEYS = {
  MASTER_RESUME_TEXT: 'careerCraft_masterResumeText',
  MASTER_RESUME_USER_TITLE: 'careerCraft_masterResumeUserTitle',
  MASTER_RESUME_TIMESTAMP: 'careerCraft_masterResumeTimestamp',
  MASTER_RESUME_EXTRACTED_NAME: 'careerCraft_masterResumeExtractedName',
  MASTER_RESUME_EXTRACTED_JOB_TITLE: 'careerCraft_masterResumeExtractedJobTitle',
  MASTER_RESUME_CONTACT_INFO: 'careerCraft_masterResumeContactInfo',
  MASTER_RESUME_SKILLS: 'careerCraft_masterResumeSkills',
};

export default function JobMatchingPage() {
  const [masterResumeText, setMasterResumeText] = useState('');
  const [masterResumeUserTitle, setMasterResumeUserTitle] = useState('');
  const [masterResumeTimestamp, setMasterResumeTimestamp] = useState('');
  const [isMasterResumeFromStorage, setIsMasterResumeFromStorage] = useState(false);
  
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

    if (storedText && storedUserTitle && storedTimestamp) {
      setMasterResumeText(storedText);
      setMasterResumeUserTitle(storedUserTitle);
      setMasterResumeTimestamp(storedTimestamp);
      setIsMasterResumeFromStorage(true);
    } else {
      setIsMasterResumeFromStorage(false);
    }
  }, []);

  const handleClearStoredMasterResume = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_TEXT);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_USER_TITLE);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_TIMESTAMP);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_EXTRACTED_NAME); 
    localStorage.removeItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_EXTRACTED_JOB_TITLE);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_CONTACT_INFO);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_SKILLS);


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
      // For now, treat URL content as text. In a future version, this could fetch URL content.
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
      // Tailor Resume
      const tailorInput = { masterResumeDataUri: masterResumeDataUriVal, jobSpecDataUri, jobSpecText: currentJobSpecText };
      const tailoredResult = await tailorResumeToJobSpec(tailorInput);
      setTailoredResumeOutput(tailoredResult);
      toast({ title: "Resume Tailored!", description: "Your resume has been customized for the job." });

      // Generate Cover Letter
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
                    <Edit3 className="mr-2 h-4 w-4" /> Use Different Resume
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
      
      { (assessmentOutput || tailoredResumeOutput || coverLetterOutput) && !(isLoadingAssessment || isLoadingTailoring || isLoadingCoverLetter) && (
          <div className="mt-8 space-y-8">
              {assessmentOutput && (
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

              {(tailoredResumeOutput || coverLetterOutput) && (
                <div className="space-y-8">
                  {assessmentOutput && <Separator />}
                  <h2 className="text-3xl font-bold text-center font-headline text-primary pt-4">Your Tailored Application Documents</h2>
                  
                  {tailoredResumeOutput && (
                    <Card className="bg-card shadow-xl overflow-hidden border-accent">
                      <CardHeader className="bg-accent/10">
                        <CardTitle className="flex items-center text-accent-foreground">
                            <FileText className="h-5 w-5 mr-2" />
                            AI Tailored Resume
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6">
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-card-foreground bg-muted/30 p-4 rounded-md border">
                            {tailoredResumeOutput.tailoredResume || "No tailored resume content provided."}
                        </pre>
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
                          <Button onClick={() => downloadTextFile("tailored_resume.txt", tailoredResumeOutput.tailoredResume)} disabled={!tailoredResumeOutput.tailoredResume}>
                              <Download className="mr-2 h-5 w-5" /> Download Tailored Resume (TXT)
                          </Button>
                      </CardFooter>
                    </Card>
                  )}
                  
                  {coverLetterOutput && (
                    <Card className="bg-card shadow-xl overflow-hidden border-accent">
                      <CardHeader className="bg-accent/10">
                        <CardTitle className="flex items-center text-accent-foreground">
                            <FileSignature className="h-5 w-5 mr-2" />
                            AI Generated Cover Letter
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6">
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-card-foreground bg-muted/30 p-4 rounded-md border">
                            {coverLetterOutput.coverLetter || "No cover letter content provided."}
                        </pre>
                      </CardContent>
                      <CardFooter>
                          <Button onClick={() => downloadTextFile("cover_letter.txt", coverLetterOutput.coverLetter)} disabled={!coverLetterOutput.coverLetter}>
                              <Download className="mr-2 h-5 w-5" /> Download Cover Letter (TXT)
                          </Button>
                      </CardFooter>
                    </Card>
                  )}
                </div>
              )}
          </div>
      )}
    </div>
  );
}
