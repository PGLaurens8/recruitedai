'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CreditCard, ExternalLink, Mail, Sparkles, Zap } from 'lucide-react';

import { useAuth } from '@/context/auth-context';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  detectDefaultCurrency,
  persistCurrency,
  formatPrice,
  type Currency,
} from '@/lib/locale';
import {
  agencyPlans,
  candidatePlans,
  getPrice,
  annualSavingsPercent,
  type BillingCycle,
  type Plan,
} from '@/lib/pricing';

const agencyRoles = ['Admin', 'Recruiter', 'Sales', 'Developer'] as const;

interface InAppPlanCardProps {
  plan: Plan;
  currency: Currency;
  cycle: BillingCycle;
  isCurrent: boolean;
}

function InAppPlanCard({ plan, currency, cycle, isCurrent }: InAppPlanCardProps) {
  const price = getPrice(plan, currency, cycle);
  const savings = cycle === 'annual' ? annualSavingsPercent(plan, currency) : null;

  return (
    <Card
      className={cn(
        'flex flex-col h-full relative',
        plan.highlight && !isCurrent && 'border-primary shadow-lg ring-2 ring-primary',
        isCurrent && 'border-green-500 ring-2 ring-green-500'
      )}
    >
      {plan.highlight && !isCurrent && (
        <div className="py-1.5 px-3 bg-primary text-primary-foreground text-xs font-semibold text-center rounded-t-lg">
          Most popular
        </div>
      )}
      {isCurrent && (
        <div className="py-1.5 px-3 bg-green-500 text-white text-xs font-semibold text-center rounded-t-lg">
          Your current plan
        </div>
      )}

      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription className="text-xs">{plan.tagline}</CardDescription>
        <div className="mt-3">
          {price === null ? (
            <div className="text-3xl font-extrabold">Free</div>
          ) : (
            <>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-extrabold">{formatPrice(price, currency)}</span>
                <span className="text-sm text-muted-foreground">
                  /{plan.audience === 'agency' ? 'seat/mo' : 'mo'}
                </span>
              </div>
              {cycle === 'annual' && savings !== null && savings > 0 && (
                <p className="text-xs text-green-600 mt-1 font-medium">
                  Save {savings}% annually
                </p>
              )}
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-grow">
        <ul className="space-y-2 text-sm">
          {plan.features.slice(0, 6).map((f) => (
            <li key={f} className="flex items-start">
              <span className="text-green-500 mr-2 mt-0.5">•</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          asChild
          className="w-full"
          variant={isCurrent ? 'outline' : plan.highlight ? 'default' : 'secondary'}
          disabled={isCurrent}
        >
          {isCurrent ? (
            <span>Active plan</span>
          ) : (
            <Link href={plan.ctaHref}>
              {plan.highlight && <Zap className="mr-2 h-4 w-4" />}
              {plan.ctaLabel.startsWith('Start') ? 'Switch to this plan' : plan.ctaLabel}
            </Link>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function BillingPage() {
  const { user } = useAuth();
  const [currency, setCurrency] = useState<Currency>('USD');
  const [cycle, setCycle] = useState<BillingCycle>('annual');

  useEffect(() => {
    setCurrency(detectDefaultCurrency());
  }, []);

  const isAgencyUser = user?.role && (agencyRoles as readonly string[]).includes(user.role);
  const plans = isAgencyUser ? agencyPlans : candidatePlans;
  const currentPlanId = isAgencyUser ? 'starter' : 'candidate-free';

  const onCurrencyChange = (value: string) => {
    const next = value === 'ZAR' ? 'ZAR' : 'USD';
    setCurrency(next);
    persistCurrency(next);
  };

  return (
    <div className="container mx-auto max-w-6xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Plans &amp; billing</h1>
        <p className="mt-1 text-muted-foreground">
          {isAgencyUser
            ? 'Manage your agency subscription and team usage.'
            : 'Manage your subscription and account.'}
        </p>
      </div>

      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertTitle>Self-serve billing is coming soon</AlertTitle>
        <AlertDescription>
          Stripe checkout is being wired up. For now, choose a plan below and our team will activate
          your subscription within one business day. To upgrade immediately,{' '}
          <a href="mailto:billing@recruitedai.com" className="underline font-medium">
            email billing
          </a>
          .
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base">Current plan</CardTitle>
            <CardDescription>
              {isAgencyUser ? 'Starter (trial)' : 'Candidate Free'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild size="sm">
              <Link href="/pricing">
                <ExternalLink className="h-4 w-4 mr-1" />
                View public pricing
              </Link>
            </Button>
            <Button variant="ghost" asChild size="sm">
              <a href="mailto:billing@recruitedai.com">
                <Mail className="h-4 w-4 mr-1" />
                Contact billing
              </a>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">
          {isAgencyUser ? 'Agency plans' : 'Candidate plans'}
        </h2>
        <div className="flex items-center gap-3">
          <Tabs value={cycle} onValueChange={(v) => setCycle(v as BillingCycle)}>
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="annual">
                Annual <Badge variant="secondary" className="ml-1.5 text-[10px]">−17%</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={currency} onValueChange={onCurrencyChange}>
            <TabsList>
              <TabsTrigger value="USD">USD</TabsTrigger>
              <TabsTrigger value="ZAR">ZAR</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div
        className={cn(
          'grid gap-6 items-stretch',
          plans.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 max-w-3xl mx-auto'
        )}
      >
        {plans.map((plan) => (
          <InAppPlanCard
            key={plan.id}
            plan={plan}
            currency={currency}
            cycle={cycle}
            isCurrent={plan.id === currentPlanId}
          />
        ))}
      </div>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment method
          </CardTitle>
          <CardDescription>
            No payment method on file. You will be prompted to enter card details when you choose a paid plan.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
