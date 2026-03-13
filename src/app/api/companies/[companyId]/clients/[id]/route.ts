import { requireUserAndCompany } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ companyId: string; id: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const { companyId, id } = await context.params;
    const { supabase } = await requireUserAndCompany(companyId);
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('company_id', companyId)
      .eq('id', id);

    if (error) {
      throw new ApiRouteError(500, 'CLIENT_DELETE_FAILED', error.message);
    }

    return jsonSuccess(requestId, { id });
  } catch (error) {
    return jsonError(requestId, error);
  }
}

