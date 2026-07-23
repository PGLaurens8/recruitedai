/**
 * Regression guard for signup role-injection (privilege escalation).
 *
 * History this test exists to prevent repeating:
 *   - 202603120001_core_schema.sql set profiles.role from client-supplied
 *     `raw_user_meta_data->>'role'`.
 *   - 202604260007_fix_role_injection.sql fixed it (derive from account_type).
 *   - 202607110022_company_currency.sql SILENTLY REVERTED the fix while adding
 *     currency handling — reopening the hole.
 *   - 202607230023_restore_role_from_account_type.sql re-fixed it.
 *
 * The exploit: `supabase.auth.signUp({ options: { data: { role: 'Admin' } } })`
 * (reachable with only the public anon key) flows into profiles.role via the
 * handle_new_user() trigger. API RBAC (requireUserAndCompanyRole) trusts
 * profiles.role as the sole authority, so the injected role takes effect end to
 * end. profiles.role is CHECK-constrained to the five valid roles, so lowercase
 * 'admin'/'owner' would be rejected — but the exact strings 'Admin' and
 * 'Developer' are valid and grant elevated access.
 *
 * There is no Postgres in the unit-test harness, so we assert against the SQL
 * that actually ships: we resolve the EFFECTIVE handle_new_user() definition
 * (the last `create or replace` across migrations, applied in filename order)
 * and assert its role assignment is derived from account_type, never read from
 * user metadata. This is the check that would have caught the silent revert —
 * it is a change to the SQL, invisible to any logic-level mock.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

/**
 * Return the body of the LAST `create or replace function ... handle_new_user()`
 * across all migrations in apply order — i.e. the definition that is live after
 * every migration has run.
 */
function effectiveHandleNewUserBody(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // timestamped prefixes sort chronologically = apply order

  // Match each function definition body between the AS $$ ... $$ delimiters.
  const defRegex =
    /create\s+or\s+replace\s+function\s+public\.handle_new_user\s*\([^)]*\)[\s\S]*?as\s*\$\$([\s\S]*?)\$\$/gi;

  let lastBody: string | null = null;
  let lastFile: string | null = null;

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    let match: RegExpExecArray | null;
    while ((match = defRegex.exec(sql)) !== null) {
      lastBody = match[1];
      lastFile = file;
    }
    defRegex.lastIndex = 0;
  }

  if (!lastBody) {
    throw new Error('No handle_new_user() definition found in supabase/migrations.');
  }
  // Surface which migration is authoritative if the assertions fail.
  return `-- effective definition from: ${lastFile}\n${lastBody}`;
}

describe('signup role assignment (privilege-escalation guard)', () => {
  const body = effectiveHandleNewUserBody();

  it('does NOT read role from client-supplied user metadata', () => {
    // The vulnerable pattern in both the original schema and the reverted
    // currency migration. Any whitespace variant of `raw_user_meta_data ->> 'role'`.
    const readsRoleFromMetadata =
      /raw_user_meta_data\s*->>\s*'role'/i.test(body);

    expect(
      readsRoleFromMetadata,
      "handle_new_user() must not source profiles.role from raw_user_meta_data->>'role' — " +
        'that is the signup role-injection hole. Derive role from account_type instead. ' +
        `\n\n${body}`
    ).toBe(false);
  });

  it('derives role from account_type (company -> Admin, otherwise Candidate)', () => {
    // The role expression must key off account_type, not metadata.
    const derivesFromAccountType =
      /account_type_val\s*=\s*'company'\s+then\s+'Admin'/i.test(body) &&
      /else\s+'Candidate'/i.test(body);

    expect(
      derivesFromAccountType,
      'handle_new_user() must derive role from account_type ' +
        "(when account_type = 'company' then 'Admin' else 'Candidate'). " +
        `\n\n${body}`
    ).toBe(true);
  });

  it('a crafted signup payload with role=Admin/Developer cannot elevate the profile role', () => {
    // Model what an attacker sends via supabase.auth.signUp options.data.
    // Because the effective trigger never reads role from metadata, none of the
    // sensitive fields below can influence profiles.role.
    const craftedMetadataFields = ["'role'", "'app_metadata'", "'is_admin'", "'permissions'"];

    for (const field of craftedMetadataFields) {
      const reads = new RegExp(`raw_user_meta_data\\s*->>\\s*${field}`, 'i').test(body);
      expect(
        reads,
        `handle_new_user() must not read ${field} from user metadata — it is attacker-controlled at signup.`
      ).toBe(false);
    }

    // And the role written to profiles must be the derived variable, not a
    // metadata expression: the profiles insert should carry `assigned_role`.
    expect(
      /assigned_role/i.test(body),
      'The profiles insert should use the account_type-derived `assigned_role`, ' +
        'not a value pulled from signup metadata.'
    ).toBe(true);
  });
});
