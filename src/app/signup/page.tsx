
"use client";

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Briefcase, User, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';

type AccountType = 'personal' | 'company';

function SignupForm() {
  const { signup, authConfigError } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirectTo') ?? undefined;
  const [accountType, setAccountType] = useState<AccountType>('personal');
  const [companyName, setCompanyName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      const result = await signup(email, password, fullName || undefined, {
        accountType,
        companyName: accountType === 'company' ? companyName.trim() : undefined,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      }, redirectTo);
      if (result.requiresEmailConfirmation) {
        toast({
          title: 'Confirm your email',
          description: 'Your account was created. Open the confirmation email, then sign in.',
        });
      } else {
        toast({
          title: 'Account created',
          description: 'Your account is ready and you have been signed in.',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign up failed',
        description: error.message || 'Please review your details and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full lg:grid min-h-screen lg:grid-cols-2">
        <div className="flex items-center justify-center py-12">
            <Card className="mx-auto max-w-sm">
            <CardHeader>
                <CardTitle className="text-xl">Create your account</CardTitle>
            <CardDescription>
                Enter your information to get started with RecruitedAI.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {authConfigError && (
                  <Alert className="mb-4 border-destructive/50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Authentication is misconfigured</AlertTitle>
                    <AlertDescription>{authConfigError}</AlertDescription>
                  </Alert>
                )}
                <form onSubmit={handleSubmit} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Account Type</Label>
                    <RadioGroup defaultValue="personal" onValueChange={(value) => setAccountType(value as AccountType)} className="grid grid-cols-2 gap-4">
                      <div>
                        <RadioGroupItem value="personal" id="personal" className="peer sr-only" />
                        <Label
                          htmlFor="personal"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <User className="mb-3 h-6 w-6" />
                          Personal
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="company" id="company" className="peer sr-only" />
                        <Label
                          htmlFor="company"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <Briefcase className="mb-3 h-6 w-6" />
                          Company
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                
                  {accountType === 'company' && (
                    <div className="grid gap-2">
                      <Label htmlFor="organization-name">Company Name</Label>
                      <Input
                        id="organization-name"
                        autoComplete="organization"
                        placeholder="Acme Inc."
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                      <Label htmlFor="first-name">First name</Label>
                      <Input id="first-name" autoComplete="given-name" placeholder="Max" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                      </div>
                      <div className="grid gap-2">
                      <Label htmlFor="last-name">Last name</Label>
                      <Input id="last-name" autoComplete="family-name" placeholder="Robinson" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                      </div>
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                      id="email"
                      type="email"
                      autoComplete="username"
                      placeholder="m@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      />
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting || !!authConfigError}>
                      {isSubmitting ? 'Creating account...' : 'Create an account'}
                  </Button>
                </form>
                <div className="mt-4 text-center text-sm">
                  Already have an account?{" "}
                  <Link href="/login" className="underline">
                      Sign in
                  </Link>
                </div>
            </CardContent>
            </Card>
        </div>
      <div className="hidden bg-gradient-to-br from-indigo-600 to-blue-700 lg:flex flex-col items-center justify-center p-12 text-white text-center">
         <Briefcase className="h-20 w-20 mb-6 text-indigo-200" />
         <h1 className="text-5xl font-bold mb-4">RecruitedAI</h1>
         <p className="text-xl text-indigo-200">AI-Powered Recruiting & Career Tools</p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
