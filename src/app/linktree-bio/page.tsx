import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Github, Linkedin, Briefcase, ExternalLink, Mail, FileText } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const sampleBioData = {
  name: "Morgan Lee",
  title: "UX Designer & Illustrator",
  avatarUrl: "https://placehold.co/150x150.png",
  avatarFallback: "ML",
  bio: "Passionate about creating intuitive user experiences and beautiful digital art. Currently seeking new opportunities to blend creativity with technology.",
  links: [
    { label: "My Online Resume", url: "/online-resume", icon: <FileText className="h-5 w-5" /> },
    { label: "Portfolio Website", url: "#", icon: <Briefcase className="h-5 w-5" /> },
    { label: "LinkedIn Profile", url: "#", icon: <Linkedin className="h-5 w-5" /> },
    { label: "GitHub Projects", url: "#", icon: <Github className="h-5 w-5" /> },
    { label: "Email Me", url: "mailto:morgan.lee@example.com", icon: <Mail className="h-5 w-5" /> },
  ],
  socialImage: "https://placehold.co/1200x630.png", // For social sharing
  socialImageAlt: "Morgan Lee - UX Designer & Illustrator",
};

export default function LinkTreeBioPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 via-background to-accent/20 p-4">
      <Card className="w-full max-w-md shadow-xl overflow-hidden rounded-2xl">
        <div className="relative h-48 bg-muted">
           <Image 
            src="https://placehold.co/600x250.png"
            data-ai-hint="abstract background"
            alt="Header background" 
            layout="fill" 
            objectFit="cover" 
            className="opacity-70"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/30">
            <Avatar className="w-28 h-28 border-4 border-card shadow-lg mb-3">
              <AvatarImage src={sampleBioData.avatarUrl} alt={sampleBioData.name} data-ai-hint="profile picture"/>
              <AvatarFallback className="text-4xl">{sampleBioData.avatarFallback}</AvatarFallback>
            </Avatar>
            <h1 className="text-3xl font-bold text-card-foreground font-headline text-white">{sampleBioData.name}</h1>
            <p className="text-md text-card-foreground/80 text-white">{sampleBioData.title}</p>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <p className="text-center text-muted-foreground">{sampleBioData.bio}</p>
          
          <div className="space-y-3">
            {sampleBioData.links.map((link, index) => (
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
  );
}
