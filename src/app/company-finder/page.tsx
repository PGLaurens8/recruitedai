
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Star, UploadCloud, Building, ExternalLink, AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { fileToDataURI } from "@/lib/file-utils";
import { findCompanies, type FindCompaniesOutput } from "@/ai/flows/find-companies";

const howItWorksSteps = [
    { number: 1, text: "Upload candidate resume or enter skills manually" },
    { number: 2, text: "AI analyzes skills, experience, and preferences" },
    { number: 3, text: "Get matched with companies actively hiring" },
    { number: 4, text: "Access HR contact information directly" }
];


export default function CompanyFinderPage() {
    const [candidateName, setCandidateName] = useState("");
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [keySkills, setKeySkills] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiOutput, setAiOutput] = useState<FindCompaniesOutput | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const { toast } = useToast();

    const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement | HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement | HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setResumeFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setResumeFile(e.target.files[0]);
        }
    };

    const handleFindCompanies = async () => {
        if (!resumeFile && !keySkills.trim()) {
            toast({
                variant: "destructive",
                title: "Input Required",
                description: "Please upload a resume or enter some key skills.",
            });
            return;
        }

        setIsLoading(true);
        setError(null);
        setAiOutput(null);

        try {
            const resumeDataUri = resumeFile ? await fileToDataURI(resumeFile) : undefined;
            const result = await findCompanies({
                resumeDataUri,
                keySkills: keySkills.trim() || undefined,
            });
            setAiOutput(result);
            toast({
                title: "Companies Found!",
                description: "The AI has generated a list of potential employers.",
            });
        } catch (e: any) {
            console.error("Error finding companies:", e);
            setError(e.message || "An unexpected error occurred.");
            toast({
                variant: "destructive",
                title: "Error",
                description: e.message || "Could not find companies. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Company Finder</h1>
                <p className="mt-1 text-muted-foreground">
                    AI-powered company discovery based on candidate resumes and skills.
                </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 items-start">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Star className="text-primary"/>Find Companies Hiring for Your Candidate</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="candidate-name">Candidate Name</Label>
                            <Input
                                id="candidate-name"
                                placeholder="Enter candidate name"
                                value={candidateName}
                                onChange={(e) => setCandidateName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="resume-upload">Upload Resume</Label>
                            <label
                                htmlFor="resume-upload-input"
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer
                                ${dragActive ? "border-primary bg-primary/10" : "border-border hover:border-gray-300"}
                                bg-card hover:bg-muted/50 transition-colors`}
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadCloud className={`h-8 w-8 mb-2 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />
                                    <p className={`text-sm ${dragActive ? "text-primary" : "text-muted-foreground"}`}>
                                        <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className={`text-xs ${dragActive ? "text-primary" : "text-muted-foreground"}`}>
                                        PDF, DOC, DOCX up to 10MB
                                    </p>
                                </div>
                                <Input
                                    id="resume-upload-input"
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    onChange={handleFileChange}
                                />
                            </label>
                             {resumeFile && <p className="mt-2 text-sm text-muted-foreground">Selected: {resumeFile.name}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="key-skills">Key Skills (Optional)</Label>
                            <Textarea
                                id="key-skills"
                                placeholder="Enter skills manually if no resume is available, e.g., 'React, TypeScript, Node.js'"
                                value={keySkills}
                                onChange={(e) => setKeySkills(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>

                        <Button onClick={handleFindCompanies} disabled={isLoading} size="lg" className="w-full">
                            {isLoading ? <Spinner className="mr-2" /> : <Star className="mr-2" />}
                            Find Matching Companies
                        </Button>
                    </CardContent>
                </Card>
                <div className="bg-muted/50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">How It Works</h3>
                    <ul className="space-y-4">
                        {howItWorksSteps.map((step) => (
                             <li key={step.number} className="flex items-start gap-3">
                                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                                    {step.number}
                                </div>
                                <span className="text-muted-foreground text-sm">{step.text}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {isLoading && (
                <div className="mt-8 flex justify-center items-center">
                <Spinner size={48} className="text-primary" />
                <p className="ml-4 text-lg text-muted-foreground">AI is searching for companies...</p>
                </div>
            )}

            {error && (
                <Alert variant="destructive" className="mt-8">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {aiOutput && aiOutput.companies && (
                <div className="mt-8">
                    <h2 className="text-2xl font-bold mb-4">Potential Company Matches</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {aiOutput.companies.map((company, index) => (
                            <Card key={index}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Building className="text-primary"/>{company.companyName}</CardTitle>
                                    <CardDescription>{company.sampleJobTitle}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">{company.reasonForMatch}</p>
                                    <Button asChild variant="outline" className="w-full">
                                        <Link href={company.website} target="_blank" rel="noopener noreferrer">
                                            Visit Website <ExternalLink className="ml-2 h-4 w-4"/>
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
