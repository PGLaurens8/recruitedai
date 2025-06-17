
"use client"; // For navigator.clipboard and useToast

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Download, GraduationCap, Linkedin, Mail, MapPin, Phone, Share2, Star, User, Link as LinkIconLucide, Github, Globe, Copy } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";


// NOTE: This sampleResumeData should ideally be populated from the user's saved Master Resume
// and their LinkTree Bio configurations.
const sampleResumeData = {
  name: "Alex Johnson",
  title: "Senior Software Engineer",
  avatarUrl: "https://placehold.co/128x128.png",
  avatarFallback: "AJ",
  location: "San Francisco, CA",
  phone: "(123) 456-7890",
  email: "alex.johnson@example.com",
  linkedin: "linkedin.com/in/alexjohnson", // just the path, no https://
  summary: "Highly skilled and innovative Senior Software Engineer with 8+ years of experience in developing and implementing scalable software solutions. Proven ability to lead project teams, optimize application performance, and deliver high-quality products. Passionate about leveraging cutting-edge technologies to solve complex problems.",
  experience: [
    {
      role: "Senior Software Engineer",
      company: "Innovatech Solutions Inc.",
      period: "Jan 2020 - Present",
      location: "San Francisco, CA",
      responsibilities: [
        "Led a team of 5 engineers in developing a new cloud-based SaaS platform, resulting in a 30% increase in customer acquisition.",
        "Architected and implemented microservices using Node.js, Python, and Docker, improving system scalability and reliability.",
        "Optimized database performance by redesigning schemas and queries, reducing average response time by 40%.",
        "Collaborated with product managers and designers to define project requirements and deliver user-centric features.",
      ],
      logo: "https://placehold.co/40x40.png?text=IS",
    },
    {
      role: "Software Engineer",
      company: "Tech Forward LLC",
      period: "Jun 2016 - Dec 2019",
      location: "Austin, TX",
      responsibilities: [
        "Developed and maintained full-stack web applications using React, Angular, and Java Spring Boot.",
        "Participated in agile development cycles, including sprint planning, daily stand-ups, and retrospectives.",
        "Contributed to the development of RESTful APIs and integrated third-party services.",
      ],
      logo: "https://placehold.co/40x40.png?text=TF",
    },
  ],
  education: [
    {
      degree: "Master of Science in Computer Science",
      institution: "Stanford University",
      period: "2014 - 2016",
      location: "Stanford, CA",
      logo: "https://placehold.co/40x40.png?text=SU",
    },
    {
      degree: "Bachelor of Science in Software Engineering",
      institution: "University of Texas at Austin",
      period: "2010 - 2014",
      location: "Austin, TX",
      logo: "https://placehold.co/40x40.png?text=UT",
    },
  ],
  skills: ["JavaScript", "Python", "Java", "Node.js", "React", "Angular", "Spring Boot", "Docker", "Kubernetes", "AWS", "Microservices", "Agile Methodologies", "SQL", "NoSQL"],
  // This section would be populated from the user's LinkTree Bio configuration
  professionalLinks: [
    { label: "Portfolio", url: "https://example.com/portfolio", icon: <Globe className="h-5 w-5" /> },
    { label: "GitHub Projects", url: "https://github.com/exampleuser", icon: <Github className="h-5 w-5" /> },
    // Example of an empty link that shouldn't render
    { label: "Blog (Coming Soon)", url: "", icon: <LinkIconLucide className="h-5 w-5" /> },
  ],
};


export default function OnlineResumePage() {
  const { toast } = useToast();

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
    // Placeholder for actual PDF generation
    toast({ title: "Coming Soon!", description: "PDF download functionality is under development." });
  }

  return (
    <div className="max-w-4xl mx-auto bg-card p-6 sm:p-8 md:p-12 shadow-2xl rounded-xl">
      <header className="flex flex-col sm:flex-row items-center justify-between mb-10 pb-6 border-b">
        <div className="flex items-center mb-4 sm:mb-0">
          <Avatar className="h-24 w-24 mr-6 border-2 border-primary">
            <AvatarImage src={sampleResumeData.avatarUrl} alt={sampleResumeData.name} data-ai-hint="professional portrait"/>
            <AvatarFallback className="text-3xl">{sampleResumeData.avatarFallback}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-4xl font-bold font-headline text-primary">{sampleResumeData.name}</h1>
            <p className="text-xl text-muted-foreground">{sampleResumeData.title}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleCopyLink}><Copy className="mr-2 h-4 w-4" /> Copy Link</Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}><Download className="mr-2 h-4 w-4" /> PDF</Button>
          {/* <Button variant="outline" size="sm"><Share2 className="mr-2 h-4 w-4" /> Share</Button> */}
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        <aside className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {sampleResumeData.location && <p className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-muted-foreground shrink-0" /> {sampleResumeData.location}</p>}
              {sampleResumeData.phone && <p className="flex items-center"><Phone className="mr-2 h-4 w-4 text-muted-foreground shrink-0" /> {sampleResumeData.phone}</p>}
              {sampleResumeData.email && <p className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground shrink-0" /> {sampleResumeData.email}</p>}
              {sampleResumeData.linkedin && (
                <p className="flex items-center">
                  <Linkedin className="mr-2 h-4 w-4 text-muted-foreground shrink-0" /> 
                  <Link href={`https://${sampleResumeData.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                    {sampleResumeData.linkedin}
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>

          {sampleResumeData.professionalLinks && sampleResumeData.professionalLinks.filter(link => link.url).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">My Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sampleResumeData.professionalLinks.map((link) => 
                  link.url ? (
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
              {sampleResumeData.skills.map(skill => (
                <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
              ))}
            </CardContent>
          </Card>
        </aside>

        <main className="md:col-span-2 space-y-10">
          <section>
            <h2 className="flex items-center text-2xl font-semibold font-headline text-primary mb-4">
              <User className="mr-3 h-6 w-6" /> Summary
            </h2>
            <p className="text-foreground/80 leading-relaxed">{sampleResumeData.summary}</p>
          </section>

          <Separator />

          <section>
            <h2 className="flex items-center text-2xl font-semibold font-headline text-primary mb-6">
              <Briefcase className="mr-3 h-6 w-6" /> Work Experience
            </h2>
            <div className="space-y-6">
              {sampleResumeData.experience.map((exp, index) => (
                <div key={index} className="pl-4 border-l-2 border-primary/30 relative">
                   <div className="absolute -left-[11px] top-1.5 w-5 h-5 bg-primary rounded-full border-4 border-card"></div>
                   <div className="flex items-start mb-1">
                    {exp.logo && <Image src={exp.logo} alt={`${exp.company} logo`} data-ai-hint="company logo" width={24} height={24} className="mr-3 mt-1 rounded-sm"/>}
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
              <GraduationCap className="mr-3 h-6 w-6" /> Education
            </h2>
            <div className="space-y-6">
              {sampleResumeData.education.map((edu, index) => (
                 <div key={index} className="pl-4 border-l-2 border-primary/30 relative">
                    <div className="absolute -left-[11px] top-1.5 w-5 h-5 bg-primary rounded-full border-4 border-card"></div>
                    <div className="flex items-start mb-1">
                      {edu.logo && <Image src={edu.logo} alt={`${edu.institution} logo`} data-ai-hint="university logo" width={24} height={24} className="mr-3 mt-1 rounded-sm"/>}
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
        </main>
      </div>
       <footer className="mt-12 pt-6 border-t text-center text-xs text-muted-foreground">
        Powered by CareerCraft AI. Resume data is illustrative.
      </footer>
    </div>
  );
}
