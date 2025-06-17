
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { tailorResumeToJobSpec, type TailorResumeToJobSpecOutput } from '@/ai/flows/tailor-resume-to-job-spec';
import { assessJobMatch, type AssessJobMatchInput, type AssessJobMatchOutput } from '@/ai/flows/assess-job-match';
import { generateCoverLetter, type GenerateCoverLetterInput, type GenerateCoverLetterOutput } from '@/ai/flows/generate-cover-letter';
import { fileToDataURI, textToDataURI } from '@/lib/file-utils';
import { ResumeSection } from '@/components/feature/resume-section';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, FileText, Briefcase, AlertTriangle, Target, UploadCloud, Download, Sparkles, UserCheck, FileSignature, PercentCircle, BarChartBig, Brain } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

type JobSpecInputType = "file" | "text" | "url";

export default function JobMatchingPage() {
  const [masterResumeText, setMasterResumeText] = useState('');
  // Note: Ideally, masterResumeText would be pre-filled from the user's saved Master Resume.
  // For now, it's a manual paste.

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
      jobSpecInputTextValue = undefined; // Prefer file
      hasValidInput = true;
    } else if (jobSpecInputType === "text" && jobSpecText.trim()) {
      hasValidInput = true;
    } else if (jobSpecInputType === "url" && jobSpecUrl.trim()) {
      // For MVP, passing URL as text. Actual fetching is more complex.
      jobSpecInputTextValue = `Job Specification from URL: ${jobSpecUrl.trim()}`;
      toast({ title: "URL as Text", description: "Job spec URL content will be treated as text. For best results, paste content directly or upload a file."});
      hasValidInput = true;
    }
    
    return { jobSpecDataUri: jobSpecInputDataUri, jobSpecText: jobSpecInputTextValue, hasInput: hasValidInput };
  };
  
  const handleAssessMatch = async () => {
    if (!masterResumeText.trim()) {
      toast({ variant: "destructive", title: "Missing Master Resume", description: "Please paste your master resume text." });
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
      toast({ variant: "destructive", title: "Missing Master Resume" });
      return;
    }
    const { jobSpecDataUri, jobSpecText: currentJobSpecText, hasInput } = await getJobSpecInputs();
    if (!hasInput) {
       toast({ variant: "destructive", title: "Missing Job Specification" });
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
      toast({ title: "Resume Tailored!", description: "Your resume has been customized." });

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

    } catch (e: any) {
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
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element); // Required for this to work in FireFox
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
            <CardDescription>Paste the text of your master resume. This will be used for matching and tailoring. Ideally, this would be pre-loaded from your saved Master Resume.</CardDescription>
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
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="companyName">Company Name (Optional)</Label>
                    <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Google" />
                </div>
                <div>
                    <Label htmlFor="jobTitleForCoverLetter">Job Title (Optional)</Label>
                    <Input id="jobTitleForCoverLetter" value={jobTitleForCoverLetter} onChange={(e) => setJobTitleForCoverLetter(e.target.value)} placeholder="e.g. Software Engineer" />
                </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
        <Button onClick={handleAssessMatch} disabled={isLoadingAssessment || isLoadingTailoring} size="lg">
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

      {assessmentOutput && !isLoadingAssessment && (
        <Card className="mt-12 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl font-headline text-primary"><Brain className="mr-3 h-7 w-7"/>AI Match Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-muted-foreground text-lg">Match Score</p>
              <div className="relative mx-auto my-2 h-32 w-32">
                 <svg className="h-full w-full" viewBox="0 0 36 36">
                    <path
                      className="text-muted/30"
                      strokeWidth="3.5"
                      fill="none"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-primary"
                      strokeWidth="3.5"
                      strokeDasharray={`${assessmentOutput.matchScore}, 100`}
                      strokeLinecap="round"
                      fill="none"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-primary">{assessmentOutput.matchScore}%</span>
                </div>
              </div>
              <p className="text-lg font-semibold">{assessmentOutput.summary}</p>
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

      {tailoredResumeOutput && !isLoadingTailoring && (
        <ScrollArea className="mt-8 p-1 rounded-lg border bg-card shadow-lg max-h-[80vh]">
          <div className="p-6 space-y-8">
            <h2 className="text-3xl font-bold text-center font-headline text-primary">Your Tailored Resume & Cover Letter</h2>
            
            <ResumeSection
              title="AI Tailored Resume"
              icon={<FileText className="h-6 w-6 text-accent" />}
              content={tailoredResumeOutput.tailoredResume || "No tailored resume content provided."}
            />
             <div className="text-center">
                <Button size="lg" onClick={() => downloadTextFile("tailored_resume.txt", tailoredResumeOutput.tailoredResume)}>
                    <Download className="mr-2 h-5 w-5" /> Download Tailored Resume (TXT)
                </Button>
            </div>

            <Separator />
            
            {tailoredResumeOutput.questions && tailoredResumeOutput.questions.length > 0 && (
              <ResumeSection
                title="Clarifying Questions from AI (for Tailoring)"
                icon={<HelpCircle className="h-6 w-6 text-blue-500" />}
                content={tailoredResumeOutput.questions}
                className="border-blue-500/50"
              />
            )}
            
            {coverLetterOutput && !isLoadingCoverLetter && (
              <>
                <Separator />
                <ResumeSection
                  title="AI Generated Cover Letter"
                  icon={<FileSignature className="h-6 w-6 text-accent" />}
                  content={coverLetterOutput.coverLetter || "No cover letter content provided."}
                />
                 <div className="text-center">
                    <Button size="lg" onClick={() => downloadTextFile("cover_letter.txt", coverLetterOutput.coverLetter)}>
                        <Download className="mr-2 h-5 w-5" /> Download Cover Letter (TXT)
                    </Button>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// Placeholder HelpCircle if not in lucide-react (it is, but for safety)
const HelpCircle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
);
