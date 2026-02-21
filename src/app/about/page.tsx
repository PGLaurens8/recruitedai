
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Zap, Target, Users, Building, ShieldCheck, Cpu } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="container mx-auto py-12 max-w-5xl space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight font-headline">RecruitedAI Architecture</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          A modular, multi-tenant ecosystem designed to revolutionize the recruitment lifecycle through specialized AI automation.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Zap className="h-5 w-5" /> Our Strategic Vision
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed space-y-4">
            <p>
              RecruitedAI is built on a <strong>Module-as-a-Service (MaaS)</strong> model. Each operational module is designed to function as a standalone micro-SaaS or as a unified enterprise suite.
            </p>
            <p>
              By leveraging <strong>Gemini 2.5 Flash</strong>, we provide high-velocity data extraction and analysis that scales with agency needs without the overhead of traditional manual data entry.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" /> Multi-Tenant Security
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed space-y-4">
            <p>
              Data integrity is our priority. Our architecture uses path-based isolation at the Firestore level, ensuring that Candidates, Clients, and Jobs are strictly partitioned by Company ID.
            </p>
            <p>
              Role-Based Access Control (RBAC) ensures that Sales, Recruiters, and Admin users only see the tools relevant to their KPIs.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold font-headline">Core Modules (Micro-SaaS Offerings)</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <ModuleItem 
            title="Talent Acquisition Suite" 
            audience="Recruitment Agencies & HR" 
            features={["AI Resume Parsing", "Auto-Scoring", "Interview Note Taker", "Branded Packs"]}
            icon={<Users className="text-blue-500" />}
          />
          <ModuleItem 
            title="Sales Prospector" 
            audience="Agency Sales & BD Teams" 
            features={["Company Lead Finder", "Decision Maker Extraction", "CRM Integration", "Market Insights"]}
            icon={<Building className="text-purple-500" />}
          />
          <ModuleItem 
            title="Candidate Branding" 
            audience="Individuals & Job Seekers" 
            features={["Master Resume Builder", "Job Match Analysis", "Online Bio Pages", "Interview Coaching"]}
            icon={<Target className="text-orange-500" />}
          />
        </div>
      </div>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" /> AI Model Stability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This platform is strictly standardized on <strong>Gemini 2.5 Flash</strong> for all production environments. This ensures 99.9% uptime for extraction flows and consistent, high-fidelity reasoning for candidate-job matching.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ModuleItem({ title, audience, features, icon }: { title: string, audience: string, features: string[], icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mb-2">
          {icon}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="text-xs font-bold uppercase text-primary">{audience}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {features.map((f, i) => (
            <li key={i} className="text-xs flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" /> {f}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
