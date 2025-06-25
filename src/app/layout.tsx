
'use client'; 

import './globals.css';

import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';

import { AuthProvider, useAuth } from '@/context/auth-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Toaster } from "@/components/ui/toaster";
import { Spinner } from '@/components/ui/spinner';


function RootLayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  const isAuthUIPage = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Spinner size={48} />
      </div>
    );
  }

  if (isAuthenticated && !isAuthUIPage) {
    return (
      <div className={`flex min-h-screen bg-muted/30`}>
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
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
        <title>TalentAI Platform</title>
        <meta name="description" content="AI-Powered Recruiting & Career Tools"/>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <RootLayoutContent>{children}</RootLayoutContent>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
