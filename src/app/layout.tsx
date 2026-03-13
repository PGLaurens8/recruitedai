
'use client'; 

import './globals.css';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { type ReactNode } from 'react';

import { useAuth } from '@/context/auth-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Toaster } from "@/components/ui/toaster";
import { Spinner } from '@/components/ui/spinner';
import { Header } from '@/components/layout/header';
import { AppProviders } from '@/components/providers/app-providers';
import { getDefaultRouteForRole, isPublicPath, isRoleAllowedForPath } from '@/lib/rbac';


function RootLayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  const isAuthUIPage = isPublicPath(pathname);
  const isAuthorizedForRoute = !!user && isRoleAllowedForPath(user.role, pathname);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !isAuthUIPage && !isAuthorizedForRoute) {
      router.replace(getDefaultRouteForRole(user.role));
    }
  }, [isLoading, isAuthenticated, user, isAuthUIPage, isAuthorizedForRoute, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Spinner size={48} />
      </div>
    );
  }

  if (isAuthenticated && !isAuthUIPage) {
    if (!user || !isAuthorizedForRoute) {
      return (
        <div className="flex items-center justify-center h-screen bg-background">
          <Spinner size={48} />
        </div>
      );
    }

    return (
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <div className="flex flex-col flex-1">
          <Header />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/30">{children}</main>
        </div>
      </div>
    );
  }
  
  return (
    <div>
        {children}
    </div>
  );
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
       <head>
        <title>RecruitedAI</title>
        <meta name="description" content="AI-Powered Recruiting & Career Tools"/>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <AppProviders>
          <RootLayoutContent>{children}</RootLayoutContent>
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
