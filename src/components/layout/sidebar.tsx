
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
  Building,
  Search,
  ScanText,
  ClipboardCheck,
  CreditCard,
  UserCheck
} from 'lucide-react';

import { useAuth, type Role } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  badge?: 'Premium';
}

interface NavGroup {
  title: string;
  roles: Role[];
  links: NavLink[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Main Features',
    roles: ['Admin', 'Recruiter', 'Sales'],
    links: [
      { href: '/dashboard/admin', label: 'Dashboard', icon: <LayoutDashboard size={18}/>, roles: ['Admin', 'Recruiter', 'Sales'] },
      { href: '/candidates', label: 'Candidates', icon: <Users size={18}/>, roles: ['Admin', 'Recruiter'] },
      { href: '/jobs', label: 'Jobs', icon: <Briefcase size={18}/>, roles: ['Admin', 'Recruiter', 'Sales'] },
      { href: '/clients', label: 'Clients', icon: <Building size={18}/>, roles: ['Admin', 'Recruiter', 'Sales'] },
      { href: '/company-finder', label: 'Company Finder', icon: <Search size={18}/>, roles: ['Admin', 'Recruiter'] },
      { href: '/ai-parser', label: 'Job Matcher', icon: <ScanText size={18}/>, roles: ['Admin', 'Recruiter'] },
      { href: '/reports', label: 'Reports', icon: <BarChart size={18}/>, roles: ['Admin', 'Sales'] },
    ]
  },
  {
    title: 'Candidate Tools',
    roles: ['Admin', 'Candidate'],
    links: [
      { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18}/>, roles: ['Candidate'] },
      { href: '/master-resume', label: 'Master Resume', icon: <FileText size={18}/>, roles: ['Admin', 'Candidate'], badge: 'Premium' },
      { href: '/targeted-resume', label: 'Job Matching', icon: <Bot size={18}/>, roles: ['Candidate'] },
      { href: '/online-resume', label: 'Online Profile', icon: <User size={18}/>, roles: ['Candidate'] },
      { href: '/linktree-bio', label: 'LinkTree Bio', icon: <LinkIcon size={18}/>, roles: ['Candidate'] },
      { href: '/interview-prep', label: 'Interview Prep', icon: <ClipboardCheck size={18}/>, roles: ['Admin', 'Candidate', 'Recruiter'] },
    ]
  },
   {
    title: 'System',
    roles: ['Admin'],
    links: [
       { href: '/settings', label: 'Settings', icon: <Settings size={18}/>, roles: ['Admin'] },
    ]
   }
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }
  
  const accessibleGroups = navGroups
    .map(group => ({
      ...group,
      links: group.links.filter(link => link.roles.includes(user.role))
    }))
    .filter(group => group.links.length > 0 && group.roles.includes(user.role));


  // Special case for recruiter/sales seeing the candidate dashboard link
   if (user.role === 'Recruiter' || user.role === 'Sales') {
    const adminDashboardLink = navGroups[0].links.find(l => l.href === '/dashboard/admin');
    if (adminDashboardLink) {
        let dashboardHref = '/dashboard/recruiter';
        if (user.role === 'Sales') dashboardHref = '/dashboard/sales';
        if (user.role === 'Admin') dashboardHref = '/dashboard/admin';
        
        const recruiterDashboardLink = {...adminDashboardLink, href: dashboardHref};
        const mainFeaturesGroup = accessibleGroups.find(g => g.title === 'Main Features');
        if (mainFeaturesGroup) {
            const dashboardIndex = mainFeaturesGroup.links.findIndex(l => l.href === '/dashboard/admin');
            if (dashboardIndex !== -1) {
                mainFeaturesGroup.links[dashboardIndex] = recruiterDashboardLink;
            } else {
                 mainFeaturesGroup.links.unshift(recruiterDashboardLink);
            }
        }
    }
   }
   if (user.role === 'Candidate') {
       const candidateDashboard = accessibleGroups.find(g => g.title === 'Candidate Tools');
       if(candidateDashboard) {
           const dashboardIndex = candidateDashboard.links.findIndex(l => l.href === '/dashboard');
           if (dashboardIndex === -1) {
               candidateDashboard.links.unshift({ href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18}/>, roles: ['Candidate'] });
           }
       }
   }


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
