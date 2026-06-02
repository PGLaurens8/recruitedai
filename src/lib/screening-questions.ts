// Default screening question template, shared between the candidate profile's
// "Screening Interview Notes" section and the AI Note Taker (interview-analysis).
// Recruiters can override these per-candidate; the overrides are persisted in the
// candidate's `interview_notes` JSONB under the reserved `__questions` key.
export const defaultQuestions = [
  "Brief professional background summary?",
  "What are your primary technical/core skills?",
  "What is your greatest professional achievement?",
  "Why are you leaving your current role?",
  "What are your salary expectations?",
];

// Reserved keys stored inside the `interview_notes` JSONB map alongside the
// per-question answers. Prefixed with `__` so they never collide with a real
// question string used as a key.
export const QUESTIONS_KEY = "__questions";
export const GENERAL_NOTES_KEY = "__general_notes";

/**
 * Parse the per-candidate question list out of an `interviewNotes` map.
 * The list is stored as a JSON-encoded string (the JSONB column is typed as a
 * `Record<string, string>`). Falls back to {@link defaultQuestions} when unset
 * or malformed.
 */
export function parseScreeningQuestions(
  interviewNotes: Record<string, string> | undefined | null,
): string[] {
  const raw = interviewNotes?.[QUESTIONS_KEY];
  if (!raw) {
    return [...defaultQuestions];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((q) => typeof q === "string") && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Malformed payload — fall through to defaults.
  }
  return [...defaultQuestions];
}
