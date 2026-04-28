'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAuth } from '@/context/auth-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { Spinner } from '@/components/ui/spinner';
import { Header } from '@/components/layout/header';
import { AppProviders } from '@/components/providers/app-providers';
import { getDefaultRouteForRole, isPublicPath, isRoleAllowedForPath } from '@/lib/rbac';

function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
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

  return <div>{children}</div>;
}

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <LayoutShell>{children}</LayoutShell>
      <Toaster />
    </AppProviders>
  );
}
