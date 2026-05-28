'use client';

import Link from 'next/link';
import { AlertTriangle, Clock } from 'lucide-react';

import { useAuth } from '@/context/auth-context';
import { useCompany } from '@/lib/data/hooks';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const TRIAL_LENGTH_MS = 7 * 24 * 60 * 60 * 1000;

export function TrialBanner() {
  const { user } = useAuth();
  const { data: company } = useCompany(user?.companyId);

  if (!company || company.plan !== 'trial' || !company.trialExpiresAt) {
    return null;
  }

  const expiresAt = new Date(company.trialExpiresAt).getTime();
  if (Number.isNaN(expiresAt)) {
    return null;
  }

  const now = Date.now();
  const msRemaining = expiresAt - now;

  if (msRemaining <= 0) {
    return (
      <div
        className={cn(
          'flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4',
          'sm:flex-row sm:items-center sm:justify-between'
        )}
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">Your trial has ended</p>
            <p className="text-sm text-destructive/90">
              Upgrade to continue using AI features.
            </p>
          </div>
        </div>
        <Button variant="destructive" asChild>
          <Link href="/pricing">Upgrade now →</Link>
        </Button>
      </div>
    );
  }

  const daysRemaining = Math.max(1, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
  const startedAt = company.trialStartedAt ? new Date(company.trialStartedAt).getTime() : expiresAt - TRIAL_LENGTH_MS;
  const totalMs = Math.max(expiresAt - startedAt, TRIAL_LENGTH_MS);
  const elapsedPercent = Math.min(100, Math.max(0, ((totalMs - msRemaining) / totalMs) * 100));

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3 flex-1">
        <Clock className="mt-0.5 h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="font-semibold text-foreground">
            {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining in your free trial
          </p>
          <Progress value={elapsedPercent} className="mt-2 h-1.5" />
        </div>
      </div>
      <Button asChild>
        <Link href="/pricing">Upgrade now →</Link>
      </Button>
    </div>
  );
}
