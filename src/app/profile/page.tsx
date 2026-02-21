
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
import { CreditCard, Building, User, UploadCloud, Save, Globe, Mail, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { fileToDataURI } from '@/lib/file-utils';

const LOCAL_STORAGE_KEYS = {
  COMPANY_NAME: 'recruitedAI_companyName',
  COMPANY_LOGO: 'recruitedAI_companyLogo',
  COMPANY_WEBSITE: 'recruitedAI_companyWebsite',
  COMPANY_EMAIL: 'recruitedAI_companyEmail',
  COMPANY_ADDRESS: 'recruitedAI_companyAddress',
};

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("user");
  const avatarFallback = user?.name?.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || 'U';

  // Company State
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCompanyName(localStorage.getItem(LOCAL_STORAGE_KEYS.COMPANY_NAME) || '');
    setCompanyLogo(localStorage.getItem(LOCAL_STORAGE_KEYS.COMPANY_LOGO) || '');
    setCompanyWebsite(localStorage.getItem(LOCAL_STORAGE_KEYS.COMPANY_WEBSITE) || '');
    setCompanyEmail(localStorage.getItem(LOCAL_STORAGE_KEYS.COMPANY_EMAIL) || '');
    setCompanyAddress(localStorage.getItem(LOCAL_STORAGE_KEYS.COMPANY_ADDRESS) || '');
  }, []);

  const handleSaveCompany = () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.COMPANY_NAME, companyName);
    localStorage.setItem(LOCAL_STORAGE_KEYS.COMPANY_LOGO, companyLogo);
    localStorage.setItem(LOCAL_STORAGE_KEYS.COMPANY_WEBSITE, companyWebsite);
    localStorage.setItem(LOCAL_STORAGE_KEYS.COMPANY_EMAIL, companyEmail);
    localStorage.setItem(LOCAL_STORAGE_KEYS.COMPANY_ADDRESS, companyAddress);
    
    toast({
      title: "Company Profile Saved",
      description: "Your branding details have been updated successfully.",
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const uri = await fileToDataURI(e.target.files[0]);
      setCompanyLogo(uri);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile & Branding</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your personal settings and company branding for candidate reports.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="user" className="flex items-center gap-2">
            <User size={16} /> User Profile
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building size={16} /> Company Branding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="user" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1">
              <CardHeader className="items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={`https://placehold.co/128x128.png`} data-ai-hint="profile picture" />
                  <AvatarFallback className="text-3xl">{avatarFallback}</AvatarFallback>
                </Avatar>
                <CardTitle>{user.name}</CardTitle>
                <CardDescription>
                  <Badge variant="secondary" className="capitalize mt-1">{user.role}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground text-center">
                <p>This is a demo account. Profile editing is not yet available.</p>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Subscription & Billing
                  </CardTitle>
                  <CardDescription>
                    Manage your current plan, view invoices, and update payment methods.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">You are currently on the <span className="font-semibold text-primary">Free Tier</span> plan.</p>
                  <Button asChild>
                    <Link href="/billing">
                      Manage Billing & Plans
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="company" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Agency Branding Details</CardTitle>
                <CardDescription>
                  This information is used to generate branded CVs and headers for candidate submissions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Agency/Company Name</Label>
                    <Input 
                      id="companyName" 
                      placeholder="e.g. TalentSource Pro" 
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyWebsite">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="companyWebsite" 
                        className="pl-9" 
                        placeholder="www.youragency.com"
                        value={companyWebsite}
                        onChange={(e) => setJobSpecUrl(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Business Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="companyEmail" 
                        className="pl-9" 
                        placeholder="contact@youragency.com"
                        value={companyEmail}
                        onChange={(e) => setCompanyEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyAddress">Location/Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="companyAddress" 
                        className="pl-9" 
                        placeholder="City, Country"
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Agency Logo</Label>
                  <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/20">
                    {companyLogo ? (
                      <div className="relative h-16 w-16 bg-white border rounded p-1">
                        <img src={companyLogo} alt="Preview" className="h-full w-full object-contain" />
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                          onClick={() => setCompanyLogo('')}
                        >
                          ×
                        </Button>
                      </div>
                    ) : (
                      <div className="h-16 w-16 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground">
                        <Building size={24} />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">Upload high-resolution logo</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG recommended. Max 2MB.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                      <UploadCloud size={16} className="mr-2" /> Select Logo
                    </Button>
                    <input 
                      ref={logoInputRef}
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleLogoUpload}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <Button onClick={handleSaveCompany} className="ml-auto">
                  <Save size={16} className="mr-2" /> Save Company Profile
                </Button>
              </CardFooter>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Preview Header</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 border rounded-lg bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b pb-3 mb-3">
                      {companyLogo ? (
                        <img src={companyLogo} alt="Logo" className="h-8 object-contain" />
                      ) : (
                        <div className="h-8 w-8 bg-primary/10 rounded flex items-center justify-center text-primary font-bold">
                          {companyName?.charAt(0) || 'A'}
                        </div>
                      )}
                      <div className="text-right">
                        <p className="text-xs font-bold text-primary uppercase">{companyName || 'Your Agency Name'}</p>
                        <p className="text-[10px] text-muted-foreground">{companyWebsite || 'www.agency.com'}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 w-2/3 bg-muted rounded animate-pulse" />
                      <div className="h-2 w-1/2 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground italic">
                    * This is how your agency header will appear on generated Branded CVs.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
