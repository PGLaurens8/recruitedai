
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { postJson } from '@/lib/api-client';
import { ArrowLeft, Upload, Mail, Briefcase, Sparkles, Save, Send, Star, Percent, AlertTriangle, Brain, Clock, GraduationCap, Award, Pencil, Plus, Trash2, ArrowUp, ArrowDown, NotebookPen } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import {
  ApiClientError,
  createSubmission,
  saveCandidateInterview,
  useCandidate,
  useCurrentProfile,
  useJobs,
  useSubmissions,
} from '@/lib/data/hooks';
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SUBMISSION_STATUS_BADGE_CLASS, SUBMISSION_STATUS_LABEL } from '@/lib/submissions-ui';
import {
  GENERAL_NOTES_KEY,
  QUESTIONS_KEY,
  parseScreeningQuestions,
} from '@/lib/screening-questions';

export default function CandidateDetailPage() {
    const params = useParams();
    const router = useRouter();
    const candidateId = typeof params?.id === "string" ? params.id : "";
    const { toast } = useToast();
    const { user } = useAuth();

    const { data: profile } = useCurrentProfile(user);
    const companyId = profile?.companyId;
    const { data: candidate, isLoading: isCandLoading, error: candError } = useCandidate(companyId, candidateId);
    const { data: jobs } = useJobs(companyId);
    const [submissionRefresh, setSubmissionRefresh] = useState(0);
    const { data: submissions, isLoading: isSubsLoading } = useSubmissions(
      companyId,
      candidateId ? { candidateId } : undefined,
      submissionRefresh,
    );

    const [notes, setNotes] = useState<Record<string, string>>({});
    const [scores, setScores] = useState<Record<string, number | null>>({});
    const [summary, setSummary] = useState('');
    const [questions, setQuestions] = useState<string[]>(() => parseScreeningQuestions(null));
    const [generalNotes, setGeneralNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Edit-questions dialog state. `draftQuestions` is the working copy edited
    // inside the dialog; it's only committed to `questions` on Save.
    const [editQuestionsOpen, setEditQuestionsOpen] = useState(false);
    const [draftQuestions, setDraftQuestions] = useState<string[]>([]);
    const [newQuestion, setNewQuestion] = useState('');

    const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
    const [submitJobId, setSubmitJobId] = useState('');
    const [submitNotes, setSubmitNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const activeJobs = useMemo(
      () => (jobs || []).filter((job) => String(job.status).toLowerCase() === 'active'),
      [jobs],
    );

    const openSubmitDialog = () => {
      setSubmitJobId('');
      setSubmitNotes('');
      setSubmitDialogOpen(true);
    };

    const handleSubmitCandidate = async () => {
      if (!companyId || !candidateId || !submitJobId) {
        return;
      }
      const job = activeJobs.find((item) => item.id === submitJobId);
      setIsSubmitting(true);
      try {
        await createSubmission({
          companyId,
          candidateId,
          jobId: submitJobId,
          notes: submitNotes.trim() || undefined,
        });
        toast({
          title: 'Candidate submitted',
          description: `Candidate submitted to ${job?.title || 'vacancy'}.`,
        });
        setSubmitDialogOpen(false);
        setSubmissionRefresh((prev) => prev + 1);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Could not submit candidate.';
        toast({ variant: 'destructive', title: 'Submission failed', description: message });
      } finally {
        setIsSubmitting(false);
      }
    };

    useEffect(() => {
        if (candidate) {
            const interviewNotes = candidate.interviewNotes || {};
            setNotes(interviewNotes);
            setScores(candidate.interviewScores || {});
            setSummary(candidate.aiSummary || '');
            setQuestions(parseScreeningQuestions(interviewNotes));
            setGeneralNotes(interviewNotes[GENERAL_NOTES_KEY] || '');
        }
    }, [candidate]);
    
    const { completionPercentage, averageScore, answeredCount, hasNotes, hasScores } = useMemo(() => {
        // Count only answered questions in the active question set — ignore the
        // reserved meta keys (__questions, __general_notes) and any stale answers
        // left behind by removed questions.
        const answered = questions.filter(q => notes[q] && notes[q].trim() !== '');
        const completion = questions.length > 0 ? (answered.length / questions.length) * 100 : 0;

        const validScores = questions
            .map(q => scores[q])
            .filter((score): score is number => score != null);
        const avg = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;

        return {
            completionPercentage: completion,
            averageScore: avg,
            answeredCount: answered.length,
            hasNotes: answered.length > 0,
            hasScores: validScores.length > 0,
        };
    }, [notes, scores, questions]);

    const hasAnyScreening = hasNotes || generalNotes.trim() !== '';

    const handleNoteChange = (question: string, value: string) => {
        setNotes(prev => ({ ...prev, [question]: value }));
    };

    const openEditQuestions = () => {
        setDraftQuestions([...questions]);
        setNewQuestion('');
        setEditQuestionsOpen(true);
    };

    const addDraftQuestion = () => {
        const trimmed = newQuestion.trim();
        if (!trimmed) return;
        setDraftQuestions(prev => [...prev, trimmed]);
        setNewQuestion('');
    };

    const removeDraftQuestion = (index: number) => {
        setDraftQuestions(prev => prev.filter((_, i) => i !== index));
    };

    const moveDraftQuestion = (index: number, direction: -1 | 1) => {
        setDraftQuestions(prev => {
            const target = index + direction;
            if (target < 0 || target >= prev.length) return prev;
            const next = [...prev];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    };

    const saveQuestions = () => {
        setQuestions(draftQuestions);
        setEditQuestionsOpen(false);
    };

    const handleScoreChange = (question: string, value: string) => {
        setScores(prev => ({ ...prev, [question]: value ? parseInt(value) : null }));
    };

    const startScreeningSession = () => {
        const section = document.getElementById('screening-notes');
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const firstQuestion = document.getElementById('question-0') as HTMLTextAreaElement | null;
        firstQuestion?.focus({ preventScroll: true });
    };

    const handleGenerateSummary = async () => {
        if (!candidate) return;

        const allNotes = Object.entries(notes)
          .filter(([, note]) => note && note.trim() !== '')
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
          const result = await postJson<{ profileSummary: string }>("/api/ai/generate-candidate-profile", {
            candidateName: candidate.name,
            candidateRole: candidate.currentJob,
            interviewNotes: allNotes,
          });
          setSummary(result.profileSummary);
          toast({
            title: "AI Summary Generated!",
            description: "A candidate profile summary has been created.",
          });
        } catch (e: any) {
          setError(e.message || "An unexpected error occurred.");
          toast({ variant: "destructive", title: "Error", description: e.message });
        } finally {
          setIsLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!companyId || !candidateId) return;
        setIsSaving(true);
        try {
          // Persist only the answers for the active questions, plus the reserved
          // meta keys. Stale answers from removed questions are dropped. Question
          // list is JSON-encoded because the JSONB column is typed string→string.
          const notesToSave: Record<string, string> = {};
          questions.forEach(q => {
            const value = notes[q];
            if (value && value.trim() !== '') {
              notesToSave[q] = value;
            }
          });
          notesToSave[QUESTIONS_KEY] = JSON.stringify(questions);
          const trimmedGeneral = generalNotes.trim();
          if (trimmedGeneral) {
            notesToSave[GENERAL_NOTES_KEY] = trimmedGeneral;
          }

          await saveCandidateInterview(companyId, candidateId, {
            interviewNotes: notesToSave,
            interviewScores: scores,
            aiSummary: summary,
          });
          toast({ title: "Profile Saved", description: "Interview notes and AI summary have been persisted." });
        } catch (e: any) {
          toast({ variant: "destructive", title: "Save failed", description: e.message || "Could not save candidate profile." });
        } finally {
          setIsSaving(false);
        }
    };

    if (isCandLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
                <Spinner size={32} />
                <p className="mt-4 text-muted-foreground">Loading candidate profile...</p>
            </div>
        );
    }

    // Distinguish a genuine 404 (candidate really doesn't exist) from any other
    // failure (network error, 500, permission). Only an explicit 404 should read
    // as "Not Found"; everything else is a load failure the user can retry.
    if (candError) {
        const isNotFound = candError instanceof ApiClientError && candError.status === 404;
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <p className="text-lg font-bold">{isNotFound ? "Candidate Not Found" : "Something went wrong"}</p>
                <p className="mt-1 text-muted-foreground">
                    {isNotFound
                        ? "This candidate does not exist or has been removed."
                        : "Something went wrong loading this candidate. Please try again."}
                </p>
                <div className="mt-4 flex items-center gap-2">
                    {!isNotFound && (
                        <Button onClick={() => window.location.reload()}>Try Again</Button>
                    )}
                    <Button variant="outline" onClick={() => router.push('/candidates')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Candidates
                    </Button>
                </div>
            </div>
        );
    }

    if (!candidate) {
        // Dependencies (e.g. the resolved companyId) aren't ready yet and no error
        // was raised — keep showing the loading state rather than a false "Not Found".
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
                <Spinner size={32} />
                <p className="mt-4 text-muted-foreground">Loading candidate profile...</p>
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
                        <AvatarFallback className="text-2xl">{candidate.name?.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{candidate.name}</h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                           <Mail className="h-4 w-4" /> {candidate.email}
                        </p>
                        <p className="text-muted-foreground flex items-center gap-2">
                           <Briefcase className="h-4 w-4" /> {candidate.currentJob || "Role not set"}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={openSubmitDialog}>
                        <Send className="mr-2 h-4 w-4" /> Submit to Vacancy
                    </Button>
                    <Button><Upload className="mr-2 h-4 w-4" /> View/Upload Resume</Button>
                </div>
            </header>

            <Breadcrumb items={[{ label: "Talent Pool", href: "/candidates" }, { label: candidate.name }]} />

            <div className="grid md:grid-cols-2 gap-6">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Profile Completion</CardTitle>
                        <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {hasNotes ? (
                            <>
                                <div className="text-2xl font-bold">{completionPercentage.toFixed(0)}%</div>
                                <p className="text-xs text-muted-foreground">{answeredCount} of {questions.length} questions noted</p>
                                <Progress value={completionPercentage} className="mt-2 h-2" indicatorClassName={progressColor} />
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">Screening not yet started</p>
                                <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-primary" onClick={startScreeningSession}>
                                    Start screening session →
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Average Interview Score</CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {hasScores ? (
                            <>
                                <div className="text-2xl font-bold">{averageScore.toFixed(1)} / 10</div>
                                <p className="text-xs text-muted-foreground">Based on {Object.values(scores).filter(s => s !== null).length} scored questions</p>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">No scores recorded yet</p>
                                <p className="mt-1 text-xs text-muted-foreground">Scores appear after completing a screening session</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /> Profile Intelligence</CardTitle>
                    <CardDescription>Enriched data extracted from the candidate's CV.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-wrap items-center gap-4">
                        {candidate.yearsOfExperience != null && (
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{candidate.yearsOfExperience} years of experience</span>
                            </div>
                        )}
                        {candidate.hasDegreeLevelEducation != null && (
                            candidate.hasDegreeLevelEducation ? (
                                <Badge variant="outline" className="border-green-600/40 bg-green-500/10 text-green-700 dark:text-green-400">Degree Qualified</Badge>
                            ) : (
                                <Badge variant="outline" className="border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">Skills-Based Profile</Badge>
                            )
                        )}
                    </div>

                    {candidate.skills && candidate.skills.length > 0 && (
                        <div>
                            <h4 className="mb-2 text-sm font-semibold">Skills</h4>
                            <div className="flex flex-wrap gap-2">
                                {candidate.skills.map((skill, index) => (
                                    <Badge key={`${skill}-${index}`} variant="secondary" className="bg-blue-50 text-blue-700 border border-blue-200">{skill}</Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {candidate.education && candidate.education.length > 0 && (
                        <div>
                            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold"><GraduationCap className="h-4 w-4 text-muted-foreground" /> Education</h4>
                            <ul className="space-y-1">
                                {candidate.education.map((entry, index) => (
                                    <li key={index} className="text-sm text-muted-foreground">
                                        {entry.degree} — {entry.institution}{entry.year ? ` (${entry.year})` : ""}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {candidate.certifications && candidate.certifications.length > 0 && (
                        <div>
                            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Award className="h-4 w-4 text-muted-foreground" /> Certifications</h4>
                            <ul className="space-y-1">
                                {candidate.certifications.map((cert, index) => (
                                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Award className="h-4 w-4 shrink-0 text-amber-500" />
                                        {cert}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {candidate.yearsOfExperience == null
                        && candidate.hasDegreeLevelEducation == null
                        && !(candidate.skills && candidate.skills.length > 0)
                        && !(candidate.education && candidate.education.length > 0)
                        && !(candidate.certifications && candidate.certifications.length > 0) && (
                        <p className="text-sm text-muted-foreground">No enriched profile data available yet. Re-parse this candidate's CV to populate this section.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-primary" /> Submissions</CardTitle>
                    <CardDescription>Vacancies this candidate has been put forward for and their current pipeline status.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isSubsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size={16} /> Loading submissions...</div>
                    ) : !submissions || submissions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No submissions yet. Click <span className="font-medium">Submit to Vacancy</span> above to put this candidate forward.</p>
                    ) : (
                        <ul className="space-y-2">
                            {submissions.map((submission) => (
                                <li key={submission.id} className="flex flex-col gap-1 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <Link href={`/jobs/${submission.jobId}`} className="font-medium hover:underline">
                                            {submission.jobTitle || 'Untitled job'}
                                        </Link>
                                        {submission.clientName && (
                                            <p className="text-xs text-muted-foreground">{submission.clientName}</p>
                                        )}
                                    </div>
                                    <Badge variant="outline" className={SUBMISSION_STATUS_BADGE_CLASS[submission.status]}>
                                        {SUBMISSION_STATUS_LABEL[submission.status]}
                                    </Badge>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

             <Card id="screening-notes">
                <CardHeader>
                    <div className="flex flex-row items-start justify-between gap-2">
                        <div>
                            <CardTitle>Screening Interview Notes</CardTitle>
                            <CardDescription>Optional — capture notes and scores from your screening call. Tailor the questions to this candidate, or just jot a quick general note.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" className="shrink-0" onClick={openEditQuestions}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit Questions
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                   {!hasAnyScreening && (
                       <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center">
                           <NotebookPen className="mx-auto h-6 w-6 text-muted-foreground/60" />
                           <p className="mt-2 text-sm font-medium text-muted-foreground">No screening notes yet</p>
                           <p className="text-xs text-muted-foreground/80">Add notes after your screening call</p>
                       </div>
                   )}
                   {questions.length === 0 ? (
                       <p className="text-sm text-muted-foreground">No screening questions configured. Use <span className="font-medium">Edit Questions</span> to add some, or just use the general notes below.</p>
                   ) : questions.map((question, index) => (
                    <div key={`${question}-${index}`} className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor={`question-${index}`} className="font-semibold">{question}</Label>
                            <div className="flex items-center gap-2 w-40">
                                <Label htmlFor={`score-${index}`} className="text-sm shrink-0">Score</Label>
                                <Select onValueChange={(value) => handleScoreChange(question, value)} value={String(scores[question] || "")}>
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

                    <div className="space-y-2">
                        <Label htmlFor="general-notes" className="font-semibold">General screening notes</Label>
                        <p className="text-xs text-muted-foreground">Unstructured notes from the call — no need to fill in every question above.</p>
                        <Textarea
                            id="general-notes"
                            value={generalNotes}
                            onChange={(e) => setGeneralNotes(e.target.value)}
                            placeholder="Anything else worth recording from the screening call..."
                            className="min-h-[100px]"
                        />
                    </div>

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
                    <Button onClick={handleSaveProfile} disabled={isSaving}>
                        {isSaving ? <Spinner size={16} className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Profile Changes
                    </Button>
                </CardFooter>
            </Card>

            <Dialog open={editQuestionsOpen} onOpenChange={setEditQuestionsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit screening questions</DialogTitle>
                        <DialogDescription>Add, remove, or reorder the questions for this candidate. These are saved with the candidate when you save the profile.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            {draftQuestions.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No questions yet. Add one below or save to use general notes only.</p>
                            ) : draftQuestions.map((question, index) => (
                                <div key={index} className="flex items-start gap-2 rounded-md bg-muted/50 p-2 text-sm">
                                    <span className="flex-1 break-words">{question}</span>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0} onClick={() => moveDraftQuestion(index, -1)}>
                                            <ArrowUp className="h-3 w-3" />
                                            <span className="sr-only">Move up</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === draftQuestions.length - 1} onClick={() => moveDraftQuestion(index, 1)}>
                                            <ArrowDown className="h-3 w-3" />
                                            <span className="sr-only">Move down</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeDraftQuestion(index)}>
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                            <span className="sr-only">Remove question</span>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Add a custom question..."
                                value={newQuestion}
                                onChange={(e) => setNewQuestion(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addDraftQuestion();
                                    }
                                }}
                            />
                            <Button variant="outline" size="icon" onClick={addDraftQuestion}>
                                <Plus className="h-4 w-4" />
                                <span className="sr-only">Add question</span>
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditQuestionsOpen(false)}>Cancel</Button>
                        <Button onClick={saveQuestions}>Save Questions</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Submit candidate to a vacancy</DialogTitle>
                        <DialogDescription>Pick an active vacancy and add any handover notes for the client. The candidate will appear in that job&apos;s pipeline.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="submit-job">Vacancy</Label>
                            <Select value={submitJobId} onValueChange={setSubmitJobId}>
                                <SelectTrigger id="submit-job">
                                    <SelectValue placeholder={activeJobs.length === 0 ? "No active vacancies" : "Select a vacancy..."} />
                                </SelectTrigger>
                                <SelectContent>
                                    {activeJobs.map((job) => (
                                        <SelectItem key={job.id} value={job.id}>
                                            {job.title}{job.clientName || job.company ? ` — ${job.clientName || job.company}` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="submit-notes">Notes for this submission</Label>
                            <Textarea
                                id="submit-notes"
                                value={submitNotes}
                                onChange={(event) => setSubmitNotes(event.target.value)}
                                placeholder="Why is this candidate a good fit? Any handover context for the client..."
                                className="min-h-[120px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSubmitDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button onClick={handleSubmitCandidate} disabled={isSubmitting || !submitJobId}>
                            {isSubmitting ? <Spinner size={16} className="mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                            Submit Candidate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
