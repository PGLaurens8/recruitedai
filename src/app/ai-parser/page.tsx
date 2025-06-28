
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { fileToDataURI, textToDataURI } from "@/lib/file-utils";
import { reformatResume, type ReformatResumeOutput } from "@/ai/flows/reformat-resume";
import { assessJobMatch, type AssessJobMatchInput, type AssessJobMatchOutput } from "@/ai/flows/assess-job-match";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ResumeSection } from "@/components/feature/resume-section";

type ParsedResume = ReformatResumeOutput & {
  fileName: string;
};

export default function AiParserPage() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobSpecFile, setJobSpecFile] = useState<File | null>(null);
  const [jobSpecText, setJobSpecText] = useState<string>('');
  
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [assessmentOutput, setAssessmentOutput] = useState<AssessJobMatchOutput | null>(null);

  const [isParsing, setIsParsing] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [dragActiveResume, setDragActiveResume] = useState(false);
  const [dragActiveJobSpec, setDragActiveJobSpec] = useState(false);
  
  const { toast } = useToast();

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
        const result = await reformatResume({ resumeDataUri });
        setParsedResume({ ...result, fileName: file.name });
        toast({
          title: "Resume Parsed!",
          description: "Candidate details have been extracted.",
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


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resume Parser & AI Matching</h1>
          <p className="mt-1 text-muted-foreground">
            Upload resumes and job specs to find the best candidate matches using AI.
          </p>
        </div>
        <Button 
          size="lg" 
          disabled={!parsedResume || (!jobSpecFile && !jobSpecText.trim()) || isMatching}
          onClick={handleMatch}
        >
          <Star className="mr-2 h-5 w-5" />
          {isMatching ? "Matching..." : "Start AI Matching"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="h-6 w-6 text-primary"/> Upload Resumes</CardTitle>
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
                <p className="font-semibold">Upload Resume Files</p>
                <p className="text-sm text-muted-foreground">Drag and drop PDF or DOCX files here, or click to browse</p>
                 <Button variant="default" size="sm" className="pointer-events-none mt-2">Select Files</Button>
              </div>
              <Input
                id="resume-upload-input"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleResumeFileChange}
                disabled={isParsing}
              />
            </label>
            <div className="text-center mt-3">
              <Badge variant="secondary">Supports PDF, DOC, DOCX</Badge>
            </div>
             {resumeFile && !isParsing && (
              <p className="mt-4 text-sm text-center text-muted-foreground">Selected: {resumeFile.name}</p>
            )}
             {isParsing && (
              <div className="mt-4 flex justify-center items-center gap-2 text-primary">
                <Spinner size={16} />
                <p>Parsing {resumeFile?.name}...</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center mt-4">AI will automatically extract: Name, Email, Experience, Skills, Education</p>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileCheck2 className="h-6 w-6 text-green-600"/> Job Specification Intake</CardTitle>
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
            <p className="text-xs text-muted-foreground text-center mt-4">AI will auto-extract title, location, employment type, skills, and requirements</p>
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
        <div className="mt-8">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <Users/> Parsed Resume
            </h2>
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div>
                      <h3 className="text-xl font-semibold">{parsedResume.fullName || 'Name Not Found'}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4" />
                        {parsedResume.contactInfo?.email || 'email@notfound.com'}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Briefcase className="h-4 w-4" />
                        {parsedResume.currentJobTitle || "Current title not found"}
                      </p>
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold">Skills:</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {parsedResume.skills && parsedResume.skills.length > 0 ? (
                            parsedResume.skills.slice(0, 5).map(skill => <Badge key={skill} variant="secondary">{skill}</Badge>)
                          ) : (
                            <p className="text-sm text-muted-foreground">No skills extracted.</p>
                          )}
                          {parsedResume.skills && parsedResume.skills.length > 5 && (
                            <Badge variant="outline">+{parsedResume.skills.length - 5}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                </div>
              </CardContent>
            </Card>
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
                  title="Strengths"
                  icon={<BarChartBig className="h-6 w-6 text-green-500" />}
                  content={assessmentOutput.strengths.length > 0 ? assessmentOutput.strengths : "No specific strengths highlighted."}
                />
                <ResumeSection
                  title="Areas for Improvement"
                  icon={<Lightbulb className="h-6 w-6 text-yellow-500" />}
                  content={assessmentOutput.areasForImprovement.length > 0 ? assessmentOutput.areasForImprovement : "No specific areas for improvement identified."}
                />
              </div>
            </CardContent>
          </Card>
      )}

    </div>
  );
}
