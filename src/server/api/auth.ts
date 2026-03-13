import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ApiRouteError } from '@/server/api/http';

export async function requireUserAndCompany(requestedCompanyId?: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ApiRouteError(401, 'UNAUTHORIZED', 'You must be signed in.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.company_id) {
    throw new ApiRouteError(403, 'PROFILE_MISSING', 'User profile could not be resolved.');
  }

  if (requestedCompanyId && profile.company_id !== requestedCompanyId) {
    throw new ApiRouteError(403, 'TENANT_MISMATCH', 'Requested company does not match your account.');
  }

  return {
    supabase,
    userId: user.id,
    companyId: profile.company_id as string,
  };
}

