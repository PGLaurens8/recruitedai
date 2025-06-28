
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { generateCandidateProfile } from '@/ai/flows/generate-candidate-profile';
import { cn } from '@/lib/utils';
import { ArrowLeft, Upload, User, Mail, Briefcase, Sparkles, Save, Star, Percent, AlertTriangle } from 'lucide-react';

const initialCandidates = [
  {
    id: "C001",
    name: "Elena Rodriguez",
    email: "elena.r@example.com",
    avatar: "https://placehold.co/40x40.png",
    status: "Sourced",
    aiScore: 92,
    currentJob: "Senior UX Designer",
    company: "Innovate Inc.",
    appliedFor: "Lead Product Designer",
  },
  {
    id: "C002",
    name: "Marcus Chen",
    email: "marcus.c@example.com",
    avatar: "https://placehold.co/40x40.png",
    status: "Applied",
    aiScore: 88,
    currentJob: "Data Scientist",
    company: "DataDriven Co.",
    appliedFor: "Senior Data Scientist",
  },
  {
    id: "C003",
    name: "Aisha Khan",
    email: "aisha.k@example.com",
    avatar: "https://placehold.co/40x40.png",
    status: "Interviewing",
    aiScore: 95,
    currentJob: "Backend Engineer",
    company: "CloudNet",
    appliedFor: "Senior Backend Engineer",
  },
  {
    id: "C004",
    name: "David Miller",
    email: "david.m@example.com",
    avatar: "https://placehold.co/40x40.png",
    status: "Offer",
    aiScore: 85,
    currentJob: "Marketing Manager",
    company: "GrowthLeap",
    appliedFor: "Head of Marketing",
  },
  {
    id: "C005",
    name: "Sophia Loren",
    email: "sophia.l@example.com",
    avatar: "https://placehold.co/40x40.png",
    status: "Hired",
    aiScore: 91,
    currentJob: "DevOps Engineer",
    company: "SecureStack",
    appliedFor: "DevOps Lead",
  },
  {
    id: "C006",
    name: "James Smith",
    email: "james.s@example.com",
    avatar: "https://placehold.co/40x40.png",
    status: "Applied",
    aiScore: 78,
    currentJob: "Frontend Developer",
    company: "WebWeavers",
    appliedFor: "Senior Frontend Developer",
  },
];
type Candidate = typeof initialCandidates[0];

const screeningQuestions = [
  "Can you tell me about your background and experience?",
  "What are your key strengths and how do they align with this type of role?",
  "What are you looking for in your next role?",
  "What are your salary expectations?",
  "When would you be available to start?",
  "Do you have any questions for me?",
];


export default function CandidateDetailPage() {
    const params = useParams();
    const router = useRouter();
    const candidateId = params.id as string;
    const { toast } = useToast();

    const [candidate, setCandidate] = useState<Candidate | null>(null);
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [scores, setScores] = useState<Record<string, number | null>>({});
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const foundCandidate = initialCandidates.find(c => c.id === candidateId);
        setCandidate(foundCandidate || null);
        
        // Initialize state for questions
        const initialNotes = screeningQuestions.reduce((acc, q) => ({ ...acc, [q]: '' }), {});
        const initialScores = screeningQuestions.reduce((acc, q) => ({ ...acc, [q]: null }), {});
        setNotes(initialNotes);
        setScores(initialScores);
    }, [candidateId]);
    
    const { completionPercentage, averageScore } = useMemo(() => {
        const answeredNotes = Object.values(notes).filter(note => note.trim() !== '');
        const completion = (answeredNotes.length / screeningQuestions.length) * 100;

        const validScores = Object.values(scores).filter((score): score is number => score !== null);
        const avg = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
        
        return { completionPercentage: completion, averageScore: avg };
    }, [notes, scores]);


    const handleNoteChange = (question: string, value: string) => {
        setNotes(prev => ({ ...prev, [question]: value }));
    };

    const handleScoreChange = (question: string, value: string) => {
        setScores(prev => ({ ...prev, [question]: value ? parseInt(value) : null }));
    };

    const handleGenerateSummary = async () => {
        if (!candidate) return;

        const allNotes = Object.entries(notes)
          .filter(([, note]) => note.trim() !== '')
          .map(([question, note]) => `Question: ${question}\nAnswer/Notes: ${note}`)
          .join('\n\n');

        if (!allNotes) {
          toast({
            variant: "destructive",
            title: "No notes provided",
            description: "Please enter some notes before generating a summary.",
          });
          return;
        }

        setIsLoading(true);
        setError(null);

        try {
          const result = await generateCandidateProfile({
            candidateName: candidate.name,
            candidateRole: candidate.appliedFor,
            interviewNotes: allNotes,
          });
          setSummary(result.profileSummary);
          toast({
            title: "AI Summary Generated!",
            description: "A candidate profile summary has been created.",
          });
        } catch (e: any) {
          setError(e.message || "An unexpected error occurred.");
          toast({
            variant: "destructive",
            title: "Error",
            description: e.message,
          });
        } finally {
          setIsLoading(false);
        }
    };

    if (!candidate) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
                <Spinner size={32} />
                <p className="mt-4 text-muted-foreground">Loading candidate profile...</p>
                 <Button variant="outline" onClick={() => router.push('/candidates')} className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Candidates
                </Button>
            </div>
        );
    }
    
    const progressColor = 
        completionPercentage > 80 ? 'bg-green-500' :
        completionPercentage > 50 ? 'bg-yellow-500' :
        'bg-red-500';

    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <Button variant="outline" size="icon" onClick={() => router.push('/candidates')}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back to candidates</span>
                    </Button>
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={candidate.avatar} data-ai-hint="person portrait"/>
                        <AvatarFallback className="text-2xl">{candidate.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{candidate.name}</h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                           <Mail className="h-4 w-4" /> {candidate.email}
                        </p>
                        <p className="text-muted-foreground flex items-center gap-2">
                           <Briefcase className="h-4 w-4" /> Applying for {candidate.appliedFor}
                        </p>
                    </div>
                </div>
                <Button><Upload className="mr-2 h-4 w-4" /> View/Upload Resume</Button>
            </header>

            <div className="grid md:grid-cols-2 gap-6">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Profile Completion</CardTitle>
                        <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completionPercentage.toFixed(0)}%</div>
                        <p className="text-xs text-muted-foreground">{Object.values(notes).filter(n => n.trim()).length} of {screeningQuestions.length} questions noted</p>
                        <Progress value={completionPercentage} className="mt-2 h-2" indicatorClassName={progressColor} />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Average Interview Score</CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{averageScore.toFixed(1)} / 10</div>
                         <p className="text-xs text-muted-foreground">Based on {Object.values(scores).filter(s => s !== null).length} scored questions</p>
                    </CardContent>
                </Card>
            </div>

             <Card>
                <CardHeader>
                    <CardTitle>Screening Interview Notes</CardTitle>
                    <CardDescription>Use this section to take notes and score the candidate during the initial screening call.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                   {screeningQuestions.map((question, index) => (
                    <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor={`question-${index}`} className="font-semibold">{question}</Label>
                            <div className="flex items-center gap-2 w-40">
                                <Label htmlFor={`score-${index}`} className="text-sm shrink-0">Score</Label>
                                <Select onValueChange={(value) => handleScoreChange(question, value)}>
                                    <SelectTrigger id={`score-${index}`}>
                                        <SelectValue placeholder="N/A" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({length: 10}, (_, i) => i + 1).map(num => (
                                            <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Textarea
                            id={`question-${index}`}
                            value={notes[question] || ''}
                            onChange={(e) => handleNoteChange(question, e.target.value)}
                            placeholder="Recruiter's notes..."
                            className="min-h-[100px]"
                        />
                    </div>
                   ))}
                    <Separator />

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <Label htmlFor="summary" className="text-lg font-semibold">AI Generated Profile Summary</Label>
                            <Button onClick={handleGenerateSummary} disabled={isLoading} variant="outline" size="sm">
                                {isLoading ? <Spinner size={16} className="mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Generate Summary
                            </Button>
                        </div>
                        <Textarea
                            id="summary"
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder="Click 'Generate Summary' after filling in notes, or write your own..."
                            className="min-h-[150px] bg-muted/50 border-primary/50"
                        />
                    </div>
                     {error && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
                <CardFooter>
                    <Button disabled>
                        <Save className="mr-2 h-4 w-4" />
                        Save Profile (Coming Soon)
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
