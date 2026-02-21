
'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { initializeFirebase } from '@/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export type Role = 'Admin' | 'Recruiter' | 'Sales' | 'Candidate' | 'Developer';

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
    const { auth, firestore } = initializeFirebase();

    // Listen for Firebase Auth changes to sync profile
    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const storedRole = localStorage.getItem('userRole') as Role;
        if (storedRole) {
          // Determine default company for demo purposes
          const defaultCompanyId = storedRole === 'Developer' ? 'demo-agency-123' : 'default-company';
          
          // Sync the Demo Role to the Firestore User Profile for Security Rules
          const userRef = doc(firestore, 'users', fbUser.uid);
          setDoc(userRef, {
            id: fbUser.uid,
            name: 'Demo User',
            email: fbUser.email || 'demo@example.com',
            role: storedRole,
            companyId: defaultCompanyId,
            plan: 'free',
            onboardingStep: 'completed',
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(), // Required by schema
          }, { merge: true });
        }
      }
    });

    try {
      const storedRole = localStorage.getItem('userRole') as Role;
      if (storedRole) {
        setUser({ name: 'Demo User', role: storedRole });
        // Ensure signed in to Firebase if role exists
        if (!auth.currentUser) {
          signInAnonymously(auth);
        }
        if (pathname === '/' || pathname === '/login') {
            handleRedirect(storedRole);
        }
      } else {
        const publicPaths = ['/','/login','/signup'];
        const isPublic = publicPaths.some(p => pathname === p);
        if (!isPublic) {
            router.push('/');
        }
      }
    } catch (error) {
        console.error("Could not access local storage", error);
    }
    finally {
      setIsLoading(false);
    }

    return () => unsubscribeAuth();
  }, [pathname, router]);

  const handleRedirect = (role: Role) => {
     switch (role) {
      case 'Admin':
      case 'Developer':
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
    const { auth } = initializeFirebase();
    const newUser = { name: 'Demo User', role: selectedRole };
    setUser(newUser);
    localStorage.setItem('userRole', selectedRole);
    
    // Sign into Firebase to enable Security Rules
    signInAnonymously(auth);
    
    handleRedirect(selectedRole);
  };

  const logout = () => {
    const { auth } = initializeFirebase();
    setUser(null);
    localStorage.removeItem('userRole');
    auth.signOut();
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
