import { requireUserAndCompanyRole } from '@/server/api/auth';
import { writeAuditLog } from '@/server/api/audit';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

export async function POST(
  request: Request,
  context: { params: Promise<{ companyId: string; id: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const { companyId, id } = await context.params;
    const { supabase, userId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Sales', 'Developer'], companyId);
    const { data, error } = await supabase
      .from('clients')
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('id', id)
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
      targetId: id,
    });

    return jsonSuccess(requestId, { restored: true });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
