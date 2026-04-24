"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Briefcase, RefreshCw } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function LoginPage() {
  const { login, runtimeMode, authConfigError } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionReason = searchParams?.get("reason");
  const resetStatus = searchParams?.get("reset");

  const statusMessage = useMemo(() => {
    if (sessionReason === "session-expired") {
      return "Your session expired. Please sign in again.";
    }

    if (resetStatus === "success") {
      return "Password updated successfully. You can sign in now.";
    }

    return null;
  }, [resetStatus, sessionReason]);

  useEffect(() => {
    if (statusMessage) {
      toast({
        title: "Authentication",
        description: statusMessage,
      });
    }
  }, [statusMessage, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authConfigError) return;
    
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: error.message || "Please check your email and password.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail("demo@dem.com");
    setPassword("demo");
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-15rem)] py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-1">
          <Briefcase className="mx-auto h-10 w-10 text-primary" />
          <CardTitle className="text-2xl font-bold font-headline">Welcome Back</CardTitle>
          <CardDescription>Log in to access your RecruitedAI dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {authConfigError && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>System Configuration Error</AlertTitle>
              <AlertDescription className="text-xs space-y-2">
                <p>{authConfigError}</p>
                <div className="pt-2 border-t border-destructive/10">
                  <p className="font-bold">Troubleshooting:</p>
                  <ol className="list-decimal pl-4 mt-1 space-y-1">
                    <li>Verify variables in your host (Vercel) settings.</li>
                    <li>Ensure <strong>NEXT_PUBLIC_RUNTIME_MODE</strong> is "supabase".</li>
                    <li><strong>Crucial:</strong> Trigger a manual "Redeploy" in Vercel to apply the changes.</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {statusMessage && (
            <div className="rounded-md border bg-muted px-3 py-2 text-sm text-foreground">
              {statusMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!authConfigError}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={!!authConfigError}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || !!authConfigError}>
              {isSubmitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? "Signing In..." : "Log In"}
            </Button>
          </form>

          {runtimeMode === "mock" && (
            <Button type="button" variant="outline" className="w-full" onClick={fillDemoCredentials}>
              Use Demo Credentials
            </Button>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-sm">
          {runtimeMode === "mock" && (
            <p className="text-muted-foreground text-center">
              Demo user: <span className="font-medium">demo@dem.com</span> / <span className="font-medium">demo</span>
            </p>
          )}
          <p className="text-muted-foreground">
            Do not have an account{" "}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
