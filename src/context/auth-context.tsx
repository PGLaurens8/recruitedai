
'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export type Role = 'Admin' | 'Recruiter' | 'Sales' | 'Candidate';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { name: string; role: Role } | null;
  login: (role: Role) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<{ name: string; role: Role } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const storedRole = localStorage.getItem('userRole') as Role;
      if (storedRole) {
        setUser({ name: 'Demo User', role: storedRole });
        if (pathname === '/' || pathname === '/login') {
            handleRedirect(storedRole);
        }
      } else {
        if (!['/','/login','/signup'].includes(pathname)) {
            router.push('/');
        }
      }
    } catch (error) {
        console.error("Could not access local storage", error);
    }
    finally {
      setIsLoading(false);
    }
  }, [pathname, router]);

  const handleRedirect = (role: Role) => {
     switch (role) {
      case 'Admin':
        router.push('/dashboard/admin');
        break;
      case 'Recruiter':
        router.push('/dashboard/recruiter');
        break;
      case 'Sales':
        router.push('/dashboard/sales');
        break;
      case 'Candidate':
      default:
        router.push('/dashboard'); 
    }
  }

  const login = (selectedRole: Role) => {
    const newUser = { name: 'Demo User', role: selectedRole };
    setUser(newUser);
    localStorage.setItem('userRole', selectedRole);
    handleRedirect(selectedRole);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userRole');
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
