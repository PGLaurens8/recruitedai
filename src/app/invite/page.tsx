"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Briefcase, CheckCircle2, AlertTriangle, LogIn, UserPlus } from "lucide-react";
import { postJson } from "@/lib/api-client";

function InvitePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const token = searchParams?.get("token") ?? null;

  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If no token, show error immediately
  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
        <Card className="mx-auto max-w-md w-full">
          <CardHeader className="text-center">
            <Briefcase className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Invalid Invite</CardTitle>
            <CardDescription>This invite link is missing a token.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size={48} />
      </div>
    );
  }

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);
    try {
      await postJson("/api/company/invites/accept", { token });
      setAccepted(true);
      // Redirect to dashboard after a moment
      setTimeout(() => router.push("/dashboard/recruiter"), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to accept invite.");
    } finally {
      setIsAccepting(false);
    }
  };

  if (accepted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
        <Card className="mx-auto max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <CardTitle>You&apos;re in!</CardTitle>
            <CardDescription>Your account has been added to the agency. Redirecting to your dashboard...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
      <Card className="mx-auto max-w-md w-full">
        <CardHeader className="text-center">
          <Briefcase className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle>You&apos;ve been invited to join an agency</CardTitle>
          <CardDescription>
            {user
              ? `You are signed in as ${user.email}. Accept the invite below to join the agency workspace.`
              : "Sign in or create an account with the invited email address, then return to this link to accept."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Could not accept invite</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {user ? (
            <Button className="w-full" onClick={handleAccept} disabled={isAccepting}>
              {isAccepting ? (
                <><Spinner size={16} className="mr-2" /> Accepting...</>
              ) : (
                <><CheckCircle2 className="mr-2 h-4 w-4" /> Accept Invite</>
              )}
            </Button>
          ) : (
            <div className="grid gap-3">
              <Button className="w-full" asChild>
                <Link href={`/login?redirectTo=/invite?token=${token}`}>
                  <LogIn className="mr-2 h-4 w-4" /> Sign In to Accept
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/signup?redirectTo=/invite?token=${token}`}>
                  <UserPlus className="mr-2 h-4 w-4" /> Create Account First
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size={48} />
      </div>
    }>
      <InvitePageContent />
    </Suspense>
  );
}
