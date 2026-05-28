'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { subscribeTrialLimit } from '@/lib/error-handler';

// Mounted once in ClientLayout. Listens for the trial-limit-reached event
// dispatched by the fetch helpers and surfaces a toast with an upgrade CTA.
export function TrialLimitListener() {
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    return subscribeTrialLimit((detail) => {
      toast({
        variant: 'destructive',
        title: 'Plan limit reached — upgrade to continue',
        description: detail.feature
          ? `You have hit your ${detail.plan ?? 'trial'} limit for this feature.`
          : 'You have reached your plan limit for this feature.',
        action: (
          <ToastAction altText="Upgrade" onClick={() => router.push('/pricing')}>
            Upgrade
          </ToastAction>
        ),
      });
    });
  }, [toast, router]);

  return null;
}
