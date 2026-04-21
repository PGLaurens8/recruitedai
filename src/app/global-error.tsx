"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error boundary caught an exception.", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-lg space-y-4 rounded-lg border bg-card p-6">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Application error</h1>
            <p className="text-sm text-muted-foreground">
              The app crashed while loading. Retry first. If it happens again, sign in again to rebuild session state.
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={reset}>Retry</Button>
            <Button variant="outline" onClick={() => window.location.assign("/login")}>
              Sign In Again
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
