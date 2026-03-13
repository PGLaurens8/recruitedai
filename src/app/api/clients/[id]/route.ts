import { requireUserAndCompany } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { id: clientId } = await params;
    if (!clientId) {
      throw new ApiRouteError(400, 'CLIENT_ID_REQUIRED', 'Client ID is required.');
    }

    const { supabase, companyId } = await requireUserAndCompany();
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('company_id', companyId)
      .eq('id', clientId);

    if (error) {
      throw new ApiRouteError(500, 'CLIENT_DELETE_FAILED', 'Could not delete client.', error);
    }

    return jsonSuccess(requestId, { deleted: true });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
