
"use client";

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Github, Linkedin, Briefcase, ExternalLink, Mail, FileText, Link as LinkIconLucide, Save, Edit, UploadCloud } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { fileToDataURI } from '@/lib/file-utils';
import { Spinner } from '@/components/ui/spinner';

const LOCAL_STORAGE_KEYS = {
  MASTER_RESUME_TEXT: 'careerCraft_masterResumeText',
  MASTER_RESUME_EXTRACTED_NAME: 'careerCraft_masterResumeExtractedName',
  MASTER_RESUME_EXTRACTED_JOB_TITLE: 'careerCraft_masterResumeExtractedJobTitle',
  MASTER_RESUME_AVATAR_URI: 'careerCraft_masterResumeAvatarUri',
};

// Default data for when no master resume is found
const defaultBioData = {
  name: "Your Name",
  title: "Your Title",
  avatarUrl: "https://placehold.co/150x150.png",
  coverUrl: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22600%22%20height%3D%22250%22%20viewBox%3D%220%200%20600%20250%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22grad%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23374151%22%20%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%231e40af%22%20%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22600%22%20height%3D%22250%22%20fill%3D%22url(%23grad)%22%20%2F%3E%3C%2Fsvg%3E",
  avatarFallback: "YN",
  bio: "Create a Master Resume to automatically populate your bio, or edit it directly here.",
  links: [
    { id: 1, label: "My Online Resume", url: "/online-resume", icon: <FileText className="h-5 w-5" /> },
    { id: 2, label: "Portfolio Website", url: "#", icon: <Briefcase className="h-5 w-5" /> },
    { id: 3, label: "LinkedIn Profile", url: "#", icon: <Linkedin className="h-5 w-5" /> },
    { id: 4, label: "GitHub Projects", url: "#", icon: <Github className="h-5 w-5" /> },
    { id: 5, label: "Email Me", url: "mailto:your.email@example.com", icon: <Mail className="h-5 w-5" /> },
  ],
};


export default function LinkTreeBioPage() {
  const [bioData, setBioData] = useState(defaultBioData);
  const [isLoading, setIsLoading] = useState(true);

  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedName = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_EXTRACTED_NAME);
    const storedTitle = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_EXTRACTED_JOB_TITLE);
    const storedAvatar = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_AVATAR_URI);
    const masterResumeText = localStorage.getItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_TEXT);

    let summary = defaultBioData.bio;
    if (masterResumeText) {
      // Logic to extract summary: take the first two sentences of the first non-empty paragraph.
      const paragraphs = masterResumeText.split('\n\n').map(p => p.trim()).filter(p => p);
      if (paragraphs.length > 0) {
        const firstParagraph = paragraphs[0];
        // Split into sentences, then take the first two.
        const sentences = firstParagraph.match(/[^.!?]+[.!?]+/g) || [];
        if (sentences.length > 0) {
          summary = sentences.slice(0, 2).join(' ').trim();
        } else {
          // Fallback if no sentences are detected (e.g., paragraph without punctuation)
          summary = firstParagraph;
        }
      }
    }

    const name = storedName || defaultBioData.name;

    setBioData(prev => ({
      ...prev,
      name: name,
      title: storedTitle || defaultBioData.title,
      avatarUrl: storedAvatar || defaultBioData.avatarUrl,
      bio: summary,
      avatarFallback: name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() || '??'
    }));

    setIsLoading(false);
  }, []);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBioData(prev => ({ ...prev, [name]: value }));
  };

  const handleLinkChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newLinks = [...bioData.links];
    const linkToUpdate = { ...newLinks[index], [name]: value };
    newLinks[index] = linkToUpdate;
    setBioData(prev => ({ ...prev, links: newLinks }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'avatarUrl' | 'coverUrl') => {
    if (e.target.files && e.target.files[0]) {
        try {
            const file = e.target.files[0];
            const dataUri = await fileToDataURI(file);
            setBioData(prev => ({ ...prev, [field]: dataUri }));
            
            // If the user uploads a new profile photo here, update it in local storage
            // so it becomes the new default across the app for this session.
            if (field === 'avatarUrl') {
              localStorage.setItem(LOCAL_STORAGE_KEYS.MASTER_RESUME_AVATAR_URI, dataUri);
            }
        } catch (error) {
            console.error("Error converting file to Data URI:", error);
        }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner size={48} className="text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading Your Bio Page...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold font-headline">LinkTree Bio Editor</h1>
        <p className="mt-2 text-lg text-muted-foreground">Customize your public links page. Changes are not saved automatically yet.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12 items-start">
        {/* Editor Side */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Edit Your Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" value={bioData.name} onChange={handleProfileChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title or Headline</Label>
              <Input id="title" name="title" value={bioData.title} onChange={handleProfileChange} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="bio">Short Bio</Label>
              <Textarea id="bio" name="bio" value={bioData.bio} onChange={handleProfileChange} className="min-h-[100px]" />
            </div>

            <Separator />
            
            <h3 className="text-lg font-semibold -mb-2 pt-2">Profile Images</h3>
            <div className="flex items-center gap-6">
                <div className="relative">
                    <Avatar className="w-24 h-24 border">
                        <AvatarImage src={bioData.avatarUrl} alt="Profile preview" data-ai-hint="profile picture"/>
                        <AvatarFallback>{bioData.avatarFallback}</AvatarFallback>
                    </Avatar>
                    <Button
                        size="icon"
                        variant="outline"
                        className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-background"
                        onClick={() => profileImageInputRef.current?.click()}
                    >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit profile picture</span>
                    </Button>
                    <Input
                        ref={profileImageInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleImageChange(e, 'avatarUrl')}
                    />
                </div>
                <div className="flex-1 space-y-2">
                    <Label>Cover Photo</Label>
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => coverImageInputRef.current?.click()}
                    >
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Change Cover Image
                    </Button>
                     <Input
                        ref={coverImageInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleImageChange(e, 'coverUrl')}
                    />
                </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4">Your Links</h3>
              <div className="space-y-4">
                {bioData.links.map((link, index) => (
                  <div key={link.id} className="p-4 border rounded-lg space-y-3 bg-muted/20">
                    <div className="flex items-center text-muted-foreground">
                      {link.icon}
                      <p className="ml-2 font-semibold text-sm">Link #{index + 1}</p>
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor={`link-label-${index}`}>Label</Label>
                       <Input 
                         id={`link-label-${index}`}
                         name="label"
                         value={link.label} 
                         onChange={(e) => handleLinkChange(index, e)}
                         placeholder="e.g., My Portfolio"
                       />
                    </div>
                     <div className="space-y-2">
                       <Label htmlFor={`link-url-${index}`}>URL</Label>
                       <Input 
                         id={`link-url-${index}`}
                         name="url"
                         value={link.url}
                         onChange={(e) => handleLinkChange(index, e)}
                         placeholder="https://..."
                       />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
           <CardFooter>
             <Button className="w-full" disabled>
                <Save className="mr-2 h-4 w-4"/>
                Save Changes (Coming Soon)
             </Button>
           </CardFooter>
        </Card>

        {/* Preview Side */}
        <div className="sticky top-24">
           <h2 className="text-2xl font-bold text-center mb-4 font-headline">Live Preview</h2>
           {/* This is the same display component from the original file */}
           <div className="flex flex-col items-center justify-center p-4 scale-90 -mt-8">
              <Card className="w-full max-w-md shadow-xl overflow-hidden rounded-2xl border-2 border-primary">
                <div className="relative h-48 bg-muted">
                   <Image 
                    src={bioData.coverUrl}
                    data-ai-hint="abstract background"
                    alt="Header background" 
                    fill={true}
                    style={{objectFit: 'cover'}}
                    className="opacity-70"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/30">
                    <Avatar className="w-28 h-28 border-4 border-card shadow-lg mb-3">
                      <AvatarImage src={bioData.avatarUrl} alt={bioData.name} data-ai-hint="profile picture"/>
                      <AvatarFallback className="text-4xl">{bioData.avatarFallback}</AvatarFallback>
                    </Avatar>
                    <h1 className="text-3xl font-bold text-card-foreground font-headline text-white">{bioData.name}</h1>
                    <p className="text-md text-card-foreground/80 text-white">{bioData.title}</p>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  <p className="text-center text-muted-foreground">{bioData.bio}</p>
                  
                  <div className="space-y-3">
                    {bioData.links.map((link, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="w-full justify-start text-base py-6 hover:bg-primary/10 hover:border-primary group"
                        asChild
                      >
                        <Link href={link.url} target={link.url.startsWith('http') || link.url.startsWith('mailto:') ? '_blank' : '_self'}>
                          <span className="mr-3 text-primary group-hover:text-primary-dark transition-colors">{link.icon}</span>
                          {link.label}
                          <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </Link>
                      </Button>
                    ))}
                  </div>
                  
                  <div className="text-center text-xs text-muted-foreground pt-4">
                    Powered by CareerCraft AI
                  </div>
                </div>
              </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
