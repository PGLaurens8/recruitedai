import { requireUserAndCompany } from '@/server/api/auth';
import { writeAuditLog } from '@/server/api/audit';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { id: clientId } = await params;
    if (!clientId) {
      throw new ApiRouteError(400, 'CLIENT_ID_REQUIRED', 'Client ID is required.');
    }

    const { supabase, companyId, userId } = await requireUserAndCompany();
    const { data, error } = await supabase
      .from('clients')
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('id', clientId)
      .not('deleted_at', 'is', null)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'CLIENT_RESTORE_FAILED', 'Could not restore client.', error);
    }
    if (!data) {
      throw new ApiRouteError(404, 'CLIENT_NOT_FOUND', 'Client not found in deleted records.');
    }

    await writeAuditLog(supabase, {
      companyId,
      actorUserId: userId,
      action: 'client.restored',
      targetType: 'client',
      targetId: clientId,
    });

    return jsonSuccess(requestId, { restored: true });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
