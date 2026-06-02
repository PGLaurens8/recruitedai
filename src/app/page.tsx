import Link from 'next/link';
import {
  Briefcase,
  CheckCircle2,
  Circle,
  Upload,
  FileText,
  ListChecks,
  Quote,
  Sparkles,
  ToggleRight,
  Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Sparkles,
    title: 'Explainable scoring',
    body: 'Every score comes with matched skills in green and missing skills in amber. No more black box.',
  },
  {
    icon: ToggleRight,
    title: 'Skills-First Mode',
    body: 'Toggle on to weight real experience over formal credentials. Built for skills-based hiring.',
  },
  {
    icon: Zap,
    title: '80 CVs ranked in minutes',
    body: 'Upload a batch, paste a job spec, get a ranked shortlist with explanations. No ATS required.',
  },
];

const steps = [
  {
    icon: Upload,
    title: 'Upload candidate CVs',
    body: 'Drag and drop a batch, or pull from your existing CV pool. PDF, DOCX, plain text — all welcome.',
  },
  {
    icon: FileText,
    title: 'Paste or upload a job description',
    body: 'Paste the spec in, or upload a brief from your client. Toggle Skills-First Mode if you want to.',
  },
  {
    icon: ListChecks,
    title: 'Get a ranked, explainable shortlist',
    body: 'See every candidate scored on skills and experience, with matched and missing skills colour-coded.',
  },
];

const matchedSkills = ['React', 'TypeScript', 'Node.js', '5 yrs SaaS'];
const skillGaps = ['AWS', 'Kubernetes'];

function MarketingHeader() {
  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <Briefcase className="h-6 w-6 text-primary" />
          <span>RecruitedAI</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/pricing" className="hidden sm:inline-flex">
            <Button variant="ghost" size="sm">Pricing</Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Start free trial</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 grid sm:grid-cols-3 gap-6 text-sm text-muted-foreground">
        <div>
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Briefcase className="h-5 w-5 text-primary" />
            RecruitedAI
          </div>
          <p className="mt-2">Skills-first CV screening for agencies and job seekers. Built in South Africa.</p>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-2">Product</p>
          <ul className="space-y-1">
            <li><Link href="/pricing" className="hover:text-primary">Pricing</Link></li>
            <li><Link href="/signup" className="hover:text-primary">Start free trial</Link></li>
            <li><Link href="/login" className="hover:text-primary">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-2">Contact</p>
          <ul className="space-y-1">
            <li><a href="mailto:pglaurens@outlook.com" className="hover:text-primary">pglaurens@outlook.com</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

function MockScoreCard() {
  return (
    <div className="w-full max-w-md rounded-xl border border-slate-700/60 bg-slate-800/60 p-6 shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">Candidate</p>
          <p className="mt-1 font-semibold text-white">Maya Chen</p>
          <p className="text-sm text-slate-400">Senior Full-Stack Engineer</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-extrabold text-green-400 leading-none">87%</p>
          <p className="mt-1 text-xs text-slate-400">match</p>
        </div>
      </div>

      <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
        <div className="h-full rounded-full bg-green-400" style={{ width: '87%' }} />
      </div>

      <div className="mt-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Skills matched</p>
        <ul className="mt-2 space-y-1.5">
          {matchedSkills.map((s) => (
            <li key={s} className="flex items-center gap-2 text-sm text-slate-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
              {s}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Gaps</p>
        <ul className="mt-2 space-y-1.5">
          {skillGaps.map((s) => (
            <li key={s} className="flex items-center gap-2 text-sm text-slate-300">
              <Circle className="h-4 w-4 shrink-0 text-amber-400" />
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-slate-900 text-white">
          <div className="container mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Screen 200 CVs in the time it takes to read 10.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-slate-300">
                RecruitedAI scores candidates on skills and experience — not keywords — and shows you exactly why each one ranked where they did.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup">
                  <Button size="lg" className="h-12 bg-blue-500 px-8 text-white hover:bg-blue-600">
                    Start free trial
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 border-slate-600 bg-transparent px-8 text-white hover:bg-slate-800 hover:text-white"
                  >
                    See pricing
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-xs text-slate-400">
                7-day free trial · No credit card · Cancel anytime
              </p>
            </div>
            <div className="lg:justify-self-end">
              <MockScoreCard />
            </div>
          </div>
        </section>

        {/* Three feature cards */}
        <section className="container mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-lg border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-blue-100 text-blue-600">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-y bg-slate-50">
          <div className="container mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold">How it works</h2>
              <p className="mt-2 text-muted-foreground">
                From upload to ranked shortlist in minutes.
              </p>
            </div>
            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
              {steps.map((s, i) => (
                <li key={s.title} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-lg font-bold text-white">
                    {i + 1}
                  </div>
                  <div className="mx-auto mt-4 flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Social proof */}
        <section className="container mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Used by recruiters in South Africa, UK, and Australia
          </p>
          <Card className="mx-auto mt-8 max-w-2xl border-slate-200">
            <CardContent className="pt-6">
              <Quote className="h-6 w-6 text-blue-500" aria-hidden />
              <p className="mt-3 text-base italic text-foreground">
                &ldquo;Placeholder testimonial — drop in a real quote from a recruiter who&apos;s
                cut their CV-screening time with RecruitedAI. Two short sentences is the
                sweet spot.&rdquo;
              </p>
              <p className="mt-4 text-sm text-muted-foreground">— Name, Title, Agency</p>
            </CardContent>
          </Card>
        </section>

        {/* Bottom CTA */}
        <section className="bg-slate-900 text-white">
          <div className="container mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
            <h2 className="text-3xl font-bold sm:text-4xl">Ready to screen smarter?</h2>
            <p className="mt-3 text-slate-300">
              Start your 7-day free trial — no credit card required.
            </p>
            <div className="mt-8">
              <Link href="/signup">
                <Button size="lg" className="h-12 bg-blue-500 px-8 text-white hover:bg-blue-600">
                  Get started free
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
