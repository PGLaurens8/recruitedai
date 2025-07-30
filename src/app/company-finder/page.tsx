
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Star, UploadCloud, Building, ExternalLink, AlertTriangle, Search, Briefcase, MapPin } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { fileToDataURI } from "@/lib/file-utils";
import { findCompanies, type FindCompaniesOutput } from "@/ai/flows/find-companies";
import { findSmartLeads, type FindSmartLeadsInput, type FindSmartLeadsOutput, type Lead } from "@/ai/flows/find-smart-leads";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


const howItWorksSteps = [
    { number: 1, text: "Upload candidate resume or enter skills manually" },
    { number: 2, text: "AI analyzes skills, experience, and preferences" },
    { number: 3, text: "Get matched with companies actively hiring" },
    { number: 4, text: "Access HR contact information directly" }
];

export default function CompanyFinderPage() {
    const { toast } = useToast();

    // State for Company Finder tab
    const [candidateName, setCandidateName] = useState("");
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [keySkills, setKeySkills] = useState("");
    const [isLoadingFinder, setIsLoadingFinder] = useState(false);
    const [finderError, setFinderError] = useState<string | null>(null);
    const [finderOutput, setFinderOutput] = useState<FindCompaniesOutput | null>(null);
    const [dragActive, setDragActive] = useState(false);
    
    // State for Smart Leads tab
    const [isLoadingLeads, setIsLoadingLeads] = useState(false);
    const [leadsError, setLeadsError] = useState<string | null>(null);
    const [leadsOutput, setLeadsOutput] = useState<FindSmartLeadsOutput | null>(null);
    const [leadsInput, setLeadsInput] = useState<FindSmartLeadsInput>({
        industry: "",
        companySize: "",
        location: "",
        targetRole: "",
        companyName: "",
    });

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

        setIsLoadingFinder(true);
        setFinderError(null);
        setFinderOutput(null);

        try {
            const resumeDataUri = resumeFile ? await fileToDataURI(resumeFile) : undefined;
            const result = await findCompanies({
                resumeDataUri,
                keySkills: keySkills.trim() || undefined,
            });
            setFinderOutput(result);
            toast({
                title: "Companies Found!",
                description: "The AI has generated a list of potential employers.",
            });
        } catch (e: any) {
            console.error("Error finding companies:", e);
            setFinderError(e.message || "An unexpected error occurred.");
            toast({
                variant: "destructive",
                title: "Error",
                description: e.message || "Could not find companies. Please try again.",
            });
        } finally {
            setIsLoadingFinder(false);
        }
    };

    const handleLeadsInputChange = (field: keyof FindSmartLeadsInput, value: string) => {
        setLeadsInput(prev => ({ ...prev, [field]: value }));
    };

    const handleFindLeads = async () => {
        if (!leadsInput.industry && !leadsInput.companySize && !leadsInput.location && !leadsInput.targetRole && !leadsInput.companyName) {
            toast({
                variant: "destructive",
                title: "Input Required",
                description: "Please provide at least one filter criterion (e.g., industry, location, or role)."
            });
            return;
        }
        setIsLoadingLeads(true);
        setLeadsError(null);
        setLeadsOutput(null);
        try {
            const result = await findSmartLeads(leadsInput);
            setLeadsOutput(result);
            toast({
                title: "Leads Generated!",
                description: "The AI has found potential leads based on your criteria."
            });
        } catch (e: any) {
            console.error("Error finding smart leads:", e);
            setLeadsError(e.message || "An unexpected error occurred.");
            toast({
                variant: "destructive",
                title: "Error",
                description: e.message || "Could not find leads. Please try again."
            });
        } finally {
            setIsLoadingLeads(false);
        }
    };

    const exportToCsv = (leads: Lead[]) => {
        const headers = ["Full Name", "Title", "Email", "LinkedIn", "Company", "Industry", "Company Size"];
        const csvRows = [
            headers.join(','),
            ...leads.map(lead => [
                `"${lead.fullName}"`,
                `"${lead.title}"`,
                `"${lead.email}"`,
                `"${lead.linkedinUrl}"`,
                `"${lead.companyName}"`,
                `"${lead.industry}"`,
                `"${lead.companySize}"`
            ].join(','))
        ];
        
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'smart_leads.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Company & Lead Finder</h1>
                <p className="mt-1 text-muted-foreground">
                    AI-powered discovery for companies and key decision-makers.
                </p>
            </div>

            <Tabs defaultValue="company-finder" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="company-finder">Company Finder</TabsTrigger>
                    <TabsTrigger value="smart-leads">Smart Leads</TabsTrigger>
                </TabsList>
                <TabsContent value="company-finder" className="mt-6">
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

                                <Button onClick={handleFindCompanies} disabled={isLoadingFinder} size="lg" className="w-full">
                                    {isLoadingFinder ? <Spinner className="mr-2" /> : <Star className="mr-2" />}
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
                     {isLoadingFinder && (
                        <div className="mt-8 flex justify-center items-center">
                            <Spinner size={48} className="text-primary" />
                            <p className="ml-4 text-lg text-muted-foreground">AI is searching for companies...</p>
                        </div>
                    )}
                    {finderError && (
                        <Alert variant="destructive" className="mt-8">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{finderError}</AlertDescription>
                        </Alert>
                    )}
                    {finderOutput && finderOutput.companies && (
                        <div className="mt-8">
                            <h2 className="text-2xl font-bold mb-4">Potential Company Matches</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {finderOutput.companies.map((company, index) => (
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
                </TabsContent>
                <TabsContent value="smart-leads" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Smart Leads Search</CardTitle>
                            <CardDescription>Find decision-makers using targeted filters. The AI will generate a list of potential contacts.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="companyName">Company</Label>
                                    <Input id="companyName" placeholder="e.g., Google" value={leadsInput.companyName} onChange={(e) => handleLeadsInputChange('companyName', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="industry">Industry</Label>
                                    <Input id="industry" placeholder="e.g., Fintech, Healthcare" value={leadsInput.industry} onChange={(e) => handleLeadsInputChange('industry', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="company-size">Company Size</Label>
                                    <Select value={leadsInput.companySize} onValueChange={(value) => handleLeadsInputChange('companySize', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Any Size" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1-50">1-50</SelectItem>
                                            <SelectItem value="51-200">51-200</SelectItem>
                                            <SelectItem value="201-1000">201-1000</SelectItem>
                                            <SelectItem value="1000+">1000+</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location">Location</Label>
                                    <Input id="location" placeholder="e.g., San Francisco Bay Area" value={leadsInput.location} onChange={(e) => handleLeadsInputChange('location', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="target-role">Target Role/Title</Label>
                                    <Input id="target-role" placeholder="e.g., VP of Engineering" value={leadsInput.targetRole} onChange={(e) => handleLeadsInputChange('targetRole', e.target.value)} />
                                </div>
                            </div>
                            <Button onClick={handleFindLeads} disabled={isLoadingLeads} size="lg" className="w-full">
                                {isLoadingLeads ? <Spinner className="mr-2" /> : <Search className="mr-2" />}
                                Find Leads
                            </Button>
                        </CardContent>
                    </Card>

                    {isLoadingLeads && (
                        <div className="mt-8 flex justify-center items-center">
                            <Spinner size={48} className="text-primary" />
                            <p className="ml-4 text-lg text-muted-foreground">AI is sourcing leads...</p>
                        </div>
                    )}
                    {leadsError && (
                        <Alert variant="destructive" className="mt-8">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{leadsError}</AlertDescription>
                        </Alert>
                    )}
                    {leadsOutput && leadsOutput.leads && (
                        <Card className="mt-8">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>Generated Leads ({leadsOutput.leads.length})</CardTitle>
                                    <Button variant="outline" onClick={() => exportToCsv(leadsOutput.leads)}>
                                        Export to CSV
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Company</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>LinkedIn</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {leadsOutput.leads.map((lead, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <div className="font-medium">{lead.fullName}</div>
                                                    <div className="text-sm text-muted-foreground">{lead.title}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{lead.companyName}</div>
                                                    <div className="text-sm text-muted-foreground">{lead.industry} ({lead.companySize} employees)</div>
                                                </TableCell>
                                                <TableCell>{lead.email}</TableCell>
                                                <TableCell>
                                                    <Button asChild variant="ghost" size="sm">
                                                        <Link href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer">
                                                            View Profile <ExternalLink className="ml-2 h-3 w-3" />
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
