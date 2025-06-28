
'use client';

import { useAuth } from '@/context/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user } = useAuth();
  const avatarFallback = user?.name?.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || 'U';

  if (!user) {
    return null; // Or a loading spinner/redirect
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account settings and subscription plan.
        </p>
      </div>

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
    </div>
  );
}
