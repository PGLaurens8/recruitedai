
'use client';

import { useState } from 'react';
import { useAuth, type Role } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Briefcase, Code } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const { login } = useAuth();
  const [role, setRole] = useState<Role>('Candidate');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(role);
  };

  return (
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
              <Input id="email" type="email" placeholder="m@example.com" defaultValue="demo@example.com" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" defaultValue="password" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select onValueChange={(value: Role) => setRole(value)} defaultValue={role}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    {role === 'Developer' ? <Code className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                    <SelectValue placeholder="Select a role" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Candidate">Candidate</SelectItem>
                  <SelectItem value="Recruiter">Recruiter</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Developer">Developer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>
           <Card className="bg-muted/50 border-dashed">
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-medium">Demo Credentials:</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
              <p>Email: any valid email</p>
              <p>Password: any 6+ characters</p>
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
  );
}
