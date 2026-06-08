import { requireUserAndCompanyRole } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

export interface AiStats {
  totalCalls: number;
  estimatedCostUsd: number;
  mostUsedFlow: string | null;
  averageDurationMs: number;
  /** ISO timestamp of the start of the calendar month these stats cover. */
  periodStart: string;
}

/** First instant of the current calendar month, in UTC. */
function currentMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    // Only company admins (and developers) see usage/cost data.
    const { supabase, companyId } = await requireUserAndCompanyRole(['Admin', 'Developer']);

    const periodStart = currentMonthStart();

    // RLS already scopes to the caller's company; the explicit company_id filter
    // is defense-in-depth and keeps the query intent obvious.
    const { data, error } = await supabase
      .from('ai_logs')
      .select('flow_name, duration_ms, estimated_cost_usd')
      .eq('company_id', companyId)
      .gte('created_at', periodStart.toISOString());

    if (error) {
      throw new ApiRouteError(500, 'AI_STATS_QUERY_FAILED', 'Could not load AI usage stats.', error);
    }

    const rows = data ?? [];
    const totalCalls = rows.length;

    const estimatedCostUsd = rows.reduce(
      (sum, row) => sum + (Number(row.estimated_cost_usd) || 0),
      0
    );

    const totalDuration = rows.reduce((sum, row) => sum + (Number(row.duration_ms) || 0), 0);
    const averageDurationMs = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

    // Most-used flow by call count.
    const flowCounts = new Map<string, number>();
    for (const row of rows) {
      const name = row.flow_name as string;
      flowCounts.set(name, (flowCounts.get(name) ?? 0) + 1);
    }
    let mostUsedFlow: string | null = null;
    let mostUsedCount = 0;
    for (const [name, count] of flowCounts) {
      if (count > mostUsedCount) {
        mostUsedFlow = name;
        mostUsedCount = count;
      }
    }

    const stats: AiStats = {
      totalCalls,
      // Round to 4dp for display; the underlying column stores 6dp.
      estimatedCostUsd: Math.round(estimatedCostUsd * 10_000) / 10_000,
      mostUsedFlow,
      averageDurationMs,
      periodStart: periodStart.toISOString(),
    };

    return jsonSuccess(requestId, stats);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
