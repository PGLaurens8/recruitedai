
"use client"; 

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Download, GraduationCap, Linkedin, Mail, MapPin, Phone, Share2, Star, User, Link as LinkIconLucide, Github, Globe, Copy, FileText, AlertCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import placeholders from '@/app/lib/placeholder-images.json';

const LOCAL_STORAGE_KEYS = {
  MASTER_RESUME_TEXT: 'recruitedAI_masterResumeText',
  MASTER_RESUME_USER_TITLE: 'recruitedAI_masterResumeUserTitle',
  MASTER_RESUME_EXTRACTED_NAME: 'recruitedAI_masterResumeExtractedName',
  MASTER_RESUME_EXTRACTED_JOB_TITLE: 'recruitedAI_masterResumeExtractedJobTitle',
  MASTER_RESUME_CONTACT_INFO: 'recruitedAI_masterResumeContactInfo',
  MASTER_RESUME_SKILLS: 'recruitedAI_masterResumeSkills',
  MASTER_RESUME_TIMESTAMP: 'recruitedAI_masterResumeTimestamp',
  MASTER_RESUME_AVATAR_URI: 'recruitedAI_masterResumeAvatarUri',
};

interface ContactInfo {
  email?: string;
  phone?: string;
  linkedin?: string;
  location?: string;
}

const sampleResumeData = { 
  name: "Your Name", 
  title: "Your Professional Title",
  avatarUrl: placeholders.candidate.url,
  avatarFallback: "YN", 
  contactInfo: {
    location: "City, State",
    phone: "(000) 000-0000",
    email: "youremail@example.com",
    linkedin: "linkedin.com/in/yourprofile", 
  },
  summary: "This is a sample summary. Create a Master Resume to see your own content here.",
  experience: [ 
    {
      role: "Sample Role",
      company: "Sample Company",
      period: "Date - Date",
      location: "Sample Location",
      responsibilities: [
        "Sample responsibility point.",
      ],
      logo: placeholders.companyLogo.url,
    },
  ],
  education: [ 
    {
      degree: "Sample Degree",
      institution: "Sample Institution",
      period: "Date - Date",
      location: "Sample Location",
      logo: placeholders.universityLogo.url,
    },
  ],
  skills: ["Skill 1", "Skill 2", "Skill 3"],
  professionalLinks: [
    { label: "Portfolio", url: "https://example.com", icon: <Globe className="h-5 w-5" /> },
    { label: "GitHub", url: "https://github.com/example", icon: <Github className="h-5 w-5" /> },
  ],
};


export default function OnlineResumePage() {
  const { toast } = useToast();
  const [loadedResumeText, setLoadedResumeText] = useState<string | null>(null);
  const [loadedExtractedName, setLoadedExtractedName] = useState<string | null>(null);
  const [loadedExtractedJobTitle, setLoadedExtractedJobTitle] = useState<string | null>(null);
  const [loadedContactInfo, setLoadedContactInfo] = useState<ContactInfo | null>(null);
  const [loadedSkills, setLoadedSkills] = useState<string[] | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const text = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_TEXT);
    const extractedName = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_EXTRACTED_NAME);
    const extractedJobTitle = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_EXTRACTED_JOB_TITLE);
    const contactInfoStr = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_CONTACT_INFO);
    const skillsStr = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_SKILLS);
    const storedAvatar = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_AVATAR_URI);
    
    if (text) setLoadedResumeText(text);
    if (extractedName) setLoadedExtractedName(extractedName);
    if (extractedJobTitle) setLoadedExtractedJobTitle(extractedJobTitle);
    if (contactInfoStr) setLoadedContactInfo(JSON.parse(contactInfoStr));
    if (skillsStr) setLoadedSkills(JSON.parse(skillsStr));
    if (storedAvatar) setAvatarUri(storedAvatar);
    
    setIsLoading(false);
  }, []);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          toast({ title: "Link Copied!", description: "Online resume URL copied to clipboard." });
        })
        .catch(err => {
          console.error("Failed to copy link: ", err);
          toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy link to clipboard." });
        });
    }
  };
  
  const handleDownloadPdf = () => { 
    toast({ title: "Coming Soon!", description: "PDF download functionality is under development." });
  }

  const displayName = loadedExtractedName || sampleResumeData.name;
  const displayJobTitle = loadedExtractedJobTitle || sampleResumeData.title;
  const displayContactInfo = loadedContactInfo || sampleResumeData.contactInfo;
  const displaySkills = loadedSkills && loadedSkills.length > 0 ? loadedSkills : sampleResumeData.skills;
  const avatarFallbackText = displayName?.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || sampleResumeData.avatarFallback;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner size={48} className="text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading Your Online Resume...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-card p-6 sm:p-8 md:p-12 shadow-2xl rounded-xl">
      <header className="flex flex-col sm:flex-row items-center justify-between mb-10 pb-6 border-b">
        <div className="flex items-center mb-4 sm:mb-0">
          <Avatar className="h-24 w-24 mr-6 border-2 border-primary">
            <AvatarImage src={avatarUri || sampleResumeData.avatarUrl} alt={displayName || "User Avatar"} data-ai-hint={placeholders.candidate.hint}/>
            <AvatarFallback className="text-3xl">{avatarFallbackText}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-4xl font-bold font-headline text-primary">{displayName}</h1>
            <p className="text-xl text-muted-foreground">{displayJobTitle}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleCopyLink}><Copy className="mr-2 h-4 w-4" /> Copy Link</Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}><Download className="mr-2 h-4 w-4" /> PDF</Button>
        </div>
      </header>

      {!loadedResumeText && (
        <Alert variant="default" className="mb-8 bg-yellow-50 border-yellow-300 text-yellow-700">
          <AlertCircle className="h-5 w-5 !text-yellow-600" />
          <AlertDescription>
            No Master Resume found in your browser's storage. The content below is sample data. 
            Please <Link href="/master-resume" className="font-semibold underline hover:text-yellow-800">create or upload a Master Resume</Link> to see it here.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        <aside className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {displayContactInfo.location && <p className="flex items-start"><MapPin className="mr-2 h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /> <span className="break-all">{displayContactInfo.location}</span></p>}
              {displayContactInfo.phone && <p className="flex items-start"><Phone className="mr-2 h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /> <span className="break-all">{displayContactInfo.phone}</span></p>}
              {displayContactInfo.email && <p className="flex items-start"><Mail className="mr-2 h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /> <span className="break-all">{displayContactInfo.email}</span></p>}
              {displayContactInfo.linkedin && displayContactInfo.linkedin !== 'null' && (
                <p className="flex items-start">
                  <Linkedin className="mr-2 h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /> 
                  <Link href={!displayContactInfo.linkedin.startsWith('http') ? `https://${displayContactInfo.linkedin}` : displayContactInfo.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                    {displayContactInfo.linkedin.replace(/^https?:\/\//, '')}
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>

          {sampleResumeData.professionalLinks && sampleResumeData.professionalLinks.filter(link => link.url && link.url !== '#').length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">My Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sampleResumeData.professionalLinks.map((link) => 
                  link.url && link.url !== '#' ? ( 
                    <Button
                      key={link.label}
                      variant="outline"
                      className="w-full justify-start text-sm py-3 group"
                      asChild
                    >
                      <Link href={link.url} target="_blank" rel="noopener noreferrer">
                        <span className="mr-2 text-primary group-hover:text-primary-dark transition-colors shrink-0">{link.icon || <LinkIconLucide className="h-4 w-4" />}</span>
                        <span className="truncate">{link.label}</span>
                        <Share2 className="ml-auto h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </Link>
                    </Button>
                  ) : null
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Skills</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {displaySkills.map((skill, index) => (
                <Badge key={`${skill}-${index}`} variant="secondary" className="text-xs">{skill}</Badge>
              ))}
            </CardContent>
          </Card>
        </aside>

        <main className="md:col-span-2 space-y-10">
          {loadedResumeText ? (
            <section>
              <h2 className="flex items-center text-2xl font-semibold font-headline text-primary mb-4 sr-only">
                <FileText className="mr-3 h-6 w-6" /> Master Resume Content
              </h2>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90 bg-muted/30 p-4 rounded-md border">
                {loadedResumeText}
              </pre>
            </section>
          ) : (
            <>
              <section>
                <h2 className="flex items-center text-2xl font-semibold font-headline text-primary mb-4">
                  <User className="mr-3 h-6 w-6" /> Summary (Sample)
                </h2>
                <p className="text-foreground/80 leading-relaxed">{sampleResumeData.summary}</p>
              </section>

              <Separator />

              <section>
                <h2 className="flex items-center text-2xl font-semibold font-headline text-primary mb-6">
                  <Briefcase className="mr-3 h-6 w-6" /> Work Experience (Sample)
                </h2>
                <div className="space-y-6">
                  {sampleResumeData.experience.map((exp, index) => (
                    <div key={index} className="pl-4 border-l-2 border-primary/30 relative">
                       <div className="absolute -left-[11px] top-1.5 w-5 h-5 bg-primary rounded-full border-4 border-card"></div>
                       <div className="flex items-start mb-1">
                        {exp.logo && <Image src={exp.logo} alt={`${exp.company} logo`} data-ai-hint={placeholders.companyLogo.hint} width={placeholders.companyLogo.width} height={placeholders.companyLogo.height} className="mr-3 mt-1 rounded-sm"/>}
                        <div>
                            <h3 className="text-lg font-semibold">{exp.role}</h3>
                            <p className="text-md text-primary font-medium">{exp.company}</p>
                        </div>
                       </div>
                      <p className="text-sm text-muted-foreground mb-2">{exp.period} | {exp.location}</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80">
                        {exp.responsibilities.map((resp, i) => <li key={i}>{resp}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="flex items-center text-2xl font-semibold font-headline text-primary mb-6">
                  <GraduationCap className="mr-3 h-6 w-6" /> Education (Sample)
                </h2>
                <div className="space-y-6">
                  {sampleResumeData.education.map((edu, index) => (
                     <div key={index} className="pl-4 border-l-2 border-primary/30 relative">
                        <div className="absolute -left-[11px] top-1.5 w-5 h-5 bg-primary rounded-full border-4 border-card"></div>
                        <div className="flex items-start mb-1">
                          {edu.logo && <Image src={edu.logo} alt={`${edu.institution} logo`} data-ai-hint={placeholders.universityLogo.hint} width={placeholders.universityLogo.width} height={placeholders.universityLogo.height} className="mr-3 mt-1 rounded-sm"/>}
                          <div>
                            <h3 className="text-lg font-semibold">{edu.degree}</h3>
                            <p className="text-md text-primary font-medium">{edu.institution}</p>
                          </div>
                        </div>
                      <p className="text-sm text-muted-foreground">{edu.period} | {edu.location}</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
       <footer className="mt-12 pt-6 border-t text-center text-xs text-muted-foreground">
        Powered by RecruitedAI.
      </footer>
    </div>
  );
}
