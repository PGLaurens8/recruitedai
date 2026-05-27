import { z } from 'zod';

import { requireUserAndCompany } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

interface OnboardingRow {
  onboarding_completed_steps: string[] | null;
  onboarding_dismissed: boolean | null;
}

function toOnboardingState(row: OnboardingRow | null) {
  return {
    completedSteps: row?.onboarding_completed_steps ?? [],
    dismissed: row?.onboarding_dismissed ?? false,
  };
}

const patchSchema = z
  .object({
    step: z.string().min(1).optional(),
    dismissed: z.boolean().optional(),
  })
  .refine((value) => value.step !== undefined || value.dismissed !== undefined, {
    message: 'Provide a step to complete or a dismissed flag.',
  });

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { supabase, userId } = await requireUserAndCompany();
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed_steps, onboarding_dismissed')
      .eq('id', userId)
      .single();

    if (error) {
      throw new ApiRouteError(500, 'ONBOARDING_QUERY_FAILED', 'Could not load onboarding progress.', error);
    }

    return jsonSuccess(requestId, toOnboardingState(data as OnboardingRow));
  } catch (error) {
    return jsonError(requestId, error);
  }
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { supabase, userId } = await requireUserAndCompany();
    const rawBody = await request.text();
    const parsed = patchSchema.safeParse(JSON.parse(rawBody || '{}'));

    if (!parsed.success) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid onboarding update.', parsed.error.flatten());
    }

    const { step, dismissed } = parsed.data;

    const { data: current, error: loadError } = await supabase
      .from('profiles')
      .select('onboarding_completed_steps, onboarding_dismissed')
      .eq('id', userId)
      .single();

    if (loadError) {
      throw new ApiRouteError(500, 'ONBOARDING_QUERY_FAILED', 'Could not load onboarding progress.', loadError);
    }

    const existingSteps = (current as OnboardingRow)?.onboarding_completed_steps ?? [];
    const update: Record<string, unknown> = {};

    if (step) {
      update.onboarding_completed_steps = existingSteps.includes(step)
        ? existingSteps
        : [...existingSteps, step];
    }
    if (dismissed !== undefined) {
      update.onboarding_dismissed = dismissed;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', userId)
      .select('onboarding_completed_steps, onboarding_dismissed')
      .single();

    if (error) {
      throw new ApiRouteError(500, 'ONBOARDING_UPDATE_FAILED', 'Could not update onboarding progress.', error);
    }

    return jsonSuccess(requestId, toOnboardingState(data as OnboardingRow));
  } catch (error) {
    return jsonError(requestId, error);
  }
}
