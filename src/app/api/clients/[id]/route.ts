import { z } from 'zod';

import { requireUserAndCompany, requireUserAndCompanyRole } from '@/server/api/auth';
import { writeAuditLog } from '@/server/api/audit';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const CLIENT_SELECT =
  'id,company_id,name,logo,contact_name,contact_email,website,notes,status,open_jobs,created_at,updated_at';

const updateClientSchema = z
  .object({
    name: z.string().min(1, 'Name is required.').optional(),
    contactName: z.string().optional().nullable(),
    contactEmail: z.string().email().optional().nullable().or(z.literal('')),
    website: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    status: z.enum(['active', 'prospect', 'on hold', 'inactive']).optional(),
  })
  .strict();

export async function GET(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { id: clientId } = await params;
    if (!clientId) {
      throw new ApiRouteError(400, 'CLIENT_ID_REQUIRED', 'Client ID is required.');
    }

    const { supabase, companyId } = await requireUserAndCompany();
    const { data, error } = await supabase
      .from('clients')
      .select(CLIENT_SELECT)
      .eq('company_id', companyId)
      .eq('id', clientId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'CLIENT_QUERY_FAILED', 'Could not load client.', error);
    }
    if (!data) {
      throw new ApiRouteError(404, 'CLIENT_NOT_FOUND', 'Client not found.');
    }

    return jsonSuccess(requestId, data);
  } catch (error) {
    return jsonError(requestId, error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { id: clientId } = await params;
    if (!clientId) {
      throw new ApiRouteError(400, 'CLIENT_ID_REQUIRED', 'Client ID is required.');
    }

    const rawBody = await request.text();
    const parsed = updateClientSchema.safeParse(JSON.parse(rawBody || '{}'));
    if (parsed.success === false) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid client update payload.', parsed.error.flatten());
    }

    const updatePayload: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name;
    if (parsed.data.contactName !== undefined) updatePayload.contact_name = parsed.data.contactName || null;
    if (parsed.data.contactEmail !== undefined) updatePayload.contact_email = parsed.data.contactEmail || null;
    if (parsed.data.website !== undefined) updatePayload.website = parsed.data.website || null;
    if (parsed.data.notes !== undefined) updatePayload.notes = parsed.data.notes || null;
    if (parsed.data.status !== undefined) updatePayload.status = parsed.data.status;

    if (Object.keys(updatePayload).length === 0) {
      throw new ApiRouteError(400, 'NO_UPDATES', 'No client updates were provided.');
    }
    updatePayload.updated_at = new Date().toISOString();

    const { supabase, companyId, userId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Sales', 'Developer']);
    const { data, error } = await supabase
      .from('clients')
      .update(updatePayload)
      .eq('company_id', companyId)
      .eq('id', clientId)
      .is('deleted_at', null)
      .select(CLIENT_SELECT)
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'CLIENT_UPDATE_FAILED', 'Could not update client.', error);
    }
    if (!data) {
      throw new ApiRouteError(404, 'CLIENT_NOT_FOUND', 'Client not found.');
    }

    await writeAuditLog(supabase, {
      companyId,
      actorUserId: userId,
      action: 'client.updated',
      targetType: 'client',
      targetId: clientId,
      metadata: {
        changedFields: Object.keys(updatePayload),
      },
    });

    return jsonSuccess(requestId, data);
  } catch (error) {
    return jsonError(requestId, error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { id: clientId } = await params;
    if (!clientId) {
      throw new ApiRouteError(400, 'CLIENT_ID_REQUIRED', 'Client ID is required.');
    }

    const { supabase, companyId, userId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Sales', 'Developer']);
    const { data, error } = await supabase
      .from('clients')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('id', clientId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'CLIENT_DELETE_FAILED', 'Could not delete client.', error);
    }
    if (!data) {
      throw new ApiRouteError(404, 'CLIENT_NOT_FOUND', 'Client not found.');
    }

    await writeAuditLog(supabase, {
      companyId,
      actorUserId: userId,
      action: 'client.soft_deleted',
      targetType: 'client',
      targetId: clientId,
    });

    return jsonSuccess(requestId, { deleted: true });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
