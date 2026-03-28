import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

interface RouteGuardCase {
  file: string;
  patterns: RegExp[];
}

const rootDir = process.cwd();

const routeGuardCases: RouteGuardCase[] = [
  {
    file: 'src/app/api/candidates/route.ts',
    patterns: [/requireUserAndCompany(?:Role)?\(/, /company_id:\s*companyId/],
  },
  {
    file: 'src/app/api/candidates/[id]/route.ts',
    patterns: [/requireUserAndCompany(?:Role)?\(/, /\.eq\('company_id',\s*companyId\)/, /\.is\('deleted_at',\s*null\)/],
  },
  {
    file: 'src/app/api/candidates/[id]/restore/route.ts',
    patterns: [/requireUserAndCompany(?:Role)?\(/, /\.eq\('company_id',\s*companyId\)/, /\.not\('deleted_at',\s*'is',\s*null\)/],
  },
  {
    file: 'src/app/api/candidates/[id]/analysis/route.ts',
    patterns: [/requireUserAndCompany(?:Role)?\(/, /\.eq\('company_id',\s*companyId\)/, /\.is\('deleted_at',\s*null\)/],
  },
  {
    file: 'src/app/api/candidates/[id]/interview/route.ts',
    patterns: [/requireUserAndCompany(?:Role)?\(/, /\.eq\('company_id',\s*companyId\)/, /\.is\('deleted_at',\s*null\)/],
  },
  {
    file: 'src/app/api/clients/route.ts',
    patterns: [/requireUserAndCompany(?:Role)?\(/, /company_id:\s*companyId/],
  },
  {
    file: 'src/app/api/clients/[id]/route.ts',
    patterns: [/requireUserAndCompany(?:Role)?\(/, /\.eq\('company_id',\s*companyId\)/, /\.is\('deleted_at',\s*null\)/],
  },
  {
    file: 'src/app/api/clients/[id]/restore/route.ts',
    patterns: [/requireUserAndCompany(?:Role)?\(/, /\.eq\('company_id',\s*companyId\)/, /\.not\('deleted_at',\s*'is',\s*null\)/],
  },
  {
    file: 'src/app/api/jobs/route.ts',
    patterns: [/requireUserAndCompany(?:Role)?\(/, /company_id:\s*companyId/],
  },
  {
    file: 'src/app/api/jobs/[id]/route.ts',
    patterns: [/requireUserAndCompany(?:Role)?\(/, /\.eq\('company_id',\s*companyId\)/, /\.is\('deleted_at',\s*null\)/],
  },
  {
    file: 'src/app/api/jobs/[id]/restore/route.ts',
    patterns: [/requireUserAndCompany(?:Role)?\(/, /\.eq\('company_id',\s*companyId\)/, /\.not\('deleted_at',\s*'is',\s*null\)/],
  },
  {
    file: 'src/app/api/company/route.ts',
    patterns: [/requireUserAndCompany(?:Role)?\(/, /\.eq\('id',\s*companyId\)/],
  },
  {
    file: 'src/app/api/companies/[companyId]/route.ts',
    patterns: [/requireUserAndCompany(?:Role)?\([^)]*companyId/, /\.eq\('id',\s*companyId\)/],
  },
  {
    file: 'src/app/api/companies/[companyId]/candidates/route.ts',
    patterns: [/requireUserAndCompany(?:Role)?\([^)]*companyId/, /company_id:\s*companyId/, /\.is\('deleted_at',\s*null\)/],
  },
  {
    file: 'src/app/api/companies/[companyId]/candidates/[id]/route.ts',
    patterns: [
      /requireUserAndCompany(?:Role)?\([^)]*companyId/,
      /\.eq\('company_id',\s*companyId\)/,
      /\.eq\('id',\s*id\)/,
      /\.is\('deleted_at',\s*null\)/,
    ],
  },
  {
    file: 'src/app/api/companies/[companyId]/candidates/[id]/restore/route.ts',
    patterns: [
      /requireUserAndCompany(?:Role)?\([^)]*companyId/,
      /\.eq\('company_id',\s*companyId\)/,
      /\.eq\('id',\s*id\)/,
      /\.not\('deleted_at',\s*'is',\s*null\)/,
    ],
  },
  {
    file: 'src/app/api/companies/[companyId]/clients/[id]/route.ts',
    patterns: [/requireUserAndCompany(?:Role)?\([^)]*companyId/, /\.eq\('company_id',\s*companyId\)/, /\.is\('deleted_at',\s*null\)/],
  },
  {
    file: 'src/app/api/companies/[companyId]/clients/[id]/restore/route.ts',
    patterns: [/requireUserAndCompany(?:Role)?\([^)]*companyId/, /\.eq\('company_id',\s*companyId\)/, /\.not\('deleted_at',\s*'is',\s*null\)/],
  },
];

describe('tenant write guards', () => {
  it.each(routeGuardCases)('$file keeps tenant scoping guards', ({ file, patterns }) => {
    const absolutePath = path.join(rootDir, file);
    const source = fs.readFileSync(absolutePath, 'utf8');

    patterns.forEach((pattern) => {
      expect(source).toMatch(pattern);
    });
  });
});
