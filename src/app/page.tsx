'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Briefcase } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';


export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: error.message || 'Please check your email and password.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <>
      <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
        <div className="flex items-center justify-center py-12">
          <div className="mx-auto grid w-[380px] gap-6">
            <div className="grid gap-2 text-center">
              <h1 className="text-3xl font-bold">Welcome Back</h1>
              <p className="text-balance text-muted-foreground">Sign in to your account</p>
            </div>
            <form onSubmit={handleLogin} className="grid gap-4">
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
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
            <Card className="bg-muted/50 border-dashed">
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">Secure Sign-In:</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
                <p>Use your registered account credentials.</p>
                <p>Create an account below if needed.</p>
              </CardContent>
            </Card>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="underline">
                Sign up
              </Link>
            </div>
          </div>
        </div>
        <div className="hidden bg-gradient-to-br from-indigo-600 to-blue-700 lg:flex flex-col items-center justify-center p-12 text-white text-center">
          <Briefcase className="h-20 w-20 mb-6 text-indigo-200" />
          <h1 className="text-5xl font-bold mb-4">RecruitedAI</h1>
          <p className="text-xl text-indigo-200">AI-Powered Recruiting & Career Tools</p>
        </div>
      </div>
    </>
  );
}
