
'use client';

import React from 'react';
import { type Role } from '@/context/auth-context';
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
  FileSearch,
  Database
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
    title: 'Main Features',
    roles: ['Admin', 'Recruiter', 'Sales', 'Developer'],
    links: [
      { href: '/dashboard/admin', label: 'Dashboard', icon: React.createElement(LayoutDashboard, { size: 18 }), roles: ['Admin', 'Recruiter', 'Sales', 'Developer'] },
      { href: '/candidates', label: 'Candidates', icon: React.createElement(Users, { size: 18 }), roles: ['Admin', 'Recruiter', 'Developer'] },
      { href: '/jobs', label: 'Jobs', icon: React.createElement(Briefcase, { size: 18 }), roles: ['Admin', 'Recruiter', 'Sales', 'Developer'] },
      { href: '/clients', label: 'Clients', icon: React.createElement(Building, { size: 18 }), roles: ['Admin', 'Recruiter', 'Sales', 'Developer'] },
      { href: '/company-finder', label: 'Company Finder', icon: React.createElement(Search, { size: 18 }), roles: ['Admin', 'Recruiter', 'Developer'] },
      { href: '/ai-parser', label: 'Smart Parser & Match', icon: React.createElement(ScanText, { size: 18 }), roles: ['Admin', 'Recruiter', 'Developer'], badge: 'New' },
      { href: '/interview-analysis', label: 'Interview Analysis', icon: React.createElement(FileSearch, { size: 18 }), roles: ['Admin', 'Recruiter', 'Developer'], badge: 'New' },
      { href: '/candidate-profiles', label: 'Candidate Notes', icon: React.createElement(UserCheck, { size: 18 }), roles: ['Admin', 'Recruiter', 'Developer'] },
      { href: '/reports', label: 'Reports', icon: React.createElement(BarChart, { size: 18 }), roles: ['Admin', 'Sales', 'Developer'] },
    ]
  },
  {
    title: 'Candidate Tools',
    roles: ['Admin', 'Candidate', 'Developer'],
    links: [
      { href: '/dashboard', label: 'Dashboard', icon: React.createElement(LayoutDashboard, { size: 18 }), roles: ['Candidate', 'Developer'] },
      { href: '/master-resume', label: 'Master Resume', icon: React.createElement(FileText, { size: 18 }), roles: ['Admin', 'Candidate', 'Developer'], badge: 'Premium' },
      { href: '/targeted-resume', label: 'Job Matching', icon: React.createElement(Bot, { size: 18 }), roles: ['Candidate', 'Developer'] },
      { href: '/online-resume', label: 'Online Profile', icon: React.createElement(User, { size: 18 }), roles: ['Candidate', 'Developer'] },
      { href: '/linktree-bio', label: 'LinkTree Bio', icon: React.createElement(LinkIcon, { size: 18 }), roles: ['Candidate', 'Developer'] },
      { href: '/interview-prep', label: 'Interview Prep', icon: React.createElement(ClipboardCheck, { size: 18 }), roles: ['Admin', 'Candidate', 'Recruiter', 'Developer'] },
    ]
  },
   {
    title: 'System',
    roles: ['Admin', 'Developer'],
    links: [
       { href: '/settings', label: 'Settings', icon: React.createElement(Settings, { size: 18 }), roles: ['Admin', 'Developer'] },
    ]
   }
];


export function getNavLinksForRole(role: Role) {
    let accessibleGroups = navGroups
    .map(group => ({
      ...group,
      links: group.links.filter(link => link.roles.includes(role))
    }))
    .filter(group => group.links.length > 0 && group.roles.includes(role));

    // Special case for recruiter/sales/admin/developer seeing the correct dashboard link
    if (role === 'Recruiter' || role === 'Sales' || role === 'Admin' || role === 'Developer') {
        const adminDashboardLink = navGroups[0].links.find(l => l.href === '/dashboard/admin');
        if (adminDashboardLink) {
            let dashboardHref = '/dashboard/recruiter'; // default
            if (role === 'Sales') dashboardHref = '/dashboard/sales';
            if (role === 'Admin' || role === 'Developer') dashboardHref = '/dashboard/admin';
            
            const newDashboardLink = {...adminDashboardLink, href: dashboardHref};
            const mainFeaturesGroup = accessibleGroups.find(g => g.title === 'Main Features');
            if (mainFeaturesGroup) {
                const dashboardIndex = mainFeaturesGroup.links.findIndex(l => l.href === '/dashboard/admin');
                if (dashboardIndex !== -1) {
                    mainFeaturesGroup.links[dashboardIndex] = newDashboardLink;
                } else {
                     mainFeaturesGroup.links.unshift(newDashboardLink);
                }
            }
        }
    }
   // Special case for candidate seeing their dashboard link
   if (role === 'Candidate' || role === 'Developer') {
       const candidateDashboard = accessibleGroups.find(g => g.title === 'Candidate Tools');
       if(candidateDashboard) {
           const dashboardIndex = candidateDashboard.links.findIndex(l => l.href === '/dashboard');
           if (dashboardIndex === -1) {
               candidateDashboard.links.unshift({ href: '/dashboard', label: 'Dashboard', icon: React.createElement(LayoutDashboard, { size: 18 }), roles: ['Candidate', 'Developer'] });
           }
       }
   }
   
   return accessibleGroups;
}
