
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
  UserCheck
} from 'lucide-react';

export interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
  badge?: 'Premium';
}

export interface NavGroup {
  title: string;
  roles: Role[];
  links: NavLink[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Main Features',
    roles: ['Admin', 'Recruiter', 'Sales'],
    links: [
      { href: '/dashboard/admin', label: 'Dashboard', icon: React.createElement(LayoutDashboard, { size: 18 }), roles: ['Admin', 'Recruiter', 'Sales'] },
      { href: '/candidates', label: 'Candidates', icon: React.createElement(Users, { size: 18 }), roles: ['Admin', 'Recruiter'] },
      { href: '/jobs', label: 'Jobs', icon: React.createElement(Briefcase, { size: 18 }), roles: ['Admin', 'Recruiter', 'Sales'] },
      { href: '/clients', label: 'Clients', icon: React.createElement(Building, { size: 18 }), roles: ['Admin', 'Recruiter', 'Sales'] },
      { href: '/company-finder', label: 'Company Finder', icon: React.createElement(Search, { size: 18 }), roles: ['Admin', 'Recruiter'] },
      { href: '/ai-parser', label: 'Job Matcher', icon: React.createElement(ScanText, { size: 18 }), roles: ['Admin', 'Recruiter'] },
      { href: '/candidate-profiles', label: 'Candidate Profiles', icon: React.createElement(UserCheck, { size: 18 }), roles: ['Admin', 'Recruiter'] },
      { href: '/reports', label: 'Reports', icon: React.createElement(BarChart, { size: 18 }), roles: ['Admin', 'Sales'] },
    ]
  },
  {
    title: 'Candidate Tools',
    roles: ['Admin', 'Candidate'],
    links: [
      { href: '/dashboard', label: 'Dashboard', icon: React.createElement(LayoutDashboard, { size: 18 }), roles: ['Candidate'] },
      { href: '/master-resume', label: 'Master Resume', icon: React.createElement(FileText, { size: 18 }), roles: ['Admin', 'Candidate'], badge: 'Premium' },
      { href: '/targeted-resume', label: 'Job Matching', icon: React.createElement(Bot, { size: 18 }), roles: ['Candidate'] },
      { href: '/online-resume', label: 'Online Profile', icon: React.createElement(User, { size: 18 }), roles: ['Candidate'] },
      { href: '/linktree-bio', label: 'LinkTree Bio', icon: React.createElement(LinkIcon, { size: 18 }), roles: ['Candidate'] },
      { href: '/interview-prep', label: 'Interview Prep', icon: React.createElement(ClipboardCheck, { size: 18 }), roles: ['Admin', 'Candidate', 'Recruiter'] },
    ]
  },
   {
    title: 'System',
    roles: ['Admin'],
    links: [
       { href: '/settings', label: 'Settings', icon: React.createElement(Settings, { size: 18 }), roles: ['Admin'] },
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

    // Special case for recruiter/sales/admin seeing the correct dashboard link
    if (role === 'Recruiter' || role === 'Sales' || role === 'Admin') {
        const adminDashboardLink = navGroups[0].links.find(l => l.href === '/dashboard/admin');
        if (adminDashboardLink) {
            let dashboardHref = '/dashboard/recruiter'; // default
            if (role === 'Sales') dashboardHref = '/dashboard/sales';
            if (role === 'Admin') dashboardHref = '/dashboard/admin';
            
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
   if (role === 'Candidate') {
       const candidateDashboard = accessibleGroups.find(g => g.title === 'Candidate Tools');
       if(candidateDashboard) {
           const dashboardIndex = candidateDashboard.links.findIndex(l => l.href === '/dashboard');
           if (dashboardIndex === -1) {
               candidateDashboard.links.unshift({ href: '/dashboard', label: 'Dashboard', icon: React.createElement(LayoutDashboard, { size: 18 }), roles: ['Candidate'] });
           }
       }
   }
   
   return accessibleGroups;
}
