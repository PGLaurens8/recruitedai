"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Search, UserCheck, Sparkles, Save, AlertTriangle } from "lucide-react";
import { postJson } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { saveCandidateInterview, useCandidates, useCurrentProfile } from "@/lib/data/hooks";
import {
  GENERAL_NOTES_KEY,
  QUESTIONS_KEY,
  parseScreeningQuestions,
} from "@/lib/screening-questions";

export default function CandidateProfilesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: profile } = useCurrentProfile(user);
  const companyId = profile?.companyId;
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: candidates, isLoading: isLoadingCandidates } = useCandidates(companyId, refreshKey);

  const [selectedId, setSelectedId] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  const [questions, setQuestions] = useState<string[]>(() => parseScreeningQuestions(null));
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [summary, setSummary] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCandidate = useMemo(
    () => (candidates || []).find((c) => c.id === selectedId) || null,
    [candidates, selectedId],
  );

  // Load the selected candidate's existing screening notes into the editor.
  useEffect(() => {
    if (selectedCandidate) {
      const interviewNotes = selectedCandidate.interviewNotes || {};
      setQuestions(parseScreeningQuestions(interviewNotes));
      setNotes(interviewNotes);
      setScores(selectedCandidate.interviewScores || {});
      setGeneralNotes(interviewNotes[GENERAL_NOTES_KEY] || "");
      setSummary(selectedCandidate.aiSummary || "");
      setError(null);
    } else {
      setQuestions(parseScreeningQuestions(null));
      setNotes({});
      setScores({});
      setGeneralNotes("");
      setSummary("");
    }
  }, [selectedCandidate]);

  const filteredCandidates = useMemo(() => {
    const term = pickerSearch.trim().toLowerCase();
    const list = candidates || [];
    if (!term) return list;
    return list.filter(
      (c) =>
        c.name?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.currentJob?.toLowerCase().includes(term),
    );
  }, [candidates, pickerSearch]);

  const handleNoteChange = (question: string, value: string) => {
    setNotes((prev) => ({ ...prev, [question]: value }));
  };

  const handleGenerateSummary = async () => {
    if (!selectedCandidate) return;

    const allNotes = Object.entries(notes)
      .filter(([key, note]) => key !== QUESTIONS_KEY && key !== GENERAL_NOTES_KEY && note.trim() !== "")
      .map(([question, note]) => `Question: ${question}\nAnswer/Notes: ${note}`)
      .join("\n\n");

    const combined = [allNotes, generalNotes.trim() ? `General notes: ${generalNotes.trim()}` : ""]
      .filter(Boolean)
      .join("\n\n");

    if (!combined) {
      toast({
        variant: "destructive",
        title: "No notes provided",
        description: "Please enter some notes before generating a summary.",
      });
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await postJson<{ profileSummary: string }>("/api/ai/generate-candidate-profile", {
        candidateName: selectedCandidate.name,
        candidateRole: selectedCandidate.currentJob || "",
        interviewNotes: combined,
      });
      setSummary(result.profileSummary);
      toast({ title: "AI Summary Generated!", description: "A candidate profile summary has been created." });
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!companyId || !selectedCandidate) return;
    setIsSaving(true);
    try {
      // Persist only answers for the active questions plus the reserved meta keys,
      // matching how the candidate detail page stores screening notes.
      const notesToSave: Record<string, string> = {};
      questions.forEach((q) => {
        const value = notes[q];
        if (value && value.trim() !== "") {
          notesToSave[q] = value;
        }
      });
      notesToSave[QUESTIONS_KEY] = JSON.stringify(questions);
      const trimmedGeneral = generalNotes.trim();
      if (trimmedGeneral) {
        notesToSave[GENERAL_NOTES_KEY] = trimmedGeneral;
      }

      await saveCandidateInterview(companyId, selectedCandidate.id, {
        interviewNotes: notesToSave,
        interviewScores: scores,
        aiSummary: summary,
      });
      setRefreshKey((k) => k + 1);
      toast({ title: "Screening notes saved", description: `Notes for ${selectedCandidate.name} have been updated.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e.message || "Could not save screening notes." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Candidate Screening & Profiles</h1>
        <p className="mt-1 text-muted-foreground">
          Select a candidate, capture screening notes against standardized questions, and generate a profile summary with AI.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Screening Details</CardTitle>
          <CardDescription>Pick a candidate from your talent pool — their existing screening notes load automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Candidate</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={pickerOpen}
                  className="w-full sm:w-96 justify-between font-normal"
                  disabled={isLoadingCandidates}
                >
                  {selectedCandidate ? (
                    <span className="truncate">{selectedCandidate.name}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      {isLoadingCandidates ? "Loading candidates..." : "Select a candidate..."}
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <Input
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Search candidates..."
                    className="h-10 border-0 px-0 shadow-none focus-visible:ring-0"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                  {filteredCandidates.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-muted-foreground">No candidates found.</p>
                  ) : (
                    filteredCandidates.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(candidate.id);
                          setPickerOpen(false);
                          setPickerSearch("");
                        }}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
                      >
                        <Check className={cn("h-4 w-4 shrink-0", candidate.id === selectedId ? "opacity-100" : "opacity-0")} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{candidate.name}</span>
                          {(candidate.currentJob || candidate.email) && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {candidate.currentJob || candidate.email}
                            </span>
                          )}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {selectedCandidate && (
              <p className="text-sm text-muted-foreground">
                Editing screening notes for <span className="font-medium text-foreground">{selectedCandidate.name}</span>
                {" · "}
                <Link href={`/candidates/${selectedCandidate.id}`} className="text-primary hover:underline">View full profile →</Link>
              </p>
            )}
          </div>

          {!selectedCandidate ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-12 text-center">
              <UserCheck className="h-7 w-7 text-muted-foreground/60" />
              <p className="text-sm font-medium text-muted-foreground">Select a candidate to begin screening</p>
              <p className="text-xs text-muted-foreground/80">Notes you save here are stored on the candidate&apos;s record.</p>
            </div>
          ) : (
            <>
              <Separator />

              <div className="space-y-4">
                {questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No screening questions configured for this candidate. Use the general notes below.</p>
                ) : questions.map((question, index) => (
                  <div key={`${question}-${index}`} className="space-y-2">
                    <Label htmlFor={`question-${index}`}>{question}</Label>
                    <Textarea
                      id={`question-${index}`}
                      value={notes[question] || ""}
                      onChange={(e) => handleNoteChange(question, e.target.value)}
                      placeholder="Recruiter's notes..."
                      className="min-h-[100px]"
                    />
                  </div>
                ))}

                <div className="space-y-2">
                  <Label htmlFor="general-notes" className="font-semibold">General screening notes</Label>
                  <Textarea
                    id="general-notes"
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    placeholder="Anything else worth recording from the screening call..."
                    className="min-h-[100px]"
                  />
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="summary" className="text-lg font-semibold">AI Generated Profile Summary</Label>
                  <Button onClick={handleGenerateSummary} disabled={isGenerating} variant="outline" size="sm">
                    {isGenerating ? <Spinner size={16} className="mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
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
            </>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={!selectedCandidate || isSaving}>
            {isSaving ? <Spinner size={16} className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
            Save Screening Notes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
