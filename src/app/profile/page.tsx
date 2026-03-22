
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Building, User, UploadCloud, Save, Globe, Mail, MapPin, Zap, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { fileToDataURI } from '@/lib/file-utils';
import { saveCompany, useCompany } from '@/lib/data/hooks';

const PLAN_FEATURES = {
  Free: ["Basic Resume Builder", "Single Profile", "Community Support"],
  Professional: ["Master Resume Toolkit", "Unlimited Job Matching", "LinkTree Bio", "AI Coaching"],
  Agency: ["Full Talent Engine Module", "Full Business Hub Module", "Branded CV Exports", "API Access", "Custom Dashboards"]
};

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("user");
  const avatarFallback = user?.name?.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || 'U';

  // Company State
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data: companyDoc } = useCompany(user?.companyId, refreshKey);

  useEffect(() => {
    if (!companyDoc) return;
    setCompanyName(companyDoc.name || '');
    setCompanyLogo(companyDoc.logo || '');
    setCompanyWebsite(companyDoc.website || '');
    setCompanyEmail(companyDoc.email || '');
    setCompanyAddress(companyDoc.address || '');
  }, [companyDoc]);

  const handleSaveCompany = async () => {
    if (!user) return;
    try {
      await saveCompany({
        id: user.companyId,
        name: companyName,
        logo: companyLogo,
        website: companyWebsite,
        email: companyEmail,
        address: companyAddress,
      });
      
      toast({
        title: "Company Profile Saved",
        description: "Your branding details have been updated successfully.",
      });
      setRefreshKey((current) => current + 1);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save Failed", description: "Storage limit reached." });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 500 * 1024) {
        toast({ variant: "destructive", title: "Image Too Large", description: "Max 500KB." });
        return;
      }
      const uri = await fileToDataURI(file);
      setCompanyLogo(uri);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account & Billing</h1>
          <p className="mt-1 text-muted-foreground">Manage your credentials, branding, and subscription tier.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/about">Strategic About Page</Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="user" className="flex items-center gap-2"><User size={16} /> Profile</TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2"><Building size={16} /> Branding</TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2"><Zap size={16} /> Plans</TabsTrigger>
        </TabsList>

        {/* USER TAB */}
        <TabsContent value="user" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1">
              <CardHeader className="items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={`https://placehold.co/128x128.png`} data-ai-hint="profile picture" />
                  <AvatarFallback className="text-3xl">{avatarFallback}</AvatarFallback>
                </Avatar>
                <CardTitle>{user.name}</CardTitle>
                <Badge variant="secondary" className="capitalize mt-1">{user.role}</Badge>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground text-center">
                <p>Member since Feb 2026</p>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Session Credentials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Email Address</Label>
                  <Input readOnly value={user.email} />
                </div>
                <div className="grid gap-2">
                  <Label>Assigned Role</Label>
                  <Input readOnly value={user.role} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* BRANDING TAB */}
        <TabsContent value="company" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Agency Profile</CardTitle>
                <CardDescription>Details used for automated candidate profile branding.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Agency Name</Label>
                    <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyWebsite">Website</Label>
                    <Input id="companyWebsite" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Agency Logo</Label>
                  <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/20">
                    <div className="h-12 w-12 border rounded bg-white flex items-center justify-center">
                      {companyLogo ? (
                        <Image
                          src={companyLogo}
                          alt={companyName ? `${companyName} logo` : 'Company logo'}
                          width={48}
                          height={48}
                          unoptimized
                          className="h-full w-full object-contain"
                        />
                      ) : <Building />}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>Change Logo</Button>
                    <input ref={logoInputRef} type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <Button onClick={handleSaveCompany} className="ml-auto"><Save size={16} className="mr-2" /> Save Changes</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* PLANS TAB */}
        <TabsContent value="plans" className="mt-6">
          <div className="grid md:grid-cols-3 gap-6">
            <PlanCard 
              name="Personal" 
              price="Free" 
              description="Basic tools for job seekers."
              features={PLAN_FEATURES.Free}
              isCurrent={user.role === 'Candidate'}
            />
            <PlanCard 
              name="Professional" 
              price="$19/mo" 
              description="Advanced candidate branding toolkit."
              features={PLAN_FEATURES.Professional}
              highlight
            />
            <PlanCard 
              name="Agency Enterprise" 
              price="$199/mo" 
              description="Full Talent Engine & Business Hub modules."
              features={PLAN_FEATURES.Agency}
              isCurrent={['Admin', 'Recruiter', 'Sales', 'Developer'].includes(user.role)}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlanCard({ name, price, description, features, isCurrent, highlight }: any) {
  return (
    <Card className={highlight ? "border-primary shadow-lg ring-1 ring-primary" : ""}>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <div className="text-3xl font-bold mt-2">{price}</div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {features.map((f: string, i: number) => (
            <li key={i} className="text-xs flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-500" /> {f}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button className="w-full" variant={isCurrent ? "outline" : "default"} disabled={isCurrent}>
          {isCurrent ? "Active Tier" : "Upgrade Now"}
        </Button>
      </CardFooter>
    </Card>
  );
}
