"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from '@/components/ui/spinner';
import { AlertTriangle, Copy, FileText, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isMockMode, isSupabaseMode } from '@/lib/runtime-mode';
import { getMockMasterResumeById } from '@/lib/data/mock-store';

interface ContactInfo {
  email?: string;
  phone?: string;
  linkedin?: string;
  location?: string;
}

interface PublicResume {
  fullName?: string | null;
  userTitle?: string | null;
  reformattedText: string;
  skills: string[];
  avatarUri?: string | null;
  currentJobTitle?: string | null;
  contactInfo?: ContactInfo | null;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; resume: PublicResume }
  | { status: 'not-found' }
  | { status: 'error' };

export default function PublicResumePage() {
  const params = useParams();
  const resumeId = typeof params?.id === "string" ? params.id : "";
  const { toast } = useToast();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let isActive = true;

    async function load() {
      if (!resumeId) {
        if (isActive) setState({ status: 'not-found' });
        return;
      }

      try {
        // Mock mode keeps data in the browser (localStorage), so read it
        // directly rather than calling the server API route.
        if (isMockMode()) {
          const record = getMockMasterResumeById(resumeId);
          if (!isActive) return;
          if (!record) {
            setState({ status: 'not-found' });
            return;
          }
          setState({
            status: 'ready',
            resume: {
              fullName: record.fullName ?? null,
              userTitle: record.userTitle ?? null,
              reformattedText: record.reformattedText ?? '',
              skills: record.skills ?? [],
              avatarUri: record.avatarUri ?? null,
              currentJobTitle: record.currentJobTitle ?? null,
              contactInfo: (record.contactInfo as ContactInfo) ?? {},
            },
          });
          return;
        }

        if (isSupabaseMode()) {
          // Plain fetch so we can distinguish a genuine 404 from other failures.
          const response = await fetch(`/api/resume/${resumeId}`);
          if (!isActive) return;
          if (response.status === 404) {
            setState({ status: 'not-found' });
            return;
          }
          const body = await response.json();
          if (!response.ok || body?.ok !== true) {
            throw new Error(body?.error?.message || `Request failed: ${response.status}`);
          }
          setState({ status: 'ready', resume: body.data as PublicResume });
          return;
        }

        if (isActive) setState({ status: 'error' });
      } catch {
        if (isActive) setState({ status: 'error' });
      }
    }

    setState({ status: 'loading' });
    load();

    return () => {
      isActive = false;
    };
  }, [resumeId]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
        .then(() => toast({ title: "Link Copied!", description: "Resume URL copied to clipboard." }))
        .catch(() => toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy link to clipboard." }));
    }
  };

  if (state.status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size={48} className="text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading resume...</p>
      </div>
    );
  }

  if (state.status === 'not-found' || state.status === 'error') {
    const isNotFound = state.status === 'not-found';
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-bold">{isNotFound ? "Resume Not Found" : "Something Went Wrong"}</p>
        <p className="mt-1 max-w-md text-muted-foreground">
          {isNotFound
            ? "This resume link is invalid or the resume is no longer available."
            : "We couldn't load this resume. Please try again later."}
        </p>
        {!isNotFound && (
          <Button className="mt-4" onClick={() => window.location.reload()}>Try Again</Button>
        )}
        <p className="mt-8 text-xs text-muted-foreground">Powered by RecruitedAI.</p>
      </div>
    );
  }

  const { resume } = state;
  const displayName = resume.fullName || "Candidate";
  const displayJobTitle = resume.currentJobTitle || resume.userTitle || "";
  const contactInfo = resume.contactInfo || {};
  const skills = resume.skills || [];
  const avatarFallback = displayName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-card p-6 sm:p-8 md:p-12 shadow-2xl rounded-xl">
        <header className="flex flex-col sm:flex-row items-center justify-between mb-10 pb-6 border-b">
          <div className="flex items-center mb-4 sm:mb-0">
            <Avatar className="h-24 w-24 mr-6 border-2 border-primary">
              {resume.avatarUri && <AvatarImage src={resume.avatarUri} alt={displayName} />}
              <AvatarFallback className="text-3xl">{avatarFallback}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-4xl font-bold font-headline text-primary">{displayName}</h1>
              {displayJobTitle && <p className="text-xl text-muted-foreground">{displayJobTitle}</p>}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Copy className="mr-2 h-4 w-4" /> Copy Link
            </Button>
          </div>
        </header>

        <div className="grid md:grid-cols-3 gap-8">
          <aside className="md:col-span-1 space-y-6">
            {(contactInfo.location || contactInfo.phone || contactInfo.email || contactInfo.linkedin) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {contactInfo.location && <p className="flex items-start"><MapPin className="mr-2 h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /> <span className="break-all">{contactInfo.location}</span></p>}
                  {contactInfo.phone && <p className="flex items-start"><Phone className="mr-2 h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /> <span className="break-all">{contactInfo.phone}</span></p>}
                  {contactInfo.email && <p className="flex items-start"><Mail className="mr-2 h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /> <span className="break-all">{contactInfo.email}</span></p>}
                  {contactInfo.linkedin && contactInfo.linkedin !== 'null' && (
                    <p className="flex items-start">
                      <Linkedin className="mr-2 h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <Link href={!contactInfo.linkedin.startsWith('http') ? `https://${contactInfo.linkedin}` : contactInfo.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                        {contactInfo.linkedin.replace(/^https?:\/\//, '')}
                      </Link>
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Skills</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <Badge key={`${skill}-${index}`} variant="secondary" className="text-xs">{skill}</Badge>
                  ))}
                </CardContent>
              </Card>
            )}
          </aside>

          <main className="md:col-span-2 space-y-10">
            <section>
              <h2 className="flex items-center text-2xl font-semibold font-headline text-primary mb-4 sr-only">
                <FileText className="mr-3 h-6 w-6" /> Resume
              </h2>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90 bg-muted/30 p-4 rounded-md border">
                {resume.reformattedText || "This resume has no content yet."}
              </pre>
            </section>
          </main>
        </div>

        <footer className="mt-12 pt-6 border-t text-center text-xs text-muted-foreground">
          Powered by RecruitedAI.
        </footer>
      </div>
    </div>
  );
}
