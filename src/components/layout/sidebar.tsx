
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Briefcase,
  LogOut, 
  User,
  HelpCircle,
} from 'lucide-react';

import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getNavLinksForRole, isNavLinkActive } from '@/lib/nav-utils';


export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }
  
  const accessibleGroups = getNavLinksForRole(user.role);


  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-r h-screen sticky top-0">
      <div className="flex flex-col items-center justify-center h-20 border-b px-6">
         <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <Briefcase className="h-7 w-7 text-primary" />
          <span>RecruitedAI</span>
        </Link>
        <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-bold">2026 Enterprise Edition</div>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-6 overflow-y-auto">
        {accessibleGroups.map((group) => (
          <div key={group.title}>
            <h3 className="px-3 py-2 text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/5 rounded-sm mb-2">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.links.map((link) => {
                const isActive = isNavLinkActive(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-primary hover:bg-muted',
                      isActive && 'bg-muted text-primary'
                    )}
                  >
                    {link.icon}
                    <span className="flex-1">{link.label}</span>
                     {link.badge && <Badge variant="outline" className="text-[9px] h-4 bg-primary/10 text-primary border-primary/20">{link.badge}</Badge>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto p-4 border-t space-y-1 bg-muted/10">
         <Button variant="ghost" asChild className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-muted">
              <Link href="/profile">
                  <User className="h-5 w-5 mr-3" />
                  Profile & Billing
              </Link>
          </Button>
          <Button variant="ghost" asChild className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-muted">
              <Link href="/about">
                  <HelpCircle className="h-5 w-5 mr-3" />
                  Strategy & About
              </Link>
          </Button>
          <Button variant="ghost" onClick={logout} className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5 mt-2">
            <LogOut className="h-5 w-5 mr-3" />
            Log Out
          </Button>
      </div>
    </aside>
  );
}
