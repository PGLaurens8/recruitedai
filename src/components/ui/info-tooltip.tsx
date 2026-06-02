"use client";

import { Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  /** Short, one-sentence explanation shown on hover/focus. */
  text: string;
  /** Preferred side for the tooltip popover. */
  side?: "top" | "right" | "bottom" | "left";
  /** Optional extra classes for the trigger button. */
  className?: string;
}

/**
 * Subtle muted info button that reveals a short explanatory tooltip on hover or
 * focus. Self-contained (includes its own TooltipProvider) so it can be dropped
 * next to any heading or label without additional wiring.
 */
export function InfoTooltip({ text, side = "top", className }: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={text}
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              className
            )}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-xs font-normal">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
