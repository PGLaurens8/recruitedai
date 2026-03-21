import { requireUserAndCompanyRole } from '@/server/api/auth';
import { getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { enforceRateLimit } from '@/server/api/rate-limit';
import { listAvailableModels } from '@/ai/flows/list-models';

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { userId } = await requireUserAndCompanyRole(['Admin', 'Developer']);
await enforceRateLimit(request, {
      scope: 'ai:list-models',
      subject: userId,
      limit: 10,
      windowMs: 60_000,
    });

    const result = await listAvailableModels();
    return jsonSuccess(requestId, result);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
