"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { postJson } from "@/lib/api-client";
import type { AnalyzeInterviewResponseOutput } from "@/ai/flows/analyze-interview-response";
import { ClipboardCheck, Mic, MicOff, AlertTriangle, Copy, Rocket, Lightbulb, BarChart, ChevronRight } from "lucide-react";
import { useCurrentProfile, useJobs } from "@/lib/data/hooks";

type InterviewJob = {
  id: string;
  title: string;
  company?: string;
  location?: string;
  salary?: string;
  status: string;
};

type InterviewState = "setup" | "generating_questions" | "in_progress" | "analyzing" | "feedback" | "finished";
type Feedback = AnalyzeInterviewResponseOutput & { question: string };

export default function InterviewPrepPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: profile } = useCurrentProfile(user);
  const { data: fetchedJobs } = useJobs(profile?.companyId);
  const jobPostings = fetchedJobs || [];

  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [interviewState, setInterviewState] = useState<InterviewState>("setup");
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedbackLog, setFeedbackLog] = useState<Feedback[]>([]);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionCtor =
      (typeof window !== "undefined" &&
        ((window as Window & { webkitSpeechRecognition?: any }).webkitSpeechRecognition ||
          (window as Window & { SpeechRecognition?: any }).SpeechRecognition)) ||
      null;

    if (!SpeechRecognitionCtor) {
      setError("Speech recognition is not supported in your browser. Please try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript + interimTranscript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.onerror = (event: any) => {
      toast({
        variant: "destructive",
        title: "Speech Recognition Error",
        description: `An error occurred: ${event.error}. Please ensure microphone permissions are enabled.`,
      });
      setIsListening(false);
    }

    recognitionRef.current = recognition;
  }, [toast]);

  const handleStartInterview = async () => {
    if (!selectedJobId) {
      toast({ variant: "destructive", title: "Please select a job first." });
      return;
    }
    
    setInterviewState("generating_questions");
    setError(null);
    setFeedbackLog([]);

    const selectedJob = jobPostings.find((job: InterviewJob) => job.id === selectedJobId);
    if (!selectedJob) {
        setError("Could not find selected job details.");
        setInterviewState("setup");
        return;
    }
    
    try {
        const jobSpecText = `${selectedJob.title}\nCompany: ${selectedJob.company}\nLocation: ${selectedJob.location}\nSalary: ${selectedJob.salary}`;
        const result = await postJson<{ questions: string[] }>("/api/ai/generate-interview-questions", { jobSpecText });
        setQuestions(result.questions);
        setCurrentQuestionIndex(0);
        setInterviewState("in_progress");
    } catch(e: any) {
        setError(e.message || "Failed to generate interview questions.");
        setInterviewState("setup");
    }
  };
  
  const handleToggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript("");
      recognitionRef.current?.start();
    }
    setIsListening(!isListening);
  };
  
  const handleSubmitAnswer = async () => {
    if (!transcript.trim()) {
        toast({ variant: "destructive", title: "Please provide an answer." });
        return;
    }
    
    setIsListening(false);
    recognitionRef.current?.stop();
    setInterviewState("analyzing");
    
    try {
        const result = await postJson<AnalyzeInterviewResponseOutput>("/api/ai/analyze-interview-response", {
            question: questions[currentQuestionIndex],
            answer: transcript
        });
        setFeedbackLog(prev => [...prev, { ...result, question: questions[currentQuestionIndex] }]);
        setInterviewState("feedback");
    } catch(e: any) {
        setError(e.message || "Failed to analyze your answer.");
        setInterviewState("in_progress");
    }
    setTranscript("");
  };
  
  const handleNextQuestion = () => {
    if(currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setInterviewState("in_progress");
    } else {
        setInterviewState("finished");
    }
  };

  const handleRestart = () => {
    setSelectedJobId("");
    setInterviewState("setup");
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setFeedbackLog([]);
    setError(null);
    setTranscript("");
  };

  const renderContent = () => {
    if (interviewState === "setup" || interviewState === "generating_questions") {
      return (
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Interview Preparation</CardTitle>
            <CardDescription>Select a job to start a mock interview with our AI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select onValueChange={setSelectedJobId} value={selectedJobId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a job posting..." />
              </SelectTrigger>
              <SelectContent>
                {jobPostings.filter((j: InterviewJob) => j.status === 'active').map((job: InterviewJob) => (
                  <SelectItem key={job.id} value={job.id}>{job.title} at {job.company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
          </CardContent>
          <CardFooter className="flex-col sm:flex-row gap-2">
            <Button onClick={handleStartInterview} disabled={!selectedJobId || interviewState === 'generating_questions'} className="w-full sm:w-auto">
              {interviewState === 'generating_questions' ? <Spinner className="mr-2" /> : <Rocket className="mr-2" />}
              Start AI Interview
            </Button>
             {user?.role === 'Recruiter' && (
                <Button variant="outline" disabled className="w-full sm:w-auto">
                    <Copy className="mr-2"/> Copy Link for Candidate (Soon)
                </Button>
             )}
          </CardFooter>
        </Card>
      );
    }
    
    if (interviewState === "in_progress" || interviewState === "analyzing") {
        return (
            <Card className="w-full max-w-3xl mx-auto">
                <CardHeader>
                    <Progress value={(currentQuestionIndex + 1) / questions.length * 100} className="w-full mb-2" />
                    <CardTitle>Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
                    <CardDescription className="text-lg pt-2">{questions[currentQuestionIndex]}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        <textarea
                            value={transcript}
                            onChange={(e) => setTranscript(e.target.value)}
                            placeholder={isListening ? "Listening..." : "Your transcribed answer will appear here. Click the mic to start."}
                            className="w-full min-h-[150px] p-4 pr-16 rounded-md border bg-muted"
                            readOnly={isListening}
                        />
                         <Button
                            size="icon"
                            variant={isListening ? "destructive" : "outline"}
                            onClick={handleToggleListening}
                            className="absolute right-4 top-4 rounded-full h-10 w-10"
                            disabled={!recognitionRef.current}
                         >
                           {isListening ? <MicOff /> : <Mic />}
                         </Button>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSubmitAnswer} disabled={!transcript || interviewState === 'analyzing' || isListening}>
                       {interviewState === 'analyzing' ? <Spinner className="mr-2"/> : <ChevronRight className="mr-2" />}
                       Submit Answer
                    </Button>
                </CardFooter>
            </Card>
        );
    }
    
    if (interviewState === "feedback") {
        const lastFeedback = feedbackLog[feedbackLog.length - 1];
        return (
            <Card className="w-full max-w-3xl mx-auto">
                 <CardHeader>
                    <CardTitle>Feedback on Your Answer</CardTitle>
                    <CardDescription>For question: "{lastFeedback.question}"</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-center gap-4 bg-muted p-4 rounded-lg">
                        <p className="text-lg font-medium">Your Score:</p>
                        <div className="text-4xl font-bold text-primary">{lastFeedback.score}/10</div>
                    </div>
                    <p className="text-base">{lastFeedback.feedback}</p>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleNextQuestion}>
                        {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish & View Report'}
                        <ChevronRight className="ml-2"/>
                    </Button>
                </CardFooter>
            </Card>
        )
    }

     if (interviewState === "finished") {
        const averageScore = feedbackLog.reduce((acc, fb) => acc + fb.score, 0) / feedbackLog.length;
        return (
            <Card className="w-full max-w-3xl mx-auto">
                 <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Interview Complete!</CardTitle>
                    <CardDescription>Here is your performance summary.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center bg-primary/10 p-6 rounded-lg">
                        <p className="text-lg text-primary font-semibold">Overall Performance Score</p>
                        <p className="text-6xl font-bold text-primary">{averageScore.toFixed(1)}/10</p>
                    </div>
                    <div className="space-y-4">
                        {feedbackLog.map((fb, index) => (
                            <Card key={index}>
                                <CardHeader>
                                    <p className="font-semibold text-sm">Q: {fb.question}</p>
                                    <Badge className="w-fit">Score: {fb.score}/10</Badge>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">{fb.feedback}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleRestart}>Start New Interview</Button>
                </CardFooter>
            </Card>
        )
    }

  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-primary"/> AI Interview Prep
        </h1>
        <p className="mt-1 text-muted-foreground">
          Practice your interview skills and get instant AI-powered feedback.
        </p>
      </div>
      <div className="flex justify-center items-start min-h-[500px]">
        {renderContent()}
      </div>
    </div>
  );
}
