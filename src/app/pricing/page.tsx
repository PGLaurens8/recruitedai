'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  CheckCircle2,
  Sparkles,
  Users,
  FileText,
  Search,
  Mic,
  ShieldCheck,
  Zap,
  Star,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useCompany } from '@/lib/data/hooks';
import {
  detectDefaultCurrency,
  persistCurrency,
  type Currency,
  formatPrice,
} from '@/lib/locale';
import {
  agencyPlans,
  candidatePlans,
  getPrice,
  getPlanFeatures,
  annualSavingsPercent,
  type BillingCycle,
  type Plan,
} from '@/lib/pricing';

const faqs = [
  {
    q: 'Do I need a credit card to start the trial?',
    a: 'No. The 7-day trial is opt-in — no card required. You only pay when you choose to upgrade at the end of trial.',
  },
  {
    q: 'What happens when the trial ends?',
    a: 'Your account stays active in read-only mode until you pick a plan. No data is deleted, and no surprise charges hit your card.',
  },
  {
    q: 'How do the CV screening limits work?',
    a: 'Limits are per account, not per person. The Agency plan’s 500 monthly CV screenings are shared by everyone on your team, whatever the team size, and reset at the start of each billing period. For now the allowance is a hard cap — when you hit it, AI screening pauses until the period resets or you move up a plan. We are not billing for overage yet; pay-as-you-go overage is planned, and we will tell you before it starts.',
  },
  {
    q: 'Is pricing per seat?',
    a: 'Not during early access. Each plan is a single flat monthly rate that covers your whole team. We may introduce per-seat pricing later; if we do, existing subscribers will hear from us before anything changes.',
  },
  {
    q: 'Can I cancel any time?',
    a: 'Yes. Monthly plans cancel at the end of the current billing cycle. Annual plans cancel at renewal — you keep access for the full term you paid for.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. RecruitedAI is multi-tenant with Postgres row-level security on every table. We are POPIA-aligned and offer a DPA on request for Scale customers. CVs are stored encrypted at rest in Supabase Storage.',
  },
  {
    q: 'Why ZAR pricing for South Africa?',
    a: 'We are based in South Africa and want the product accessible to local agencies. ZAR pricing is set at purchasing-power parity, not just a currency conversion. Available to customers with a South African billing address.',
  },
  {
    q: 'Does this replace my existing ATS?',
    a: 'No — it sits alongside Bullhorn, Vincere, JobAdder, Workable, or whatever you already use. Export CVs to RecruitedAI, run intelligent screening, take the ranked results back. No integration required.',
  },
];

const valueProps = [
  {
    icon: Sparkles,
    title: 'Explainable, skills-first scoring',
    body: 'Every match shows green skill matches and amber gaps. No black-box scores. Defensible to clients.',
  },
  {
    icon: FileText,
    title: 'Branded CV packs in seconds',
    body: 'Polished, agency-branded candidate PDFs with one click. Stop reformatting CVs by hand.',
  },
  {
    icon: Search,
    title: 'AI sourcing built in',
    body: 'Find companies actively hiring and decision-makers without a separate Apollo or Lusha subscription.',
  },
  {
    icon: Mic,
    title: 'Interview transcript analysis',
    body: 'Drop in a transcript, get structured Q&A and a candidate summary. Stop typing notes during calls.',
  },
];

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
          <Link href="/signup?plan=agency">
            <Button size="sm">Start free trial</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t mt-24 bg-muted/30">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm text-muted-foreground">
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
            <li><Link href="/signup?plan=agency" className="hover:text-primary">Start free trial</Link></li>
            <li><Link href="/login" className="hover:text-primary">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-2">Legal</p>
          <ul className="space-y-1">
            <li><Link href="/terms" className="hover:text-primary">Terms of Service</Link></li>
            <li><Link href="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
            <li><Link href="/refunds" className="hover:text-primary">Refund Policy</Link></li>
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

interface PlanCardProps {
  plan: Plan;
  currency: Currency;
  cycle: BillingCycle;
}

function PlanCard({ plan, currency, cycle }: PlanCardProps) {
  const price = getPrice(plan, currency, cycle);
  const savings = cycle === 'annual' ? annualSavingsPercent(plan, currency) : null;

  return (
    <Card
      className={cn(
        'flex flex-col h-full relative',
        plan.highlight && 'border-primary shadow-xl ring-2 ring-primary'
      )}
    >
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground border-primary px-3 py-1">
            <Star className="h-3 w-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
        <CardDescription className="text-xs">{plan.tagline}</CardDescription>
        <div className="mt-4">
          {price === null ? (
            <div className="text-4xl font-extrabold">Free</div>
          ) : (
            <>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-extrabold">
                  {formatPrice(price, currency)}
                </span>
                <span className="text-sm text-muted-foreground">
                  /{plan.perSeat ? 'seat/mo' : 'mo'}
                </span>
              </div>
              {cycle === 'annual' && savings !== null && savings > 0 && (
                <p className="text-xs text-green-600 mt-1 font-medium">
                  Save {savings}% billed annually
                </p>
              )}
              {plan.perSeat && plan.minimumSeats && plan.minimumSeats > 1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  From {formatPrice(price * plan.minimumSeats, currency)}/mo · {plan.minimumSeats} seats min.
                </p>
              )}
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-grow">
        <ul className="space-y-2.5">
          {getPlanFeatures(plan, currency).map((feature) => (
            <li key={feature} className="flex items-start text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          asChild
          className="w-full"
          variant={plan.highlight ? 'default' : 'secondary'}
          size="lg"
        >
          <Link href={plan.ctaHref}>
            {plan.highlight && <Zap className="mr-2 h-4 w-4" />}
            {plan.ctaLabel}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function PricingPage() {
  const { user, isAuthenticated } = useAuth();
  const { data: company } = useCompany(user?.companyId);
  const [currency, setCurrency] = useState<Currency>('ZAR');
  const [cycle, setCycle] = useState<BillingCycle>('annual');
  const [currencyTouched, setCurrencyTouched] = useState(false);

  // A logged-in tenant's saved company currency wins; anonymous visitors fall
  // back to locale detection. A manual toggle overrides both for this session.
  useEffect(() => {
    if (currencyTouched) return;
    setCurrency(company?.currency ?? detectDefaultCurrency());
  }, [company?.currency, currencyTouched]);

  const onCurrencyChange = (value: string) => {
    const next = value === 'ZAR' ? 'ZAR' : 'USD';
    setCurrencyTouched(true);
    setCurrency(next);
    persistCurrency(next);
  };

  const headlinePrice = useMemo(() => {
    const agency = agencyPlans.find((p) => p.id === 'agency')!;
    return formatPrice(getPrice(agency, currency, cycle) ?? 0, currency);
  }, [currency, cycle]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {!isAuthenticated && <MarketingHeader />}

      <main className="flex-1">
        {/* Hero */}
        <section className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <Badge variant="outline" className="mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            Skills-first AI screening
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Screen 200 CVs in the time it takes to read 10.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Explainable, skills-first scoring for recruitment agencies. From {headlinePrice}/month.
            Works alongside any ATS — no integration required.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup?plan=agency">
              <Button size="lg" className="h-12 px-8">
                <Zap className="mr-2 h-5 w-5" />
                Start 7-day free trial
              </Button>
            </Link>
            <Link href="#plans">
              <Button size="lg" variant="outline" className="h-12 px-8">
                Compare plans
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card · Cancel anytime · POPIA &amp; GDPR aligned
          </p>
        </section>

        {/* Value props */}
        <section className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {valueProps.map((vp) => (
              <div
                key={vp.title}
                className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow"
              >
                <vp.icon className="h-6 w-6 text-primary mb-3" />
                <h3 className="font-semibold text-sm">{vp.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{vp.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Plans */}
        <section id="plans" className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-8 pb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold">For recruitment agencies</h2>
            <p className="text-muted-foreground mt-2">
              One flat monthly rate per plan during early access — no per-seat charges. Cancel any time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Tabs value={cycle} onValueChange={(v) => setCycle(v as BillingCycle)}>
              <TabsList>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="annual">
                  Annual <Badge variant="secondary" className="ml-2 text-[10px]">Save ~17%</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={currency} onValueChange={onCurrencyChange}>
              <TabsList>
                <TabsTrigger value="USD">USD ($)</TabsTrigger>
                <TabsTrigger value="ZAR">ZAR (R)</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-stretch mt-6">
            {agencyPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} currency={currency} cycle={cycle} />
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8 max-w-2xl mx-auto">
            All agency plans include unlimited jobs, unlimited candidates, and unlimited team members.
            AI features are metered to prevent abuse — each plan&apos;s monthly allowance is a hard cap for
            now, and we will tell you before any pay-as-you-go overage billing starts.
          </p>
        </section>

        {/* Candidate section */}
        <section className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 border-t">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-2">
              <Users className="h-3 w-3 mr-1" />
              Job seekers
            </Badge>
            <h2 className="text-2xl font-bold">For candidates building their career</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              AI resume tailoring, mock interview prep, and a beautiful online profile.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {candidatePlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} currency={currency} cycle={cycle} />
            ))}
          </div>
        </section>

        {/* Trust strip */}
        <section className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 border-t">
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            <div>
              <ShieldCheck className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">POPIA &amp; GDPR aligned</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Multi-tenant row-level security. DPA on request.
              </p>
            </div>
            <div>
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Built on Gemini 2.5</h3>
              <p className="text-xs text-muted-foreground mt-1">
                State-of-the-art language model under the hood.
              </p>
            </div>
            <div>
              <Briefcase className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Works with any ATS</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Bullhorn, Vincere, JobAdder, Workable — no integration needed.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 border-t">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={faq.q} value={`item-${i}`}>
                <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold">Ready to screen smarter?</h2>
          <p className="text-muted-foreground mt-3">
            Start your free 7-day Agency trial. No credit card. Cancel any time.
          </p>
          <div className="mt-6">
            <Link href="/signup?plan=agency">
              <Button size="lg" className="h-12 px-8">
                <Zap className="mr-2 h-5 w-5" />
                Start free trial
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {!isAuthenticated && <MarketingFooter />}
    </div>
  );
}
