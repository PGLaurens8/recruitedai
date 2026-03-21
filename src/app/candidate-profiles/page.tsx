
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UserCheck, Sparkles, Save, AlertTriangle } from "lucide-react";
import { postJson } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const screeningQuestions = [
  "Can you tell me about your background and experience?",
  "What are your key strengths and how do they align with this type of role?",
  "What are you looking for in your next role?",
  "What are your salary expectations?",
  "When would you be available to start?",
  "Do you have any questions for me?",
];

export default function CandidateProfilesPage() {
  const [notes, setNotes] = useState<Record<string, string>>(screeningQuestions.reduce((acc, q) => ({ ...acc, [q]: '' }), {}));
  const [candidateName, setCandidateName] = useState('');
  const [candidateRole, setCandidateRole] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleNoteChange = (question: string, value: string) => {
    setNotes(prev => ({ ...prev, [question]: value }));
  };

  const handleGenerateSummary = async () => {
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
      const result = await postJson<{ profileSummary: string }>("/api/ai/generate-candidate-profile", {
        candidateName,
        candidateRole,
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Candidate Screening & Profiles</h1>
        <p className="mt-1 text-muted-foreground">
          Use these standardized questions to screen candidates and generate a profile summary with AI.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Screening Details</CardTitle>
          <CardDescription>Enter the candidate's basic information and use the questions below as a guide for your screening call.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="candidate-name">Candidate Name</Label>
              <Input id="candidate-name" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="e.g., Jane Doe" />
            </div>
             <div className="space-y-2">
              <Label htmlFor="candidate-role">Target Role</Label>
              <Input id="candidate-role" value={candidateRole} onChange={(e) => setCandidateRole(e.target.value)} placeholder="e.g., Senior Software Engineer" />
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            {screeningQuestions.map((question, index) => (
              <div key={index} className="space-y-2">
                <Label htmlFor={`question-${index}`}>{question}</Label>
                <Textarea
                  id={`question-${index}`}
                  value={notes[question] || ''}
                  onChange={(e) => handleNoteChange(question, e.target.value)}
                  placeholder="Recruiter's notes..."
                  className="min-h-[100px]"
                />
              </div>
            ))}
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
              placeholder="Click 'Generate Summary' or write your own..."
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
