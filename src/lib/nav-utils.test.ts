import { describe, expect, it } from 'vitest';

import { getNavLinksForRole, isNavLinkActive } from './nav-utils';

function flattenHrefs(role: Parameters<typeof getNavLinksForRole>[0]) {
  return getNavLinksForRole(role).flatMap((group) => group.links.map((link) => link.href));
}

describe('nav-utils', () => {
  it('keeps agency overview visible for recruiter and sales', () => {
    expect(flattenHrefs('Recruiter')).toContain('/dashboard/admin');
    expect(flattenHrefs('Sales')).toContain('/dashboard/admin');
  });

  it('shows role-specific dashboard links', () => {
    expect(flattenHrefs('Recruiter')).toContain('/dashboard/recruiter');
    expect(flattenHrefs('Recruiter')).not.toContain('/dashboard/sales');
    expect(flattenHrefs('Sales')).toContain('/dashboard/sales');
    expect(flattenHrefs('Sales')).not.toContain('/dashboard/recruiter');
  });

  it('hides unauthorized links from candidate navigation', () => {
    const candidateLinks = flattenHrefs('Candidate');
    expect(candidateLinks).not.toContain('/dashboard/admin');
    expect(candidateLinks).not.toContain('/settings');
    expect(candidateLinks).toContain('/dashboard');
  });

  it('marks parent links active for nested paths', () => {
    expect(isNavLinkActive('/candidates', '/candidates')).toBe(true);
    expect(isNavLinkActive('/candidates/123', '/candidates')).toBe(true);
    expect(isNavLinkActive('/dashboard/admin', '/dashboard')).toBe(true);
    expect(isNavLinkActive('/clients', '/candidates')).toBe(false);
  });
});
