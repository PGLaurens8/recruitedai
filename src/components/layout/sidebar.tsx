
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LogOut, 
  User,
} from 'lucide-react';

import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getNavLinksForRole } from '@/lib/nav-utils';


export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }
  
  const accessibleGroups = getNavLinksForRole(user.role);


  return (
    <TooltipProvider>
      <aside className="hidden md:flex flex-col w-64 bg-card border-r h-screen sticky top-0">
        <div className="flex flex-col items-center justify-center h-20 border-b px-6">
           <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
            <Briefcase className="h-7 w-7 text-primary" />
            <span>RecruitedAI</span>
          </Link>
          <div className="text-sm text-muted-foreground mt-1 capitalize">{user.role}</div>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
          {accessibleGroups.map((group) => (
            <div key={group.title}>
              <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-primary hover:bg-muted',
                      (pathname === link.href || (link.href.includes(user.role) && pathname.includes(link.href))) && 'bg-muted text-primary'
                    )}
                  >
                    {link.icon}
                    <span className="flex-1">{link.label}</span>
                     {link.badge && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{link.badge}</Badge>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-auto p-4 border-t space-y-1">
           <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" asChild className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-muted">
                    <Link href="/profile">
                        <User className="h-5 w-5 mr-3" />
                        Profile
                    </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">
                <p>My Profile</p>
              </TooltipContent>
            </Tooltip>
           <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" onClick={logout} className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-muted">
                  <LogOut className="h-5 w-5 mr-3" />
                  Log Out
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">
                <p>Log Out</p>
              </TooltipContent>
            </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
