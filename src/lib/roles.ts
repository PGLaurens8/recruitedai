export const ROLE_VALUES = ['Admin', 'Recruiter', 'Sales', 'Candidate', 'Developer'] as const;

export type Role = (typeof ROLE_VALUES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && ROLE_VALUES.includes(value as Role);
}

export function normalizeRole(value: unknown, fallback: Role = 'Recruiter'): Role {
  return isRole(value) ? value : fallback;
}
