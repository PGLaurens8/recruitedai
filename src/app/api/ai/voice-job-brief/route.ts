import { z } from 'zod';

import { requireUserAndCompanyRole } from '@/server/api/auth';
import { getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { parseVoiceJobBrief } from '@/ai/flows/voiceJobBriefFlow';

const voiceJobBriefSchema = z.object({
  transcript: z.string().min(1),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Sales', 'Developer']);
    const payload = voiceJobBriefSchema.parse(await request.json());
    const parsed = await parseVoiceJobBrief(payload);
    return jsonSuccess(requestId, parsed);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
