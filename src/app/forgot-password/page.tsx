"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getRuntimeMode } from "@/lib/runtime-mode";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const runtimeMode = getRuntimeMode();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (runtimeMode !== "supabase") {
      toast({
        variant: "destructive",
        title: "Unavailable in mock mode",
        description: "Password reset is available only when Supabase runtime is enabled.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        throw error;
      }

      toast({
        title: "Reset email sent",
        description: "Check your inbox for a password reset link.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Could not send reset email",
        description: error.message || "Please verify the email and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-15rem)] py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>Enter your account email and we will send reset instructions.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
