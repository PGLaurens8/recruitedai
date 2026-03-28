'use client';

import React from 'react';
import { type Role } from '@/lib/roles';
import { 
  Briefcase, 
  LayoutDashboard, 
  FileText, 
  Users,
  Settings, 
  Bot,
  User,
  Link as LinkIcon,
  BarChart,
  Building,
  Search,
  ScanText,
  ClipboardCheck,
  UserCheck,
  Mic,
  Target,
  Zap,
  HelpCircle,
  FilePlus2
} from 'lucide-react';

export interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
  badge?: 'Premium' | 'New';
}

export interface NavGroup {
  title: string;
  roles: Role[];
  links: NavLink[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Operational Dashboard',
    roles: ['Admin', 'Recruiter', 'Sales', 'Developer', 'Candidate'],
    links: [
      { href: '/dashboard/admin', label: 'Agency Overview', icon: React.createElement(LayoutDashboard, { size: 18 }), roles: ['Admin', 'Recruiter', 'Sales', 'Developer'] },
      { href: '/dashboard/recruiter', label: 'Recruiter Dashboard', icon: React.createElement(LayoutDashboard, { size: 18 }), roles: ['Recruiter'] },
      { href: '/dashboard/sales', label: 'Sales Dashboard', icon: React.createElement(LayoutDashboard, { size: 18 }), roles: ['Sales'] },
      { href: '/dashboard', label: 'Candidate Dashboard', icon: React.createElement(LayoutDashboard, { size: 18 }), roles: ['Candidate'] },
    ]
  },
  {
    title: 'Module: Talent Engine',
    roles: ['Admin', 'Recruiter', 'Developer'],
    links: [
      { href: '/candidates', label: 'Talent Pool', icon: React.createElement(Users, { size: 18 }), roles: ['Admin', 'Recruiter', 'Developer'] },
      { href: '/ai-parser', label: 'Smart Parser & Match', icon: React.createElement(ScanText, { size: 18 }), roles: ['Admin', 'Recruiter', 'Developer'], badge: 'New' },
      { href: '/interview-analysis', label: 'AI Note Taker', icon: React.createElement(Mic, { size: 18 }), roles: ['Admin', 'Recruiter', 'Developer'], badge: 'New' },
      { href: '/candidate-profiles', label: 'Screening Notes', icon: React.createElement(UserCheck, { size: 18 }), roles: ['Admin', 'Recruiter', 'Developer'] },
    ]
  },
  {
    title: 'Module: Business Hub',
    roles: ['Admin', 'Recruiter', 'Sales', 'Developer'],
    links: [
      { href: '/jobs', label: 'Job Board', icon: React.createElement(Briefcase, { size: 18 }), roles: ['Admin', 'Recruiter', 'Sales', 'Developer'] },
      { href: '/jobs/new', label: 'Job Brief Builder', icon: React.createElement(FilePlus2, { size: 18 }), roles: ['Admin', 'Recruiter', 'Sales', 'Developer'], badge: 'New' },
      { href: '/clients', label: 'Client CRM', icon: React.createElement(Building, { size: 18 }), roles: ['Admin', 'Recruiter', 'Sales', 'Developer'] },
      { href: '/company-finder', label: 'Smart Lead Finder', icon: React.createElement(Search, { size: 18 }), roles: ['Admin', 'Sales', 'Developer'] },
    ]
  },
  {
    title: 'Module: Candidate Portal',
    roles: ['Admin', 'Candidate', 'Developer'],
    links: [
      { href: '/master-resume', label: 'Resume Builder', icon: React.createElement(FileText, { size: 18 }), roles: ['Admin', 'Candidate', 'Developer'], badge: 'Premium' },
      { href: '/targeted-resume', label: 'AI Job Matcher', icon: React.createElement(Target, { size: 18 }), roles: ['Candidate', 'Developer'] },
      { href: '/online-resume', label: 'Online Profile', icon: React.createElement(User, { size: 18 }), roles: ['Candidate', 'Developer'] },
      { href: '/linktree-bio', label: 'LinkTree Bio', icon: React.createElement(LinkIcon, { size: 18 }), roles: ['Candidate', 'Developer'] },
      { href: '/interview-prep', label: 'Interview Prep', icon: React.createElement(ClipboardCheck, { size: 18 }), roles: ['Admin', 'Candidate', 'Recruiter', 'Developer'] },
    ]
  },
  {
    title: 'Strategic Insights',
    roles: ['Admin', 'Sales', 'Developer'],
    links: [
      { href: '/reports', label: 'Analytics & ROI', icon: React.createElement(BarChart, { size: 18 }), roles: ['Admin', 'Sales', 'Developer'] },
    ]
  },
  {
    title: 'System',
    roles: ['Admin', 'Developer'],
    links: [
       { href: '/settings', label: 'System Settings', icon: React.createElement(Settings, { size: 18 }), roles: ['Admin', 'Developer'] },
    ]
   }
];


export function getNavLinksForRole(role: Role) {
    return navGroups
    .map(group => ({
      ...group,
      links: group.links.filter(link => link.roles.includes(role))
    }))
    .filter(group => group.links.length > 0 && group.roles.includes(role));
}

export function isNavLinkActive(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
