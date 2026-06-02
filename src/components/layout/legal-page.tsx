import type { ReactNode } from "react";
import Link from "next/link";
import { Briefcase } from "lucide-react";

interface LegalPageShellProps {
  title: string;
  /** Human-readable last-updated date, e.g. "2 June 2026". */
  lastUpdated: string;
  /** Short summary line shown under the title. */
  intro?: string;
  children: ReactNode;
}

/**
 * Shared layout for the public legal/policy pages (Terms, Privacy, Refunds).
 * Clean white background, readable max-width column, a minimal nav header with
 * the RecruitedAI logo linking home, and a footer cross-linking the policies.
 *
 * Body typography is styled via arbitrary variants on the content wrapper so we
 * don't depend on the Tailwind typography plugin (not installed in this repo).
 */
export function LegalPageShell({ title, lastUpdated, intro, children }: LegalPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-700">
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="container mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Briefcase className="h-6 w-6 text-primary" />
            <span>RecruitedAI</span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-primary">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <article className="container mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
          {intro && <p className="mt-4 text-base leading-7 text-slate-600">{intro}</p>}

          <div
            className="mt-10 space-y-3
              [&_h2]:mb-2 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900
              [&_h2:first-child]:mt-0
              [&_p]:text-sm [&_p]:leading-7 [&_p]:text-slate-600
              [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6 [&_ul]:text-sm [&_ul]:leading-7 [&_ul]:text-slate-600
              [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
              [&_strong]:font-semibold [&_strong]:text-slate-900"
          >
            {children}
          </div>
        </article>
      </main>

      <footer className="border-t bg-muted/30">
        <div className="container mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <Briefcase className="h-5 w-5 text-primary" />
            RecruitedAI
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
            <Link href="/refunds" className="hover:text-primary">Refund Policy</Link>
            <a href="mailto:pglaurens@outlook.com" className="hover:text-primary">Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
