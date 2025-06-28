"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { fileToDataURI } from "@/lib/file-utils";
import { reformatResume, type ReformatResumeOutput } from "@/ai/flows/reformat-resume";

// Simplified output for display purposes, adding file info
type ParsedResume = ReformatResumeOutput & {
  fileName: string;
};

export default function AiParserPage() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobSpecFile, setJobSpecFile] = useState<File | null>(null);
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);

  const [isParsing, setIsParsing] = useState(false);
  const [isMatching, setIsMatching] = useState(false); // For future use
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
    type === 'resume' ? setDragActiveResume(false) : setDragActiveJobSpec(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (type === 'resume') {
        handleResumeFileChange({ target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>);
      } else {
        setJobSpecFile(e.dataTransfer.files[0]);
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
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resume Parser & AI Matching</h1>
          <p className="mt-1 text-muted-foreground">
            Upload resumes and create structured job specs to find the best candidate matches using AI.
          </p>
        </div>
        <Button size="lg" disabled={!parsedResume || !jobSpecFile || isMatching}>
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
             <label
              htmlFor="jobspec-upload-input"
              onDragEnter={(e) => handleDrag(e, 'jobspec')}
              onDragLeave={(e) => handleDrag(e, 'jobspec')}
              onDragOver={(e) => handleDrag(e, 'jobspec')}
              onDrop={(e) => handleDrop(e, 'jobspec')}
              className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer
              ${dragActiveJobSpec ? "border-primary bg-primary/10" : "border-border"}
              bg-card hover:bg-muted/50 transition-colors`}
            >
              <div className="flex flex-col items-center justify-center text-center p-4">
                 <UploadCloud className={`h-10 w-10 mb-3 ${dragActiveJobSpec ? "text-primary" : "text-muted-foreground"}`} />
                <p className="font-semibold">Upload Job Specification</p>
                 <Button variant="outline" size="sm" className="pointer-events-none mt-2">Upload & Extract</Button>
              </div>
              <Input
                id="jobspec-upload-input"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,text/plain"
                onChange={handleJobSpecFileChange}
              />
            </label>
            <div className="flex items-center gap-4 my-3">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="text-muted-foreground text-sm">or</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>
            <Button variant="secondary" className="w-full bg-green-100 text-green-800 hover:bg-green-200">
              Fill Manual Form
            </Button>
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
              <Users/> Parsed Resumes ({parsedResume ? 1 : 0})
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
    </div>
  );
}
