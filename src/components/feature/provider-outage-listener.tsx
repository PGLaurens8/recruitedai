'use client';

import { useEffect } from 'react';

import { useToast } from '@/hooks/use-toast';
import { subscribeProviderOutage } from '@/lib/error-handler';

// Mounted once in ClientLayout. Listens for the AI-provider-outage event
// dispatched by the fetch helpers and surfaces a non-destructive warning toast.
// Unlike the trial-limit toast, this carries NO upgrade CTA — it's a transient
// provider outage, not a plan boundary.
export function ProviderOutageListener() {
  const { toast } = useToast();

  useEffect(() => {
    return subscribeProviderOutage(() => {
      toast({
        variant: 'warning',
        title: 'AI temporarily unavailable',
        description: 'AI temporarily unavailable — please try again in a few minutes',
      });
    });
  }, [toast]);

  return null;
}
