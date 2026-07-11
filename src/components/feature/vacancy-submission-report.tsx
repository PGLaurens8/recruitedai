'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Printer, Briefcase } from 'lucide-react';
import { useSubmissions } from '@/lib/data/hooks';
import type { SubmissionRecord, SubmissionStatus } from '@/lib/data/types';

// A vacancy is "closed out" once it reaches one of these terminal statuses; the
// rest count as still in progress in the pipeline.
const PLACED_STATUSES: SubmissionStatus[] = ['placed'];
const CLOSED_STATUSES: SubmissionStatus[] = ['rejected', 'withdrew'];

interface VacancyRow {
  jobId: string;
  vacancy: string;
  client: string;
  total: number;
  inProgress: number;
  placed: number;
  closed: number;
}

function buildRows(submissions: SubmissionRecord[]): VacancyRow[] {
  const byVacancy = new Map<string, VacancyRow>();

  for (const s of submissions) {
    const key = s.jobId;
    const existing =
      byVacancy.get(key) ??
      {
        jobId: key,
        vacancy: s.jobTitle || 'Untitled vacancy',
        client: s.clientName || '—',
        total: 0,
        inProgress: 0,
        placed: 0,
        closed: 0,
      };

    existing.total += 1;
    if (PLACED_STATUSES.includes(s.status)) existing.placed += 1;
    else if (CLOSED_STATUSES.includes(s.status)) existing.closed += 1;
    else existing.inProgress += 1;

    byVacancy.set(key, existing);
  }

  return Array.from(byVacancy.values()).sort((a, b) => b.total - a.total);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function VacancySubmissionReport({
  companyId,
  companyName,
}: {
  companyId: string | undefined;
  companyName?: string;
}) {
  const { data: submissions, isLoading } = useSubmissions(companyId);
  const rows = useMemo(() => buildRows(submissions || []), [submissions]);
  const [generatedAt] = useState(() => new Date());

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          total: acc.total + r.total,
          inProgress: acc.inProgress + r.inProgress,
          placed: acc.placed + r.placed,
          closed: acc.closed + r.closed,
        }),
        { total: 0, inProgress: 0, placed: 0, closed: 0 },
      ),
    [rows],
  );

  const reportTitle = `${companyName || 'Company'} — Candidate Submissions by Vacancy`;

  const handleExportCsv = () => {
    const headers = ['Vacancy', 'Client', 'Candidates Submitted', 'In Progress', 'Placed', 'Rejected/Withdrew'];
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const lines = [
      headers.map(escape).join(','),
      ...rows.map((r) =>
        [r.vacancy, r.client, r.total, r.inProgress, r.placed, r.closed].map(escape).join(','),
      ),
      ['TOTAL', '', totals.total, totals.inProgress, totals.placed, totals.closed].map(escape).join(','),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `candidate-submissions-by-vacancy-${generatedAt.toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const tableRows = rows
      .map(
        (r) => `
          <tr>
            <td>${escapeHtml(r.vacancy)}</td>
            <td>${escapeHtml(r.client)}</td>
            <td class="num">${r.total}</td>
            <td class="num">${r.inProgress}</td>
            <td class="num">${r.placed}</td>
            <td class="num">${r.closed}</td>
          </tr>`,
      )
      .join('');

    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(reportTitle)}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #111; margin: 32px; }
            h1 { font-size: 18px; margin: 0 0 4px; }
            .meta { color: #555; font-size: 12px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #ddd; }
            th { background: #f4f4f5; font-weight: 600; }
            td.num, th.num { text-align: right; }
            tfoot td { font-weight: 700; border-top: 2px solid #333; }
            @media print { body { margin: 12mm; } button { display: none; } }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(reportTitle)}</h1>
          <div class="meta">Generated ${escapeHtml(formatDate(generatedAt))} · ${rows.length} vacancies · ${totals.total} candidates submitted</div>
          <table>
            <thead>
              <tr>
                <th>Vacancy</th><th>Client</th><th class="num">Candidates Submitted</th>
                <th class="num">In Progress</th><th class="num">Placed</th><th class="num">Rejected/Withdrew</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot>
              <tr>
                <td>Total</td><td></td><td class="num">${totals.total}</td>
                <td class="num">${totals.inProgress}</td><td class="num">${totals.placed}</td><td class="num">${totals.closed}</td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    // Give the new document a tick to lay out before invoking the print dialog.
    printWindow.setTimeout(() => printWindow.print(), 250);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Candidate Submissions by Vacancy</CardTitle>
          <CardDescription>
            How many candidates have been submitted to each vacancy. Export or print to report on submission numbers.
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={rows.length === 0}>
            <Download size={16} className="mr-2" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={rows.length === 0}>
            <Printer size={16} className="mr-2" /> Print
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading submissions…</p>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Briefcase className="h-8 w-8" />
            <p className="text-sm">No candidates have been submitted to a vacancy yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vacancy</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Candidates Submitted</TableHead>
                <TableHead className="text-right">In Progress</TableHead>
                <TableHead className="text-right">Placed</TableHead>
                <TableHead className="text-right">Rejected/Withdrew</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.jobId}>
                  <TableCell className="font-medium">{r.vacancy}</TableCell>
                  <TableCell className="text-muted-foreground">{r.client}</TableCell>
                  <TableCell className="text-right font-semibold">{r.total}</TableCell>
                  <TableCell className="text-right">{r.inProgress}</TableCell>
                  <TableCell className="text-right">{r.placed}</TableCell>
                  <TableCell className="text-right">{r.closed}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-bold">Total</TableCell>
                <TableCell />
                <TableCell className="text-right font-bold">{totals.total}</TableCell>
                <TableCell className="text-right font-bold">{totals.inProgress}</TableCell>
                <TableCell className="text-right font-bold">{totals.placed}</TableCell>
                <TableCell className="text-right font-bold">{totals.closed}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
