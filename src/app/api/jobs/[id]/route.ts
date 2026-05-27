import { z } from 'zod';

import { requireUserAndCompanyRole } from '@/server/api/auth';
import { writeAuditLog } from '@/server/api/audit';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const updateJobSchema = z.object({
  title: z.string().min(1).optional(),
  salary: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  status: z.enum(['draft', 'active', 'pending', 'closed']).optional(),
  approval: z.enum(['approved', 'pending', 'rejected']).optional(),
  description: z.string().nullable().optional(),
  // `null` explicitly unlinks the job from its client; omitting it leaves the link untouched.
  clientId: z.string().uuid().nullable().optional(),
});

export async function PATCH(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { id: jobId } = await params;
    if (!jobId) {
      throw new ApiRouteError(400, 'JOB_ID_REQUIRED', 'Job ID is required.');
    }

    const parsed = updateJobSchema.safeParse(JSON.parse((await request.text()) || '{}'));
    if (parsed.success === false) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid job update payload.', parsed.error.flatten());
    }

    const { supabase, companyId, userId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Sales', 'Developer']);

    // Verify a newly-linked client belongs to this company before trusting it.
    if (parsed.data.clientId) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('company_id', companyId)
        .eq('id', parsed.data.clientId)
        .is('deleted_at', null)
        .maybeSingle();

      if (clientError) {
        throw new ApiRouteError(500, 'CLIENT_LOOKUP_FAILED', 'Could not verify client.', clientError);
      }
      if (!client) {
        throw new ApiRouteError(404, 'CLIENT_NOT_FOUND', 'Linked client does not exist for this company.');
      }
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.salary !== undefined) updates.salary = parsed.data.salary;
    if (parsed.data.company !== undefined) updates.company = parsed.data.company;
    if (parsed.data.location !== undefined) updates.location = parsed.data.location;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.approval !== undefined) updates.approval = parsed.data.approval;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.clientId !== undefined) updates.client_id = parsed.data.clientId;

    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('company_id', companyId)
      .eq('id', jobId)
      .is('deleted_at', null)
      .select('*')
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'JOB_UPDATE_FAILED', 'Could not update job.', error);
    }
    if (!data) {
      throw new ApiRouteError(404, 'JOB_NOT_FOUND', 'Job not found.');
    }

    await writeAuditLog(supabase, {
      companyId,
      actorUserId: userId,
      action: 'job.updated',
      targetType: 'job',
      targetId: jobId,
    });

    return jsonSuccess(requestId, data);
  } catch (error) {
    return jsonError(requestId, error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { id: jobId } = await params;
    if (!jobId) {
      throw new ApiRouteError(400, 'JOB_ID_REQUIRED', 'Job ID is required.');
    }

    const { supabase, companyId, userId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Sales', 'Developer']);
    const { data, error } = await supabase
      .from('jobs')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('id', jobId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'JOB_DELETE_FAILED', 'Could not delete job.', error);
    }
    if (!data) {
      throw new ApiRouteError(404, 'JOB_NOT_FOUND', 'Job not found.');
    }

    await writeAuditLog(supabase, {
      companyId,
      actorUserId: userId,
      action: 'job.soft_deleted',
      targetType: 'job',
      targetId: jobId,
    });

    return jsonSuccess(requestId, { deleted: true });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
