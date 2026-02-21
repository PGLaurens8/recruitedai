
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  FileSearch, 
  Sparkles, 
  User, 
  UserCircle, 
  CheckCircle2, 
  AlertTriangle, 
  MessageSquare,
  BarChart,
  Save
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { analyzeInterview, type AnalyzeInterviewOutput } from "@/ai/flows/analyze-interview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function InterviewAnalysisPage() {
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeInterviewOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!transcript.trim()) {
      toast({
        variant: "destructive",
        title: "Input Required",
        description: "Please paste an interview transcript to analyze.",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await analyzeInterview({ transcript });
      setAnalysis(result);
      toast({
        title: "Analysis Complete!",
        description: "Structured data has been extracted from the transcript.",
      });
    } catch (e: any) {
      setError(e.message || "An error occurred during analysis.");
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: e.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Interview Transcript Analysis</h1>
        <p className="mt-1 text-muted-foreground">
          Paste an interview transcript to automatically extract recruitment data and assess candidate fit.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Interview Transcript
            </CardTitle>
            <CardDescription>
              Provide the conversation text between the recruiter and candidate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transcript">Paste Transcript Text</Label>
              <Textarea
                id="transcript"
                placeholder="Interviewer: Welcome Jane. Can you tell me about your background?
Candidate: Sure, I have 5 years experience in..."
                className="min-h-[400px] font-mono text-sm"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
            </div>
            <Button onClick={handleAnalyze} disabled={isLoading} className="w-full">
              {isLoading ? <Spinner size={16} className="mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Analyze Transcript
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {isLoading && (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <Spinner size={48} className="text-primary mb-4" />
              <CardTitle>Analyzing Conversation...</CardTitle>
              <p className="text-muted-foreground mt-2">Identifying speakers and extracting recruitment answers.</p>
            </Card>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {analysis && (
            <>
              <Card className="border-primary bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <BarChart className="h-5 w-5" />
                    Overall AI Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 bg-background p-2 rounded-md border shadow-sm">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Candidate: {analysis.candidateName || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-background p-2 rounded-md border shadow-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Interviewer: {analysis.interviewerName || 'Unknown'}</span>
                    </div>
                  </div>
                  <Separator />
                  <p className="text-sm leading-relaxed text-foreground/80 font-medium italic">
                    "{analysis.overallAssessment}"
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Extracted Recruitment Questions</CardTitle>
                  <CardDescription>Structured answers found in the conversation.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {analysis.questionsAnswers.map((qa, index) => (
                    <div key={index} className="space-y-2 group">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold">{qa.question}</h4>
                          <p className={cn(
                            "text-sm mt-1",
                            qa.answer === "Not discussed" ? "text-muted-foreground italic" : "text-foreground/80"
                          )}>
                            {qa.answer}
                          </p>
                        </div>
                        {qa.answer !== "Not discussed" && (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                      {index < analysis.questionsAnswers.length - 1 && <Separator className="opacity-50" />}
                    </div>
                  ))}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" disabled>
                    <Save className="h-4 w-4 mr-2" />
                    Save to Candidate Profile (Coming Soon)
                  </Button>
                </CardFooter>
              </Card>
            </>
          )}

          {!analysis && !isLoading && (
            <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <FileSearch className="h-12 w-12 mb-4 opacity-20" />
              <p>Results will appear here after analysis.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
