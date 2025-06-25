
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Briefcase, 
  LayoutDashboard, 
  FileText, 
  Users, 
  LogOut, 
  Settings, 
  Bot,
  User,
  Link as LinkIcon,
  BarChart,
  Wallet
} from 'lucide-react';

import { useAuth, type Role } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
}

const navLinks: NavLink[] = [
  // Candidate
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20}/>, roles: ['Candidate'] },
  { href: '/master-resume', label: 'Resume Builder', icon: <FileText size={20}/>, roles: ['Candidate'] },
  { href: '/targeted-resume', label: 'Job Matching', icon: <Bot size={20}/>, roles: ['Candidate'] },
  { href: '/online-resume', label: 'Online Profile', icon: <User size={20}/>, roles: ['Candidate'] },
  { href: '/linktree-bio', label: 'LinkTree Bio', icon: <LinkIcon size={20}/>, roles: ['Candidate'] },

  // Recruiter & Admin
  { href: '/dashboard/recruiter', label: 'Dashboard', icon: <LayoutDashboard size={20}/>, roles: ['Recruiter', 'Admin', 'Sales'] },
  { href: '/candidates', label: 'Candidates', icon: <Users size={20}/>, roles: ['Recruiter', 'Admin'] },
  { href: '/jobs', label: 'Jobs', icon: <Briefcase size={20}/>, roles: ['Recruiter', 'Admin', 'Sales'] },
  { href: '/clients', label: 'Clients', icon: <Wallet size={20}/>, roles: ['Recruiter', 'Admin', 'Sales'] },
  { href: '/reports', label: 'Reports', icon: <BarChart size={20}/>, roles: ['Admin', 'Sales'] },
  
  // Admin only
  { href: '/settings', label: 'Settings', icon: <Settings size={20}/>, roles: ['Admin'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const accessibleLinks = user ? navLinks.filter(link => link.roles.includes(user.role)) : [];

  if (!user) {
    return null;
  }

  return (
    <TooltipProvider>
      <aside className="hidden md:flex flex-col w-64 bg-card border-r h-screen sticky top-0">
        <div className="flex items-center justify-center h-16 border-b px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Briefcase className="h-6 w-6 text-primary" />
            <span className="text-lg">TalentAI</span>
          </Link>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          {accessibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted',
                pathname === link.href && 'bg-muted text-primary font-medium'
              )}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto p-4 border-t">
          <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src="https://placehold.co/40x40.png" data-ai-hint="profile avatar" />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold text-sm truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.role}</p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={logout} className="rounded-full">
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Log Out</p>
                </TooltipContent>
              </Tooltip>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
