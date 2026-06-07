
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  CreditCard,
  HelpCircle,
  LogOut,
  User,
} from 'lucide-react';

import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getNavLinksForRole, isNavLinkActive } from '@/lib/nav-utils';
import { isInternalUser } from '@/lib/internal-access';


export function Sidebar() {
  const pathname = usePathname() ?? "/";
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }
  
  const accessibleGroups = getNavLinksForRole(user.role);


  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 h-screen sticky top-0">
      <div className="flex flex-col items-center justify-center h-20 border-b border-slate-800 px-6">
         <Link href="/" className="flex items-center gap-2 font-semibold text-lg text-white">
          <Briefcase className="h-7 w-7 text-blue-400" />
          <span>RecruitedAI</span>
        </Link>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-6 overflow-y-auto">
        {accessibleGroups.map((group) => (
          <div key={group.title || group.links[0]?.href}>
            {group.title && (
              <h3 className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                {group.title}
              </h3>
            )}
            <div className="space-y-1">
              {group.links.map((link) => {
                const isActive = isNavLinkActive(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-all hover:text-white hover:bg-slate-800',
                      isActive && 'bg-blue-500 text-white hover:bg-blue-500 hover:text-white'
                    )}
                  >
                    {link.icon}
                    <span className="flex-1">{link.label}</span>
                     {link.badge && <Badge variant="outline" className={cn(
                       'text-[9px] h-4',
                       link.badge === 'Beta'
                         ? 'bg-slate-800 text-slate-300 border-slate-700'
                         : 'bg-blue-500/20 text-blue-200 border-blue-400/30'
                     )}>{link.badge}</Badge>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto p-4 border-t border-slate-800 space-y-1">
         <Button variant="ghost" asChild className="w-full justify-start text-sm text-slate-400 hover:text-white hover:bg-slate-800">
              <Link href="/profile">
                  <User className="h-4 w-4 mr-3" />
                  Profile
              </Link>
          </Button>
          <Button variant="ghost" asChild className="w-full justify-start text-sm text-slate-400 hover:text-white hover:bg-slate-800">
              <Link href="/billing">
                  <CreditCard className="h-4 w-4 mr-3" />
                  Subscription
              </Link>
          </Button>
          {isInternalUser(user.email) && (
            <Button variant="ghost" asChild className="w-full justify-start text-sm text-slate-400 hover:text-white hover:bg-slate-800">
                <Link href="/about">
                    <HelpCircle className="h-4 w-4 mr-3" />
                    About
                </Link>
            </Button>
          )}
          <Button variant="ghost" onClick={logout} className="w-full justify-start text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 mt-2">
            <LogOut className="h-4 w-4 mr-3" />
            Log Out
          </Button>
      </div>
    </aside>
  );
}
