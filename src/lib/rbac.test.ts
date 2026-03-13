import { describe, expect, it } from 'vitest';

import { getDefaultRouteForRole, isPublicPath, isRoleAllowedForPath } from './rbac';

describe('rbac', () => {
  it('returns expected default dashboard route by role', () => {
    expect(getDefaultRouteForRole('Admin')).toBe('/dashboard/admin');
    expect(getDefaultRouteForRole('Developer')).toBe('/dashboard/admin');
    expect(getDefaultRouteForRole('Recruiter')).toBe('/dashboard/recruiter');
    expect(getDefaultRouteForRole('Sales')).toBe('/dashboard/sales');
    expect(getDefaultRouteForRole('Candidate')).toBe('/dashboard');
  });

  it('matches public paths exactly', () => {
    expect(isPublicPath('/')).toBe(true);
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/signup')).toBe(true);
    expect(isPublicPath('/login/reset')).toBe(false);
    expect(isPublicPath('/dashboard')).toBe(false);
  });

  it('enforces role access on path prefixes', () => {
    expect(isRoleAllowedForPath('Recruiter', '/dashboard/admin')).toBe(true);
    expect(isRoleAllowedForPath('Candidate', '/dashboard/admin')).toBe(false);
    expect(isRoleAllowedForPath('Sales', '/company-finder')).toBe(true);
    expect(isRoleAllowedForPath('Recruiter', '/company-finder')).toBe(false);
    expect(isRoleAllowedForPath('Admin', '/settings')).toBe(true);
    expect(isRoleAllowedForPath('Sales', '/settings')).toBe(false);
    expect(isRoleAllowedForPath('Candidate', '/dashboard/sales')).toBe(false);
  });

  it('inherits permissions for nested routes', () => {
    expect(isRoleAllowedForPath('Recruiter', '/candidates/abc123')).toBe(true);
    expect(isRoleAllowedForPath('Candidate', '/candidates/abc123')).toBe(false);
  });

  it('allows unknown routes by default', () => {
    expect(isRoleAllowedForPath('Candidate', '/some-future-page')).toBe(true);
  });
});
