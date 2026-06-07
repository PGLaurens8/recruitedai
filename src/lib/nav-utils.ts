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
  HelpCircle
} from 'lucide-react';

export interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
  badge?: 'Beta' | 'New';
}

export interface NavGroup {
  title: string;
  roles: Role[];
  links: NavLink[];
}

const navGroups: NavGroup[] = [
  {
    // Headerless group — single primary dashboard per role, no section label needed.
    title: '',
    roles: ['Admin', 'Recruiter', 'Sales', 'Developer', 'Candidate'],
    links: [
      { href: '/dashboard/admin', label: 'Dashboard', icon: React.createElement(LayoutDashboard, { size: 18 }), roles: ['Admin', 'Recruiter', 'Sales', 'Developer'] },
      { href: '/dashboard/recruiter', label: 'Recruiter Dashboard', icon: React.createElement(LayoutDashboard, { size: 18 }), roles: ['Recruiter'] },
      { href: '/dashboard/sales', label: 'Sales Dashboard', icon: React.createElement(LayoutDashboard, { size: 18 }), roles: ['Admin', 'Developer', 'Sales'] },
      { href: '/dashboard', label: 'Candidate Dashboard', icon: React.createElement(LayoutDashboard, { size: 18 }), roles: ['Candidate'] },
    ]
  },
  {
    title: 'Candidates',
    roles: ['Admin', 'Recruiter', 'Developer'],
    links: [
      { href: '/candidates', label: 'Talent Pool', icon: React.createElement(Users, { size: 18 }), roles: ['Admin', 'Recruiter', 'Developer'] },
      { href: '/ai-parser', label: 'CV Screening', icon: React.createElement(ScanText, { size: 18 }), roles: ['Admin', 'Recruiter', 'Developer'], badge: 'New' },
      { href: '/interview-analysis', label: 'Interview Notes', icon: React.createElement(Mic, { size: 18 }), roles: ['Admin', 'Recruiter', 'Developer'], badge: 'New' },
      { href: '/candidate-profiles', label: 'Screening Tool', icon: React.createElement(UserCheck, { size: 18 }), roles: ['Admin', 'Recruiter', 'Developer'] },
    ]
  },
  {
    title: 'Business',
    roles: ['Admin', 'Recruiter', 'Sales', 'Developer'],
    links: [
      { href: '/jobs', label: 'Jobs', icon: React.createElement(Briefcase, { size: 18 }), roles: ['Admin', 'Recruiter', 'Sales', 'Developer'] },
      { href: '/clients', label: 'Clients', icon: React.createElement(Building, { size: 18 }), roles: ['Admin', 'Recruiter', 'Sales', 'Developer'] },
      { href: '/company-finder', label: 'Lead Finder', icon: React.createElement(Search, { size: 18 }), roles: ['Admin', 'Sales', 'Developer'] },
    ]
  },
  {
    title: 'Candidate Tools',
    roles: ['Admin', 'Candidate', 'Developer'],
    links: [
      { href: '/master-resume', label: 'Resume Builder', icon: React.createElement(FileText, { size: 18 }), roles: ['Admin', 'Candidate', 'Developer'], badge: 'Beta' },
      { href: '/targeted-resume', label: 'AI Job Matcher', icon: React.createElement(Target, { size: 18 }), roles: ['Candidate', 'Developer'] },
      { href: '/online-resume', label: 'Online Profile', icon: React.createElement(User, { size: 18 }), roles: ['Candidate', 'Developer'] },
      { href: '/linktree-bio', label: 'LinkTree Bio', icon: React.createElement(LinkIcon, { size: 18 }), roles: ['Candidate', 'Developer'] },
      { href: '/interview-prep', label: 'Interview Prep', icon: React.createElement(ClipboardCheck, { size: 18 }), roles: ['Admin', 'Candidate', 'Recruiter', 'Developer'] },
    ]
  },
  {
    title: 'Reports',
    roles: ['Admin', 'Sales', 'Developer'],
    links: [
      { href: '/reports', label: 'Reports & Analytics', icon: React.createElement(BarChart, { size: 18 }), roles: ['Admin', 'Sales', 'Developer'] },
    ]
  },
  {
    title: 'Settings',
    roles: ['Admin', 'Developer'],
    links: [
       { href: '/team', label: 'Team', icon: React.createElement(Users, { size: 18 }), roles: ['Admin', 'Developer'] },
       { href: '/settings', label: 'Settings', icon: React.createElement(Settings, { size: 18 }), roles: ['Admin', 'Developer'] },
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
