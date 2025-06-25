
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileText, Bot, User, Link as LinkIconLucide } from 'lucide-react';

const candidateFeatures = [
    {
        title: "Resume Builder",
        description: "Build and manage your Master Resume.",
        link: "/master-resume",
        icon: <FileText className="h-8 w-8 text-primary"/>
    },
    {
        title: "AI Job Matching",
        description: "Match your resume against job specs.",
        link: "/targeted-resume",
        icon: <Bot className="h-8 w-8 text-primary"/>
    },
    {
        title: "Online Resume",
        description: "View and share your online profile.",
        link: "/online-resume",
        icon: <User className="h-8 w-8 text-primary"/>
    },
    {
        title: "LinkTree Bio",
        description: "Manage your professional links.",
        link: "/linktree-bio",
        icon: <LinkIconLucide className="h-8 w-8 text-primary"/>
    }
]

export default function CandidateDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Candidate Dashboard</h1>
        <p className="text-muted-foreground">Welcome! Here are your career tools.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {candidateFeatures.map(feature => (
            <Card key={feature.title}>
                <CardHeader>
                    {feature.icon}
                    <CardTitle className="pt-2">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                    <Button asChild variant="link" className="px-0 pt-4">
                        <Link href={feature.link}>Go to {feature.title}</Link>
                    </Button>
                </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
}
