import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { acceptCompanyInvite } from '@/server/api/company-invites';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Invite token is required.'),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const payload = acceptInviteSchema.parse(await request.json());
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError != null || user == null || user.email == null) {
      throw new ApiRouteError(401, 'UNAUTHORIZED', 'You must be signed in to accept an invite.');
    }

    const result = await acceptCompanyInvite(user.id, user.email, payload.token);
    return jsonSuccess(requestId, result);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
