import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Lightweight LLMOps logging layer. Records one row per AI flow invocation in
 * the `ai_logs` table (latency, estimated token usage, estimated cost, and
 * success/failure) so the admin dashboard can surface usage and cost trends.
 *
 * Hard rule: logging must NEVER throw or affect the main flow. Every write is
 * wrapped in try/catch and failures are swallowed after a console.error.
 */

// Gemini 2.5 Flash public pricing (USD per 1M tokens). These feed cost
// estimates only — they are not billing-grade figures.
const INPUT_COST_PER_TOKEN = 0.3 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 2.5 / 1_000_000;

/**
 * Rough token estimate: ~1 token ≈ 4 characters. Cheap and dependency-free —
 * good enough for cost/usage trend monitoring, not for exact billing.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Estimate USD cost for a call from its token estimates, using Gemini 2.5 Flash
 * pricing. Returns a value rounded to 6 decimal places to match the table's
 * numeric(10,6) column.
 */
export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  const cost = inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export interface LogAICallParams {
  companyId: string;
  userId: string;
  flowName: string;
  durationMs: number;
  inputTokenEstimate?: number;
  outputTokenEstimate?: number;
  success: boolean;
  // Error code when success is false. AI provider outages flow through here as
  // 'AI_PROVIDER_UNAVAILABLE' (the routes pass `ApiRouteError.code`), so outage
  // frequency can be tracked over time by querying ai_logs for that code.
  errorCode?: string;
  requestId?: string;
}

/**
 * Insert a single AI usage record. Best-effort: never throws, never blocks the
 * caller's result. Uses the service-role client because the `ai_logs` table is
 * insert-locked under RLS (only the service role may write).
 */
export async function logAICall(params: LogAICallParams): Promise<void> {
  try {
    const inputTokens = params.inputTokenEstimate ?? 0;
    const outputTokens = params.outputTokenEstimate ?? 0;
    const estimatedCostUsd =
      params.inputTokenEstimate === undefined && params.outputTokenEstimate === undefined
        ? null
        : estimateCostUsd(inputTokens, outputTokens);

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from('ai_logs').insert({
      company_id: params.companyId,
      user_id: params.userId,
      flow_name: params.flowName,
      duration_ms: params.durationMs,
      estimated_input_tokens: params.inputTokenEstimate ?? null,
      estimated_output_tokens: params.outputTokenEstimate ?? null,
      estimated_cost_usd: estimatedCostUsd,
      success: params.success,
      error_code: params.errorCode ?? null,
      request_id: params.requestId ?? null,
    });

    if (error) {
      console.error('[ai-logger] failed to write ai_logs row', {
        flowName: params.flowName,
        requestId: params.requestId,
        message: error.message,
      });
    }
  } catch (cause) {
    // Swallow everything — observability must not break the user-facing flow.
    console.error('[ai-logger] unexpected error writing ai_logs row', {
      flowName: params.flowName,
      requestId: params.requestId,
      message: cause instanceof Error ? cause.message : String(cause),
    });
  }
}
