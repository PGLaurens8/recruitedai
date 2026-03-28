'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { VoiceJobBriefButton } from '@/components/VoiceJobBriefButton';
import type { VoiceJobBriefFields } from '@/hooks/useVoiceJobBrief';

const statusOptions: { value: JobStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
];

type JobStatus = 'draft' | 'pending' | 'active' | 'closed';

type JobFormState = {
  title: string;
  description: string;
  location: string;
  salary: string;
  company: string;
};

const initialFormState: JobFormState = {
  title: '',
  description: '',
  location: '',
  salary: '',
  company: '',
};

export default function NewJobPage() {
  const [formState, setFormState] = useState<JobFormState>(initialFormState);
  const [status, setStatus] = useState<JobStatus>('draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const statusLabel = useMemo(() => {
    const option = statusOptions.find((item) => item.value === status);
    return option?.label;
  }, [status]);

  const handleVoiceResult = (fields: VoiceJobBriefFields) => {
    setFormState((current) => ({
      ...current,
      title: fields.title ?? current.title,
      description: fields.description ?? current.description,
      location: fields.location ?? current.location,
      company: fields.company ?? current.company,
      salary:
        fields.salaryMin && fields.salaryMax
          ? `${fields.salaryMin} - ${fields.salaryMax}`
          : fields.salaryMin ?? fields.salaryMax ?? current.salary,
    }));
    toast({
      title: 'Voice brief captured',
      description: 'Fields have been populated. Review and submit when ready.',
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.title.trim()) {
      toast({ variant: 'destructive', title: 'Title required', description: 'Please enter a job title before saving.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formState.title.trim(),
          description: formState.description.trim() || undefined,
          location: formState.location.trim() || undefined,
          salary: formState.salary.trim() || undefined,
          company: formState.company.trim() || undefined,
          status,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message || 'Failed to create job.');
      }

      toast({ title: 'Job created', description: 'Your job has been saved.' });
      setFormState(initialFormState);
      setStatus('draft');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create job.';
      toast({ variant: 'destructive', title: 'Unable to save job', description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">Create Job Brief</h1>
        <p className="text-sm text-muted-foreground">Capture the job specification and publish when ready.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Create Job Brief</CardTitle>
              <CardDescription>Use voice or type to describe the opportunity.</CardDescription>
            </div>
            <VoiceJobBriefButton onBriefCaptured={handleVoiceResult} />
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="job-title">Job Title</Label>
              <Input
                id="job-title"
                value={formState.title}
                onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Senior Product Designer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-description">Description</Label>
              <Textarea
                id="job-description"
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Capture the mission, responsibilities, and must-have technologies."
                className="min-h-[120px]"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="job-location">Location</Label>
                <Input
                  id="job-location"
                  value={formState.location}
                  onChange={(event) => setFormState((prev) => ({ ...prev, location: event.target.value }))}
                  placeholder="Remote, San Francisco, CA"
                />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="job-salary">Salary</Label>
                <Input
                  id="job-salary"
                  value={formState.salary}
                  onChange={(event) => setFormState((prev) => ({ ...prev, salary: event.target.value }))}
                  placeholder="$100k - $130k"
                />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="job-company">Company</Label>
                <Input
                  id="job-company"
                  value={formState.company}
                  onChange={(event) => setFormState((prev) => ({ ...prev, company: event.target.value }))}
                  placeholder="RecruitedAI"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="job-status">Status</Label>
                <Badge variant="outline" className="text-xs">
                  {statusLabel}
                </Badge>
              </div>
              <Select value={status} onValueChange={(value) => setStatus(value as JobStatus)}>
                <SelectTrigger id="job-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>

          <Separator />

          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">You can update this job later in Job Management.</p>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save Job Brief'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
