import { type Role } from '@/lib/roles';

export const publicPaths = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/invite'] as const;

// "Open" paths are viewable by everyone — both signed-out visitors and
// signed-in users — and are NOT auth pages, so signed-in users must NOT be
// redirected away from them (unlike `publicPaths`). Matched by prefix.
// `/resume/` is the public shareable candidate resume viewer; `/api/resume/`
// is its data endpoint.
export const openPathPrefixes = ['/resume/', '/api/resume/'] as const;

// Marketing and legal/policy pages — visible to everyone, exact or sub-path
// match. Kept separate from `openPathPrefixes` so the bare prefix like
// `/pricing` doesn't accidentally match `/pricing-foo`.
export const marketingPaths = ['/pricing', '/terms', '/privacy', '/refunds'] as const;

const rolePathRules: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: '/dashboard/admin', roles: ['Admin', 'Developer', 'Recruiter', 'Sales'] },
  { prefix: '/dashboard/recruiter', roles: ['Recruiter'] },
  { prefix: '/dashboard/sales', roles: ['Sales'] },
  { prefix: '/dashboard', roles: ['Candidate'] },
  { prefix: '/candidates', roles: ['Admin', 'Recruiter', 'Developer'] },
  { prefix: '/ai-parser', roles: ['Admin', 'Recruiter', 'Developer'] },
  { prefix: '/interview-analysis', roles: ['Admin', 'Recruiter', 'Developer'] },
  { prefix: '/candidate-profiles', roles: ['Admin', 'Recruiter', 'Developer'] },
  { prefix: '/jobs', roles: ['Admin', 'Recruiter', 'Sales', 'Developer'] },
  { prefix: '/clients', roles: ['Admin', 'Recruiter', 'Sales', 'Developer'] },
  { prefix: '/company-finder', roles: ['Admin', 'Sales', 'Developer'] },
  { prefix: '/master-resume', roles: ['Admin', 'Candidate', 'Developer'] },
  { prefix: '/targeted-resume', roles: ['Candidate', 'Developer'] },
  { prefix: '/online-resume', roles: ['Candidate', 'Developer'] },
  { prefix: '/linktree-bio', roles: ['Candidate', 'Developer'] },
  { prefix: '/interview-prep', roles: ['Admin', 'Candidate', 'Recruiter', 'Developer'] },
  { prefix: '/reports', roles: ['Admin', 'Sales', 'Developer'] },
  { prefix: '/settings', roles: ['Admin', 'Developer'] },
  { prefix: '/team', roles: ['Admin', 'Developer'] },
  { prefix: '/debug', roles: ['Admin', 'Developer'] },
];

export function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname === path);
}

export function isOpenPath(pathname: string) {
  if (openPathPrefixes.some((prefix) => pathname.startsWith(prefix))) return true;
  return marketingPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function getDefaultRouteForRole(role: Role) {
  switch (role) {
    case 'Admin':
    case 'Developer':
      return '/dashboard/admin';
    case 'Recruiter':
      return '/dashboard/recruiter';
    case 'Sales':
      return '/dashboard/sales';
    case 'Candidate':
    default:
      return '/dashboard';
  }
}

export function isRoleAllowedForPath(role: Role, pathname: string) {
  const matchingRule = rolePathRules.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!matchingRule) {
    return true;
  }

  return matchingRule.roles.includes(role);
}
