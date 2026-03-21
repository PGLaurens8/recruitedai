"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  FileSearch,
  Sparkles,
  UserCircle,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  BarChart,
  Save,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Plus,
  ArrowRight,
  Download,
  Printer,
  Building,
  Mail,
  Send,
  Loader2,
  Trash2
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { postJson } from "@/lib/api-client";
import type { AnalyzeInterviewOutput } from "@/ai/flows/analyze-interview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from "@/context/auth-context";
import {
  saveCandidateInterviewAnalysis,
  useCandidates,
  useCompany,
  useCurrentProfile,
} from "@/lib/data/hooks";

// Speech Recognition Setup
const SpeechRecognition =
  (typeof window !== "undefined" && (window as any).SpeechRecognition) ||
  (typeof window !== "undefined" && (window as any).webkitSpeechRecognition);

const defaultQuestions = [
  "Brief professional background summary?",
  "What are your primary technical/core skills?",
  "What is your greatest professional achievement?",
  "Why are you leaving your current role?",
  "What are your salary expectations?",
];

const TRANSCRIPT_CHUNK_TARGET_CHARS = 4000;
const TRANSCRIPT_MAX_CHARS = 250000;
const CHECKPOINT_INTERVAL_MS = 30000;
const AUTO_RESTART_DELAY_MS = 600;
const CHECKPOINT_STORAGE_KEY = "recruitedai.interview-checkpoint.v1";

export default function InterviewAnalysisPage() {
  const [activeTab, setActiveTab] = useState("setup");
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeInterviewOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live Session States
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [questions, setQuestions] = useState<string[]>(defaultQuestions);
  const [newQuestion, setNewQuestion] = useState("");
  const [selectedCandidateId, setSelectedJobCandidateId] = useState<string>("");
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [checkpointCount, setCheckpointCount] = useState(0);
  const [lastCheckpointAt, setLastCheckpointAt] = useState<string | null>(null);
  const [transcriptChunks, setTranscriptChunks] = useState<string[]>([]);

  // Branding States
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const packRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const shouldKeepListeningRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveTranscriptRef = useRef("");
  const transcriptChunksRef = useRef<string[]>([]);
  const questionsRef = useRef<string[]>(defaultQuestions);
  const selectedCandidateIdRef = useRef("");

  const { toast } = useToast();
  const { user } = useAuth();

  const { data: profile } = useCurrentProfile(user);
  const companyId = profile?.companyId;
  const { data: companyDoc } = useCompany(companyId);
  const { data: candidates } = useCandidates(companyId);

  const selectedCandidate = candidates?.find(c => c.id === selectedCandidateId);
  const transcriptForAnalysis = (transcriptChunks.join(' ').trim() || liveTranscript).trim();

  useEffect(() => {
    liveTranscriptRef.current = liveTranscript;
  }, [liveTranscript]);

  useEffect(() => {
    transcriptChunksRef.current = transcriptChunks;
  }, [transcriptChunks]);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    selectedCandidateIdRef.current = selectedCandidateId;
  }, [selectedCandidateId]);

  useEffect(() => {
    if (companyDoc?.name) {
      setCompanyInfo({
        name: companyDoc.name,
        logo: companyDoc.logo || '',
        website: companyDoc.website || '',
        address: companyDoc.address || '',
      });
    }
  }, [companyDoc]);

  const saveCheckpoint = useCallback((source: 'interval' | 'manual' | 'analysis') => {
    if (typeof window === 'undefined') {
      return;
    }

    const mergedTranscript = transcriptChunksRef.current.join(' ').trim() || liveTranscriptRef.current.trim();
    if (!mergedTranscript) {
      return;
    }

    const payload = {
      savedAt: new Date().toISOString(),
      source,
      transcript: mergedTranscript,
      chunks: transcriptChunksRef.current,
      questions: questionsRef.current,
      selectedCandidateId: selectedCandidateIdRef.current,
    };

    window.localStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(payload));
    setCheckpointCount((count) => count + 1);
    setLastCheckpointAt(payload.savedAt);
  }, []);

  const appendTranscriptSegment = useCallback((segment: string) => {
    const cleaned = segment.replace(/\s+/g, ' ').trim();
    if (!cleaned) {
      return;
    }

    setLiveTranscript((prev) => [prev, cleaned].filter(Boolean).join(' ').trim());
    setTranscriptChunks((prev) => {
      const next = [...prev];
      let remaining = cleaned;

      while (remaining.length > 0) {
        const last = next[next.length - 1];
        if (!last) {
          next.push(remaining.slice(0, TRANSCRIPT_CHUNK_TARGET_CHARS));
          remaining = remaining.slice(TRANSCRIPT_CHUNK_TARGET_CHARS);
          continue;
        }

        if (last.length >= TRANSCRIPT_CHUNK_TARGET_CHARS) {
          next.push(remaining.slice(0, TRANSCRIPT_CHUNK_TARGET_CHARS));
          remaining = remaining.slice(TRANSCRIPT_CHUNK_TARGET_CHARS);
          continue;
        }

        const available = TRANSCRIPT_CHUNK_TARGET_CHARS - last.length;
        const piece = remaining.slice(0, available);
        next[next.length - 1] = `${last} ${piece}`.trim();
        remaining = remaining.slice(available);
      }

      return next;
    });
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast({
        variant: 'destructive',
        title: 'Speech recognition unavailable',
        description: 'Your browser does not support live speech recognition.',
      });
      return;
    }

    shouldKeepListeningRef.current = true;
    if (!sessionStartedAt) {
      setSessionStartedAt(new Date().toISOString());
    }

    try {
      recognitionRef.current.start();
    } catch (error: any) {
      if (error?.name !== 'InvalidStateError') {
        shouldKeepListeningRef.current = false;
        toast({
          variant: 'destructive',
          title: 'Could not start listening',
          description: error?.message || 'Microphone capture failed to start.',
        });
      }
    }
  }, [sessionStartedAt, toast]);

  const stopListening = useCallback((source: 'manual' | 'analysis' = 'manual') => {
    shouldKeepListeningRef.current = false;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    recognitionRef.current?.stop();
    setIsListening(false);
    saveCheckpoint(source);
  }, [saveCheckpoint]);

  const resetSession = useCallback(() => {
    stopListening('manual');
    setAnalysis(null);
    setError(null);
    setLiveTranscript('');
    setTranscript('');
    setTranscriptChunks([]);
    setSessionStartedAt(null);
    setCheckpointCount(0);
    setLastCheckpointAt(null);

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CHECKPOINT_STORAGE_KEY);
    }

    setActiveTab('setup');
  }, [stopListening]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const raw = window.localStorage.getItem(CHECKPOINT_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        savedAt?: string;
        transcript?: string;
        chunks?: string[];
        questions?: string[];
        selectedCandidateId?: string;
      };

      if (parsed.chunks?.length) {
        setTranscriptChunks(parsed.chunks);
      }

      if (parsed.transcript) {
        setLiveTranscript(parsed.transcript);
        setTranscript(parsed.transcript);
      }

      if (parsed.questions?.length) {
        setQuestions(parsed.questions);
      }

      if (parsed.selectedCandidateId) {
        setSelectedJobCandidateId(parsed.selectedCandidateId);
      }

      if (parsed.savedAt) {
        setLastCheckpointAt(parsed.savedAt);
      }
    } catch {
      window.localStorage.removeItem(CHECKPOINT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    // Initialize Speech Recognition
    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + " ";
        }
      }
      appendTranscriptSegment(final);
    };

    recognition.onend = () => {
      setIsListening(false);

      if (!shouldKeepListeningRef.current) {
        return;
      }

      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
      }

      restartTimerRef.current = setTimeout(() => {
        try {
          recognition.start();
        } catch {
          // Retry will happen on the next onend callback.
        }
      }, AUTO_RESTART_DELAY_MS);
    };

    recognition.onerror = (err: any) => {
      const reason = err?.error || 'unknown';
      setIsListening(false);

      const fatal =
        reason === 'not-allowed' ||
        reason === 'service-not-allowed' ||
        reason === 'audio-capture';

      if (fatal) {
        shouldKeepListeningRef.current = false;
      }

      toast({
        variant: 'destructive',
        title: 'Speech Recognition Error',
        description: `An error occurred: ${reason}. ${fatal ? 'Please re-enable microphone permissions.' : 'Attempting to continue capture.'}`,
      });
    };

    recognitionRef.current = recognition;

    return () => {
      shouldKeepListeningRef.current = false;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      recognition.stop();
    };
  }, [appendTranscriptSegment, toast]);

  useEffect(() => {
    if (!isListening) {
      return;
    }

    const timer = setInterval(() => {
      saveCheckpoint('interval');
    }, CHECKPOINT_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isListening, saveCheckpoint]);

  const handleToggleListening = () => {
    if (isListening) {
      stopListening('manual');
      return;
    }

    startListening();
  };

  const handleAnalyze = async (textToAnalyze: string) => {
    const normalizedTranscript = textToAnalyze.trim();
    if (!normalizedTranscript) {
      toast({ variant: "destructive", title: "No content to analyze." });
      return;
    }

    if (normalizedTranscript.length > TRANSCRIPT_MAX_CHARS) {
      toast({
        variant: 'destructive',
        title: 'Transcript too large',
        description: `Current transcript is ${normalizedTranscript.length.toLocaleString()} characters, but the analysis endpoint limit is ${TRANSCRIPT_MAX_CHARS.toLocaleString()}.`,
      });
      return;
    }

    stopListening('analysis');
    saveCheckpoint('analysis');

    setIsLoading(true);
    setError(null);

    try {
      const result = await postJson<AnalyzeInterviewOutput>("/api/ai/interview-analyze", {
        transcript: normalizedTranscript,
        questions,
      });
      setAnalysis(result);
      setActiveTab("results");
      toast({ title: "Analysis Complete!", description: "AI has extracted structured data." });
    } catch (e: any) {
      setError(e.message);
      toast({ variant: "destructive", title: "Analysis Failed", description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToCandidate = async () => {
    if (!selectedCandidateId || !analysis || !companyId) return;

    await saveCandidateInterviewAnalysis(companyId, selectedCandidateId, analysis);
    toast({ title: "Profile Updated", description: "Interview data linked to candidate." });
  };

  const downloadBrandedPack = async () => {
    if (!packRef.current) return;

    toast({ title: "Generating Branded Pack...", description: "Combining CV and Interview notes." });

    const canvas = await html2canvas(packRef.current, { scale: 2 });
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

    pdf.save(`Candidate_Pack_${selectedCandidate?.name || 'Profile'}.pdf`);
  };

  const addQuestion = () => {
    if (newQuestion.trim()) {
      setQuestions([...questions, newQuestion.trim()]);
      setNewQuestion("");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Note Taker & Analyst</h1>
          <p className="mt-1 text-muted-foreground">
            Live capture, structured analysis, and branded candidate reporting.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetSession}>
            <Plus className="mr-2 h-4 w-4" /> New Session
          </Button>
          <Button disabled={!analysis} onClick={downloadBrandedPack}>
            <Printer className="mr-2 h-4 w-4" /> Download Branded Pack
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="setup">1. Setup</TabsTrigger>
          <TabsTrigger value="live">2. Live Capture</TabsTrigger>
          <TabsTrigger value="upload">3. Upload Transcript</TabsTrigger>
          <TabsTrigger value="results">4. Insights & Pack</TabsTrigger>
        </TabsList>

        {/* STEP 1: SETUP */}
        <TabsContent value="setup" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Session Configuration</CardTitle>
                <CardDescription>Select a candidate and set your interview template.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Link to Candidate</Label>
                  <Select value={selectedCandidateId} onValueChange={setSelectedJobCandidateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select existing candidate..." />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name} ({c.currentJob})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label>Interview Questions (Template)</Label>
                  <div className="space-y-2">
                    {questions.map((q, i) => (
                      <div key={i} className="flex items-center gap-2 bg-muted/50 p-2 rounded-md text-sm">
                        <span className="flex-1">{q}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Add a custom question..." value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} />
                    <Button variant="outline" size="icon" onClick={addQuestion}><Plus className="h-4 w-4"/></Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => setActiveTab("live")} className="w-full">
                  Begin Live AI Note Taking <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground font-bold">Platform Connections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                      <Video className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Zoom</p>
                      <p className="text-xs text-muted-foreground">Auto-join coming soon</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="group-hover:bg-primary group-hover:text-white">Connect</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Google Meet</p>
                      <p className="text-xs text-muted-foreground">Chrome Extension mode</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="group-hover:bg-primary group-hover:text-white">Connect</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                      <Building className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">MS Teams</p>
                      <p className="text-xs text-muted-foreground">Recording integration</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="group-hover:bg-primary group-hover:text-white">Connect</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* STEP 2: LIVE CAPTURE */}
        <TabsContent value="live" className="mt-6">
          <Card className="border-primary/50 shadow-lg">
            <CardHeader className="bg-primary/5">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Active Listening Mode</CardTitle>
                  <CardDescription>Position your microphone near your speakers to capture the remote conversation.</CardDescription>
                </div>
                {isListening && (
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-bold text-red-500">LIVE</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="min-h-[300px] bg-muted/20 rounded-xl p-6 border-2 border-dashed font-mono text-sm leading-relaxed relative overflow-hidden">
                {liveTranscript || "Waiting for audio input..."}
                {isListening && (
                  <div className="absolute bottom-4 right-4 h-8 w-32 bg-background/80 backdrop-blur rounded-full flex items-center justify-center gap-2 border px-3">
                    <div className="h-1 w-1 rounded-full bg-primary animate-bounce delay-0" />
                    <div className="h-1 w-1 rounded-full bg-primary animate-bounce delay-75" />
                    <div className="h-1 w-1 rounded-full bg-primary animate-bounce delay-150" />
                    <span className="text-[10px] uppercase font-bold">Listening</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Session start: {sessionStartedAt ? new Date(sessionStartedAt).toLocaleTimeString() : "Not started"}</span>
                <span>Chunks: {transcriptChunks.length}</span>
                <span>Checkpoints: {checkpointCount}</span>
                <span>Last checkpoint: {lastCheckpointAt ? new Date(lastCheckpointAt).toLocaleTimeString() : "None"}</span>
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  size="lg"
                  variant={isListening ? "destructive" : "default"}
                  className="rounded-full h-16 w-16"
                  onClick={handleToggleListening}
                >
                  {isListening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                </Button>
                <Button size="lg" variant="outline" className="rounded-full h-16 w-16">
                  <VideoOff className="h-8 w-8" />
                </Button>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 justify-between">
              <p className="text-xs text-muted-foreground">Session ends when you stop recording and run AI Analysis.</p>
              <Button onClick={() => handleAnalyze(transcriptForAnalysis)} disabled={!transcriptForAnalysis || isLoading}>
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
                End & Run AI Analysis
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* STEP 3: UPLOAD */}
        <TabsContent value="upload" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Manual Transcript Upload</CardTitle>
              <CardDescription>Paste existing text from Zoom/Teams logs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste conversation here..."
                className="min-h-[400px] font-mono text-sm"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
              <Button onClick={() => handleAnalyze(transcript)} disabled={isLoading} className="w-full">
                Analyze Transcript
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STEP 4: RESULTS & PACK */}
        <TabsContent value="results" className="mt-6 space-y-8">
          {!analysis ? (
            <div className="text-center py-20 bg-muted/20 rounded-lg border-dashed border-2">
              <FileSearch className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />
              <p className="text-muted-foreground">Analyze a session to see results here.</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <Card className="border-primary bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <BarChart className="h-5 w-5" />
                      Executive Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm italic font-medium">"{analysis.overallAssessment}"</p>
                    <div className="flex gap-4">
                      <Badge variant="outline">Candidate: {analysis.candidateName || 'Unknown'}</Badge>
                      <Badge variant="outline">Interviewer: {analysis.interviewerName || 'Unknown'}</Badge>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" onClick={handleSaveToCandidate}>
                      <Save className="mr-2 h-4 w-4" /> Link to Candidate Record
                    </Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Captured Interview Data</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {analysis.questionsAnswers.map((qa, i) => (
                      <div key={i} className="space-y-1">
                        <h4 className="text-sm font-bold flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          {qa.question}
                        </h4>
                        <p className="text-sm text-muted-foreground pl-5">{qa.answer}</p>
                        {i < analysis.questionsAnswers.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* BRANDED PREVIEW */}
              <div className="space-y-4 sticky top-24">
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-bold">Branded Pack Preview</h3>
                  <Button size="sm" onClick={downloadBrandedPack}>
                    <Download className="mr-2 h-4 w-4" /> Download Pack
                  </Button>
                </div>
                <div className="border rounded-lg shadow-2xl overflow-hidden bg-white text-black scale-90 origin-top transform-gpu">
                  <div ref={packRef} className="p-12 w-[210mm] min-h-[297mm] font-serif bg-white">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b-4 border-primary pb-8 mb-10">
                      {companyInfo?.logo ? (
                        <img src={companyInfo.logo} alt="Agency Logo" className="h-20 object-contain" />
                      ) : (
                        <div className="h-20 w-20 bg-primary text-white flex items-center justify-center font-bold text-4xl">
                          {companyInfo?.name?.charAt(0) || 'A'}
                        </div>
                      )}
                      <div className="text-right">
                        <h2 className="text-3xl font-bold text-primary tracking-tighter uppercase">{companyInfo?.name || 'Recruitment Agency'}</h2>
                        <p className="text-sm text-gray-600">{companyInfo?.website || 'www.agency.com'}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mt-2 font-sans font-bold">Confidential Candidate Evaluation Pack</p>
                      </div>
                    </div>

                    {/* Candidate Identity */}
                    <div className="mb-12">
                      <div className="flex items-baseline gap-4 mb-2">
                        <h1 className="text-5xl font-black">{selectedCandidate?.name || analysis.candidateName}</h1>
                        <span className="text-xl text-primary font-bold italic">/ {selectedCandidate?.currentJob || 'Candidate Profile'}</span>
                      </div>
                      <div className="h-1 w-32 bg-primary/20" />
                    </div>

                    <div className="grid grid-cols-12 gap-12">
                      <div className="col-span-4 space-y-10">
                        <section>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 font-sans">Interview Core Insights</h3>
                          <div className="space-y-4 text-xs">
                            {analysis.questionsAnswers.slice(0, 4).map((qa, i) => (
                              <div key={i}>
                                <p className="font-bold text-gray-500 mb-1">{qa.question}</p>
                                <p className="leading-relaxed">{qa.answer}</p>
                              </div>
                            ))}
                          </div>
                        </section>

                        <section>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 font-sans">Technical Proficiencies</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedCandidate?.skills?.slice(0, 15).map((s: string, i: number) => (
                              <span key={i} className="text-[9px] font-bold bg-gray-100 px-2 py-1 rounded-sm uppercase">{s}</span>
                            ))}
                          </div>
                        </section>
                      </div>

                      <div className="col-span-8 space-y-10 border-l border-gray-100 pl-12">
                        <section>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 font-sans">Consultant Executive Summary</h3>
                          <p className="text-sm leading-relaxed italic text-gray-700 font-medium">"{analysis.overallAssessment}"</p>
                        </section>

                        <section>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 font-sans">Professional Background (CV)</h3>
                          <div className="text-[10px] text-gray-600 leading-normal whitespace-pre-wrap font-sans max-h-[400px] overflow-hidden">
                            {selectedCandidate?.fullResumeText || "Original CV content attached to subsequent pages."}
                          </div>
                        </section>
                      </div>
                    </div>

                    <footer className="mt-auto pt-16 border-t border-gray-100 flex justify-between items-end">
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Prepared By</p>
                        <p className="text-sm font-bold text-primary">{user?.name || 'RecruitedAI Consultant'}</p>
                      </div>
                      <p className="text-[8px] text-gray-300 w-64 text-right italic leading-tight">
                        This evaluation pack is confidential and proprietary to {companyInfo?.name || 'the agency'}. Distribution without consent is prohibited.
                      </p>
                    </footer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
