"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, CheckCircle2, Circle, PartyPopper, Sparkles, X } from "lucide-react";
import { getJson } from "@/lib/api-client";
import { isSupabaseMode } from "@/lib/runtime-mode";
import { cn } from "@/lib/utils";

type StepId = "branding" | "parse_cv" | "job_brief" | "add_client" | "ai_match";

interface StepDef {
  id: StepId;
  title: string;
  description: string;
  href: string;
  /** Manual steps are marked complete by the user; auto steps are derived from real data. */
  manual: boolean;
}

const STEPS: StepDef[] = [
  {
    id: "branding",
    title: "Set up your agency branding",
    description: "Add your logo and details so reports look like yours.",
    href: "/profile?tab=branding",
    manual: true,
  },
  {
    id: "parse_cv",
    title: "Parse your first candidate CV",
    description: "Drop in a resume and let the Smart Parser extract the details.",
    href: "/ai-parser",
    manual: false,
  },
  {
    id: "job_brief",
    title: "Create your first job brief",
    description: "Capture a role to start matching candidates against it.",
    href: "/jobs/new",
    manual: false,
  },
  {
    id: "add_client",
    title: "Add your first client",
    description: "Track the companies you are hiring for.",
    href: "/clients",
    manual: false,
  },
  {
    id: "ai_match",
    title: "Run your first AI match",
    description: "Score a candidate against a role with explainable AI.",
    href: "/ai-parser",
    manual: true,
  },
];

const STORAGE_KEY = "recruitedai:onboarding";

interface OnboardingState {
  completedSteps: string[];
  dismissed: boolean;
}

function readLocal(): OnboardingState {
  if (typeof window === "undefined") {
    return { completedSteps: [], dismissed: false };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { completedSteps: [], dismissed: false };
    }
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return {
      completedSteps: Array.isArray(parsed.completedSteps) ? parsed.completedSteps : [],
      dismissed: Boolean(parsed.dismissed),
    };
  } catch {
    return { completedSteps: [], dismissed: false };
  }
}

function writeLocal(state: OnboardingState) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

function patchRemote(body: { step?: string; dismissed?: boolean }) {
  // Fire-and-forget: the UI updates optimistically, persistence is best-effort.
  void fetch("/api/onboarding", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {
    /* ignore — progress will re-sync on next load */
  });
}

interface OnboardingChecklistProps {
  candidatesCount: number;
  clientsCount: number;
  jobsCount: number;
}

export function OnboardingChecklist({
  candidatesCount,
  clientsCount,
  jobsCount,
}: OnboardingChecklistProps) {
  const [manualSteps, setManualSteps] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (isSupabaseMode()) {
        try {
          const data = await getJson<OnboardingState>("/api/onboarding");
          if (!active) return;
          setManualSteps(data.completedSteps || []);
          setDismissed(Boolean(data.dismissed));
          setLoaded(true);
          return;
        } catch {
          // No session / not reachable — fall back to local persistence.
        }
      }
      if (!active) return;
      const local = readLocal();
      setManualSteps(local.completedSteps);
      setDismissed(local.dismissed);
      setLoaded(true);
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const autoComplete = useMemo<Record<StepId, boolean>>(
    () => ({
      branding: false,
      parse_cv: candidatesCount > 0,
      job_brief: jobsCount > 0,
      add_client: clientsCount > 0,
      ai_match: false,
    }),
    [candidatesCount, jobsCount, clientsCount]
  );

  const isComplete = useCallback(
    (step: StepDef) => autoComplete[step.id] || manualSteps.includes(step.id),
    [autoComplete, manualSteps]
  );

  const completedCount = STEPS.filter(isComplete).length;
  const allComplete = completedCount === STEPS.length;
  const progress = (completedCount / STEPS.length) * 100;

  const markStep = useCallback(
    (id: StepId) => {
      setManualSteps((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        if (isSupabaseMode()) {
          patchRemote({ step: id });
        } else {
          writeLocal({ completedSteps: next, dismissed });
        }
        return next;
      });
    },
    [dismissed]
  );

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    if (isSupabaseMode()) {
      patchRemote({ dismissed: true });
    } else {
      writeLocal({ completedSteps: manualSteps, dismissed: true });
    }
  }, [manualSteps]);

  // Hide until we know the persisted state (avoids a flash), once dismissed, or
  // once the user is clearly established (5+ candidates means they're not new).
  if (!loaded || dismissed || candidatesCount >= 5) {
    return null;
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Get started with RecruitedAI
              <InfoTooltip text="Complete these steps to get the most out of RecruitedAI" />
            </CardTitle>
            <CardDescription>
              A few quick steps to set up your workspace and run your first AI screen.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="shrink-0">
              {completedCount}/{STEPS.length}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={handleDismiss}
              aria-label="Dismiss onboarding checklist"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-1 pt-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {completedCount} of {STEPS.length} steps complete
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {allComplete ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <PartyPopper className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold">You&apos;re all set up! 🎉</p>
              <p className="text-sm text-muted-foreground">
                Your workspace is ready. You can hide this checklist now.
              </p>
            </div>
            <Button onClick={handleDismiss}>Dismiss checklist</Button>
          </div>
        ) : (
          STEPS.map((step) => {
            const complete = isComplete(step);
            return (
              <div
                key={step.id}
                className="flex items-center gap-3 rounded-md border bg-background px-3 py-2.5"
              >
                {complete ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                ) : step.manual ? (
                  <button
                    type="button"
                    onClick={() => markStep(step.id)}
                    aria-label={`Mark "${step.title}" complete`}
                    className="shrink-0 rounded-full text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Circle className="h-5 w-5" />
                  </button>
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      complete && "text-muted-foreground line-through"
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{step.description}</p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  asChild
                >
                  <Link href={step.href} aria-label={`Go to: ${step.title}`}>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
