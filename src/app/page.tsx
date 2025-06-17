import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowRight, BotMessageSquare, Briefcase, FileText, Link as LinkIcon, Sparkles, UploadCloud } from 'lucide-react';
import Image from 'next/image';

const features = [
  {
    icon: <Sparkles className="h-10 w-10 text-primary" />,
    title: "AI Resume Restructuring",
    description: "Upload your existing resume (Word or PDF). Our AI analyzes and reformats it into a modern, professional template based on industry best practices. It identifies missing information and asks clarifying questions to help you build a comprehensive Master Resume.",
    link: "/master-resume",
    linkText: "Build Master Resume",
    imgSrc: "https://placehold.co/600x400.png",
    imgAlt: "AI analyzing resume",
    aiHint: "resume analysis",
  },
  {
    icon: <BotMessageSquare className="h-10 w-10 text-primary" />,
    title: "AI Job Spec Targeting",
    description: "Upload a job specification (Word, PDF, or URL). Our AI tailors your Master Resume to perfectly match the job, highlighting relevant skills and experience. It assesses your fit and provides suggestions for improvement.",
    link: "/targeted-resume",
    linkText: "Target Your Resume",
    imgSrc: "https://placehold.co/600x400.png",
    imgAlt: "Resume targeting job spec",
    aiHint: "job matching",
  },
  {
    icon: <FileText className="h-10 w-10 text-primary" />,
    title: "Online Resume Generator",
    description: "Create a stunning, shareable online resume. Embed it on your website or share the link directly with potential employers. Showcase your profile professionally and accessibly.",
    link: "/online-resume",
    linkText: "View Sample Online Resume",
    imgSrc: "https://placehold.co/600x400.png",
    imgAlt: "Online resume example",
    aiHint: "digital profile",
  },
  {
    icon: <LinkIcon className="h-10 w-10 text-primary" />,
    title: "LinkTree Bio Generator",
    description: "Generate a personalized 'link in bio' page to consolidate all your important professional links. Perfect for social media profiles, email signatures, and networking.",
    link: "/linktree-bio",
    linkText: "View Sample LinkTree",
    imgSrc: "https://placehold.co/600x400.png",
    imgAlt: "LinkTree bio example",
    aiHint: "personal branding",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 text-center bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
            <div className="flex flex-col justify-center space-y-4 text-left">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                  Craft Your Future with CareerCraft AI
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  Unlock your career potential with AI-powered resume building, targeted job applications, and professional online presence tools.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button size="lg" asChild>
                  <Link href="/master-resume">
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="#features">
                    Learn More
                  </Link>
                </Button>
              </div>
            </div>
            <Image
              src="https://placehold.co/600x450.png"
              data-ai-hint="career success"
              width="600"
              height="450"
              alt="Hero"
              className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last lg:aspect-square shadow-xl"
            />
          </div>
        </div>
      </section>

      <section id="features" className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm text-secondary-foreground">Key Features</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Elevate Your Career Game</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Our suite of AI tools is designed to help you stand out and land your dream job.
            </p>
          </div>
          <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-2 md:gap-12 lg:max-w-5xl lg:grid-cols-2">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
                <CardHeader className="items-center text-center">
                  {feature.icon}
                  <CardTitle className="mt-4 text-2xl font-headline">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground text-center">{feature.description}</p>
                   <div className="mt-4 aspect-video w-full overflow-hidden rounded-md">
                    <Image src={feature.imgSrc} alt={feature.imgAlt} data-ai-hint={feature.aiHint} width={600} height={400} className="object-cover w-full h-full" />
                  </div>
                </CardContent>
                <div className="p-6 pt-0 mt-auto">
                  <Button className="w-full" asChild>
                    <Link href={feature.link}>
                      {feature.linkText} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
        <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">
              Ready to Supercharge Your Career?
            </h2>
            <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Join CareerCraft AI today and take the first step towards your professional goals.
            </p>
          </div>
          <div className="mx-auto w-full max-w-sm space-y-2">
            <Button size="lg" type="submit" className="w-full" asChild>
               <Link href="/signup">
                Sign Up for Free
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Get started with our core features for free.
              <Link href="/pricing" className="underline underline-offset-2 ml-1">
                Terms & Conditions
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
