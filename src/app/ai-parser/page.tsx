"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Upload,
  FileText,
  Briefcase,
  Mail,
  AlertTriangle,
  Users,
  Star,
  FileCheck2,
  UploadCloud,
  Lightbulb,
  BarChartBig,
  Brain,
  Clock,
  DollarSign,
  Monitor,
  Printer,
  Download,
  Save,
  CheckCircle2,
  Building
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { fileToDataURI, textToDataURI } from "@/lib/file-utils";
import { reformatResume, type ReformatResumeOutput } from "@/ai/flows/reformat-resume";
import { extractCVData, type ExtractCVDataOutput } from "@/ai/flows/extract-cv-data";
import { assessJobMatch, type AssessJobMatchInput, type AssessJobMatchOutput } from "@/ai/flows/assess-job-match";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ResumeSection } from "@/components/feature/resume-section";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type ParsedResume = ReformatResumeOutput & {
  fileName: string;
  extractedData?: ExtractCVDataOutput;
};

const COMPANY_STORAGE_KEYS = {
  NAME: 'recruitedAI_companyName',
  LOGO: 'recruitedAI_companyLogo',
  WEBSITE: 'recruitedAI_companyWebsite',
  EMAIL: 'recruitedAI_companyEmail',
  ADDRESS: 'recruitedAI_companyAddress',
};

export default function AiParserPage() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobSpecFile, setJobSpecFile] = useState<File | null>(null);
  const [jobSpecText, setJobSpecText] = useState('');
  
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [assessmentOutput, setAssessmentOutput] = useState<AssessJobMatchOutput | null>(null);

  const [isParsing, setIsLoading] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [dragActiveResume, setDragActiveResume] = useState(false);
  const [dragActiveJobSpec, setDragActiveJobSpec] = useState(false);

  // Branded CV States
  const [companyInfo, setCompanyInfo] = useState<{ name: string; logo: string; website: string } | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const brandedCvRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    const name = localStorage.getItem(COMPANY_STORAGE_KEYS.NAME);
    const logo = localStorage.getItem(COMPANY_STORAGE_KEYS.LOGO);
    const website = localStorage.getItem(COMPANY_STORAGE_KEYS.WEBSITE);
    if (name) {
      setCompanyInfo({ name, logo: logo || '', website: website || '' });
    }
  }, []);

  const handleDrag = (e: React.DragEvent<HTMLDivElement | HTMLLabelElement>, type: 'resume' | 'jobspec') => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      type === 'resume' ? setDragActiveResume(true) : setDragActiveJobSpec(true);
    } else if (e.type === "dragleave") {
      type === 'resume' ? setDragActiveResume(false) : setDragActiveJobSpec(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement | HTMLLabelElement>, type: 'resume' | 'jobspec') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'resume') {
      setDragActiveResume(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleResumeFileChange({ target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>);
      }
    } else {
      setDragActiveJobSpec(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleJobSpecFileChange({ target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  };

  const handleResumeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setResumeFile(file);
      setIsParsing(true);
      setError(null);
      setParsedResume(null);
      setAssessmentOutput(null);

      try {
        const resumeDataUri = await fileToDataURI(file);
        
        const [reformatResult, extractResult] = await Promise.all([
          reformatResume({ resumeDataUri }),
          extractCVData({ resumeDataUri })
        ]);

        setParsedResume({ 
          ...reformatResult, 
          fileName: file.name,
          extractedData: extractResult
        });

        toast({
          title: "Resume Parsed & Analyzed!",
          description: "Candidate details and core metrics have been extracted.",
        });
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred during parsing.");
        toast({
          variant: "destructive",
          title: "Parsing Failed",
          description: err.message || "Could not parse the resume.",
        });
      } finally {
        setIsParsing(false);
      }
    }
  };

  const handleJobSpecFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setJobSpecFile(e.target.files[0]);
        setJobSpecText('');
        setAssessmentOutput(null);
    }
  };

  const handleMatch = async () => {
    if (!parsedResume || (!jobSpecFile && !jobSpecText.trim())) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please ensure a resume is parsed and a job spec is provided.",
      });
      return;
    }

    setIsMatching(true);
    setError(null);
    setAssessmentOutput(null);

    try {
      const masterResumeDataUri = textToDataURI(parsedResume.reformattedResume);
      const jobSpecDataUri = jobSpecFile ? await fileToDataURI(jobSpecFile) : undefined;
      
      const input: AssessJobMatchInput = {
        masterResumeDataUri,
        jobSpecDataUri,
        jobSpecText: jobSpecText.trim() || undefined,
      };

      const result = await assessJobMatch(input);
      setAssessmentOutput(result);
      toast({
        title: "Match Assessed!",
        description: "The AI has analyzed the candidate's fit for the role.",
      });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during matching.");
      toast({
        variant: "destructive",
        title: "Matching Failed",
        description: err.message || "Could not assess the job match.",
      });
    } finally {
      setIsMatching(false);
    }
  };

  const downloadBrandedCv = async () => {
    if (!brandedCvRef.current) return;
    
    toast({ title: "Generating Branded CV...", description: "Optimizing layout for PDF." });
    
    const canvas = await html2canvas(brandedCvRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const ratio = canvas.width / canvas.height;
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
    
    pdf.save(`Branded_CV_${parsedResume?.fullName?.replace(/\s+/g, '_') || 'Candidate'}.pdf`);
    setShowSaveDialog(true);
  };

  const handleSaveCandidate = (save: boolean) => {
    setShowSaveDialog(false);
    if (save) {
      toast({
        title: "Candidate Saved",
        description: "The record and branded CV have been added to your database.",
      });
    } else {
      toast({
        description: "Branded CV downloaded. Record not saved.",
      });
    }
  };


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Smart Parser & Match</h1>
          <p className="mt-1 text-muted-foreground">
            AI-powered resume extraction, agency branding, and job matching.
          </p>
        </div>
        <div className="flex gap-2">
           <Button 
            variant="outline"
            disabled={!parsedResume || isMatching}
            onClick={downloadBrandedCv}
          >
            <Printer className="mr-2 h-4 w-4" />
            Branded CV
          </Button>
          <Button 
            disabled={!parsedResume || (!jobSpecFile && !jobSpecText.trim()) || isMatching}
            onClick={handleMatch}
          >
            <Star className="mr-2 h-4 w-4" />
            {isMatching ? "Matching..." : "Start AI Matching"}
          </Button>
        </div>
      </div>

      {!companyInfo && (
        <Alert className="bg-primary/5 border-primary/20">
          <Building className="h-4 w-4" />
          <AlertTitle>No Agency Branding Found</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Configure your company logo and details in the Profile section to generate professional branded CVs.</span>
            <Button variant="link" asChild className="p-0 h-auto">
              <Link href="/profile?tab=company">Set up Branding →</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="h-6 w-6 text-primary"/> Upload Resume</CardTitle>
          </CardHeader>
          <CardContent>
            <label
              htmlFor="resume-upload-input"
              onDragEnter={(e) => handleDrag(e, 'resume')}
              onDragLeave={(e) => handleDrag(e, 'resume')}
              onDragOver={(e) => handleDrag(e, 'resume')}
              onDrop={(e) => handleDrop(e, 'resume')}
              className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer
              ${dragActiveResume ? "border-primary bg-primary/10" : "border-border"}
              bg-card hover:bg-muted/50 transition-colors`}
            >
              <div className="flex flex-col items-center justify-center text-center p-4">
                <FileText className={`h-10 w-10 mb-3 ${dragActiveResume ? "text-primary" : "text-muted-foreground"}`} />
                <p className="font-semibold">Upload Candidate Resume</p>
                <p className="text-sm text-muted-foreground">PDF or DOCX</p>
                 <Button variant="default" size="sm" className="pointer-events-none mt-2">Select File</Button>
              </div>
              <input
                id="resume-upload-input"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleResumeFileChange}
                disabled={isParsing}
              />
            </label>
             {isParsing && (
              <div className="mt-4 flex justify-center items-center gap-2 text-primary">
                <Spinner size={16} />
                <p>Parsing & Extracting Data...</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileCheck2 className="h-6 w-6 text-green-600"/> Job Spec Intake</CardTitle>
          </CardHeader>
          <CardContent>
             <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="file">Upload File</TabsTrigger>
                  <TabsTrigger value="text">Paste Text</TabsTrigger>
                </TabsList>
                <TabsContent value="file">
                   <label
                    htmlFor="jobspec-upload-input"
                    onDragEnter={(e) => handleDrag(e, 'jobspec')}
                    onDragLeave={(e) => handleDrag(e, 'jobspec')}
                    onDragOver={(e) => handleDrag(e, 'jobspec')}
                    onDrop={(e) => handleDrop(e, 'jobspec')}
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer
                    ${dragActiveJobSpec ? "border-primary bg-primary/10" : "border-border"}
                    bg-card hover:bg-muted/50 transition-colors`}
                  >
                    <div className="flex flex-col items-center justify-center text-center p-4">
                       <UploadCloud className={`h-8 w-8 mb-2 ${dragActiveJobSpec ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="font-semibold">Upload Job Spec</p>
                    </div>
                    <Input
                      id="jobspec-upload-input"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,text/plain"
                      onChange={handleJobSpecFileChange}
                      disabled={isMatching}
                    />
                  </label>
                  {jobSpecFile && <p className="mt-2 text-sm text-center text-muted-foreground">Selected: {jobSpecFile.name}</p>}
                </TabsContent>
                <TabsContent value="text">
                  <Textarea
                    placeholder="Paste the job description text here..."
                    value={jobSpecText}
                    onChange={(e) => { setJobSpecText(e.target.value); setJobSpecFile(null); setAssessmentOutput(null); }}
                    className="min-h-[128px]"
                    disabled={isMatching}
                  />
                </TabsContent>
              </Tabs>
          </CardContent>
        </Card>
      </div>

      {error && (
          <Alert variant="destructive" className="mt-8">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
          </Alert>
      )}

      {parsedResume && (
        <div className="space-y-8">
          <div className="grid md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> Extracted Profile</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold">{parsedResume.fullName || 'Name Not Found'}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <Mail className="h-4 w-4" />
                          {parsedResume.contactInfo?.email || 'email@notfound.com'}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <Briefcase className="h-4 w-4" />
                          {parsedResume.currentJobTitle || "Current title not found"}
                        </p>
                        
                        <div className="mt-6">
                          <h4 className="text-sm font-semibold mb-2">Professional Summary:</h4>
                          <p className="text-sm text-muted-foreground italic">"{parsedResume.extractedData?.summary || 'No summary generated.'}"</p>
                        </div>

                        <div className="mt-4">
                          <h4 className="text-sm font-semibold">Skills Identified:</h4>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {parsedResume.skills && parsedResume.skills.length > 0 ? (
                              parsedResume.skills.slice(0, 10).map((skill, index) => <Badge key={`${skill}-${index}`} variant="secondary">{skill}</Badge>)
                            ) : (
                              <p className="text-sm text-muted-foreground">No skills extracted.</p>
                            )}
                          </div>
                        </div>
                      </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Core Metrics</CardTitle>
                  <CardDescription>Extracted Details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Notice Period</span>
                    </div>
                    <Badge variant="outline" className="text-primary">{parsedResume.extractedData?.noticePeriod || 'N/A'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>Salary Range</span>
                    </div>
                    <Badge variant="outline" className="text-green-600">{parsedResume.extractedData?.salary || 'N/A'}</Badge>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                      <Monitor className="h-4 w-4 text-primary" />
                      <span>Hardware Specs:</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{parsedResume.extractedData?.pcSpecs || 'No hardware details found.'}</p>
                  </div>
                </CardContent>
              </Card>
          </div>

          {/* Branded CV Generation Section (Hidden content used for PDF generation) */}
          <div className="hidden">
            <div ref={brandedCvRef} className="p-12 bg-white text-black font-serif w-[210mm] min-h-[297mm]">
              {/* Agency Header */}
              <div className="flex items-center justify-between border-b-2 border-primary pb-6 mb-8">
                {companyInfo?.logo ? (
                  <img src={companyInfo.logo} alt="Logo" className="h-16 object-contain" />
                ) : (
                  <div className="h-16 w-16 bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl">
                    {companyInfo?.name?.charAt(0) || 'A'}
                  </div>
                )}
                <div className="text-right">
                  <h2 className="text-2xl font-bold text-primary tracking-tight uppercase">{companyInfo?.name || 'Recruitment Agency'}</h2>
                  <p className="text-sm text-gray-600">{companyInfo?.website || 'www.agency.com'}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Confidential Candidate Profile</p>
                </div>
              </div>

              {/* Candidate Info */}
              <div className="mb-10">
                <h1 className="text-4xl font-bold mb-2">{parsedResume.fullName}</h1>
                <p className="text-xl text-primary font-semibold italic border-l-4 border-primary/30 pl-4">{parsedResume.currentJobTitle}</p>
              </div>

              <div className="grid grid-cols-3 gap-12">
                <div className="col-span-1 space-y-8">
                  <section>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary border-b border-gray-200 pb-2 mb-4">Availability</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-semibold">Notice:</span> {parsedResume.extractedData?.noticePeriod || 'Discuss'}</p>
                      <p><span className="font-semibold">Expectation:</span> {parsedResume.extractedData?.salary || 'Market'}</p>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary border-b border-gray-200 pb-2 mb-4">Technical Proficiencies</h3>
                    <div className="flex flex-wrap gap-2">
                      {parsedResume.skills?.map((s, i) => (
                        <span key={i} className="text-[10px] bg-gray-100 px-2 py-1 rounded">{s}</span>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="col-span-2 space-y-8">
                  <section>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary border-b border-gray-200 pb-2 mb-4">Consultant Overview</h3>
                    <p className="text-sm leading-relaxed italic text-gray-700">"{parsedResume.extractedData?.summary}"</p>
                  </section>

                  <section>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary border-b border-gray-200 pb-2 mb-4">Professional History</h3>
                    <div className="text-[11px] whitespace-pre-wrap text-gray-800 leading-tight">
                      {parsedResume.reformattedResume}
                    </div>
                  </section>
                </div>
              </div>

              <footer className="mt-auto pt-12 text-[10px] text-center text-gray-400 border-t border-gray-100">
                This document is confidential and intended for the recipient only. Generated by {companyInfo?.name || 'RecruitedAI'}.
              </footer>
            </div>
          </div>
        </div>
      )}

      {isMatching && (
        <div className="mt-8 flex justify-center items-center">
          <Spinner size={48} className="text-primary" />
          <p className="ml-4 text-lg text-muted-foreground">AI is assessing the match...</p>
        </div>
      )}

      {assessmentOutput && (
         <Card className="mt-8 shadow-lg border-primary">
            <CardHeader className="bg-primary/10">
              <CardTitle className="flex items-center text-2xl font-headline text-primary"><Brain className="mr-3 h-7 w-7"/>AI Match Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="text-center">
                <p className="text-muted-foreground text-lg">Overall Match Score</p>
                 <div className="relative mx-auto my-2 h-32 w-32">
                   <svg className="h-full w-full origin-center -rotate-90 transform" viewBox="0 0 36 36">
                      <circle className="text-muted/20" strokeWidth="3.5" stroke="currentColor" fill="transparent" r="15.9155" cx="18" cy="18" />
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
              <div className="grid md:grid-cols-2 gap-6">
                <ResumeSection
                  title="Candidate Strengths"
                  icon={<BarChartBig className="h-6 w-6 text-green-500" />}
                  content={assessmentOutput.strengths.length > 0 ? assessmentOutput.strengths : "No specific strengths highlighted."}
                />
                <ResumeSection
                  title="Missing Alignments"
                  icon={<Lightbulb className="h-6 w-6 text-yellow-500" />}
                  content={assessmentOutput.areasForImprovement.length > 0 ? assessmentOutput.areasForImprovement : "No specific areas for improvement identified."}
                />
              </div>
            </CardContent>
          </Card>
      )}

      {/* Save Candidate Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="text-green-500 h-5 w-5" /> 
              Branded CV Generated!
            </DialogTitle>
            <DialogDescription>
              Your branded candidate profile has been downloaded. Would you like to save this record to your candidate database?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-4 p-4 border rounded bg-muted/20">
            <div className="h-10 w-10 bg-primary/10 rounded flex items-center justify-center text-primary font-bold">
              {parsedResume?.fullName?.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{parsedResume?.fullName}</p>
              <p className="text-xs text-muted-foreground">{parsedResume?.currentJobTitle}</p>
            </div>
          </div>
          <DialogFooter className="flex sm:justify-between gap-2">
            <Button variant="outline" onClick={() => handleSaveCandidate(false)}>
              No, one-time download
            </Button>
            <Button onClick={() => handleSaveCandidate(true)}>
              <Save className="mr-2 h-4 w-4" /> Save Candidate Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
