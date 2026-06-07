// Internal/developer-only surfaces (Strategy & About page, the Developer
// settings tab) are gated on a specific account email rather than a role, so
// access follows this person regardless of whatever role their account is
// assigned. Keep this in sync wherever internal-only UI is conditionally shown.
export const INTERNAL_USER_EMAIL = 'pgl.baobab@gmail.com';

export function isInternalUser(email: string | undefined | null): boolean {
  return (email ?? '').toLowerCase() === INTERNAL_USER_EMAIL;
}
