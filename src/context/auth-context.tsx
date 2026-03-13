'use client';

import React, { createContext, useContext, ReactNode, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getRuntimeMode, isMockMode, isSupabaseMode } from '@/lib/runtime-mode';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getDefaultRouteForRole, isPublicPath } from '@/lib/rbac';
import { type Role } from '@/lib/roles';

export interface AppUser {
  id?: string;
  name: string;
  role: Role;
  email: string;
  companyId: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AppUser | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  runtimeMode: ReturnType<typeof getRuntimeMode>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_STORAGE_KEY = 'recruitedai.mock-user';

function normalizeUser(partial: Partial<AppUser> & { email: string }): AppUser {
  const fallbackName = partial.name || partial.email.split('@')[0] || 'User';
  const fallbackCompanyId = partial.companyId || partial.id || partial.email;

  return {
    id: partial.id,
    name: fallbackName,
    role: partial.role || 'Recruiter',
    email: partial.email,
    companyId: fallbackCompanyId,
  };
}

async function loadSupabaseProfile(userId: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, role, company_id')
    .eq('id', userId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

function handleRedirect(router: ReturnType<typeof useRouter>, role: Role) {
  router.push(getDefaultRouteForRole(role));
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const runtimeMode = useMemo(() => getRuntimeMode(), []);

  useEffect(() => {
    const pathIsPublic = isPublicPath(pathname);

    if (isMockMode()) {
      const raw = window.localStorage.getItem(MOCK_STORAGE_KEY);

      if (raw) {
        try {
          const nextUser = JSON.parse(raw) as AppUser;
          setUser(nextUser);
          if (pathIsPublic) {
            handleRedirect(router, nextUser.role);
          }
        } catch {
          window.localStorage.removeItem(MOCK_STORAGE_KEY);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setIsLoading(false);
      if (!raw && !pathIsPublic) {
        router.push('/login');
      }
      return;
    }

    if (isSupabaseMode()) {
      const supabase = createSupabaseBrowserClient();

      const bootstrap = async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setUser(null);
          if (!pathIsPublic) {
            router.push('/login');
          }
          setIsLoading(false);
          return;
        }

        const profile = await loadSupabaseProfile(session.user.id);
        const nextUser = normalizeUser({
          id: profile?.id || session.user.id,
          email: profile?.email || session.user.email || '',
          name:
            profile?.name ||
            (session.user.user_metadata.name as string | undefined) ||
            (session.user.user_metadata.full_name as string | undefined) ||
            undefined,
          companyId:
            profile?.company_id ||
            (session.user.user_metadata.company_id as string | undefined) ||
            session.user.id,
          role:
            (profile?.role as Role | undefined) ||
            (session.user.user_metadata.role as Role | undefined) ||
            'Recruiter',
        });

        setUser(nextUser);
        if (pathIsPublic) {
          handleRedirect(router, nextUser.role);
        }
        setIsLoading(false);
      };

      bootstrap();

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session?.user) {
          setUser(null);
          if (!isPublicPath(pathname)) {
            router.push('/login');
          }
          return;
        }

        void loadSupabaseProfile(session.user.id).then((profile) => {
          const nextUser = normalizeUser({
            id: profile?.id || session.user.id,
            email: profile?.email || session.user.email || '',
            name:
              profile?.name ||
              (session.user.user_metadata.name as string | undefined) ||
              (session.user.user_metadata.full_name as string | undefined) ||
              undefined,
            companyId:
              profile?.company_id ||
              (session.user.user_metadata.company_id as string | undefined) ||
              session.user.id,
            role:
              (profile?.role as Role | undefined) ||
              (session.user.user_metadata.role as Role | undefined) ||
              'Recruiter',
          });

          setUser(nextUser);
        });
      });

      return () => subscription.unsubscribe();
    }

    setUser(null);
    setIsLoading(false);
    if (!pathIsPublic) {
      router.push('/login');
    }
    return;
  }, [pathname, router, runtimeMode]);

  const login = async (email: string, password: string) => {
    if (isMockMode()) {
      const nextUser = normalizeUser({
        id: email,
        email,
        name: email.split('@')[0] || 'Demo User',
        companyId: 'mock-company',
        role: 'Recruiter',
      });

      window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
      handleRedirect(router, nextUser.role);
      return;
    }

    if (isSupabaseMode()) {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
      return;
    }

    throw new Error('Unsupported runtime mode.');
  };

  const signup = async (email: string, password: string, name?: string) => {
    if (isMockMode()) {
      const nextUser = normalizeUser({
        id: email,
        email,
        name: name || email.split('@')[0] || 'Demo User',
        companyId: 'mock-company',
        role: 'Recruiter',
      });

      window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
      handleRedirect(router, nextUser.role);
      return;
    }

    if (isSupabaseMode()) {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0],
            role: 'Recruiter',
          },
        },
      });

      if (error) {
        throw error;
      }

      return;
    }

    throw new Error('Unsupported runtime mode.');
  };

  const logout = async () => {
    setUser(null);

    if (isMockMode()) {
      window.localStorage.removeItem(MOCK_STORAGE_KEY);
      router.push('/');
      return;
    }

    if (isSupabaseMode()) {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      router.push('/');
      return;
    }

    throw new Error('Unsupported runtime mode.');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        login,
        signup,
        logout,
        isLoading,
        runtimeMode,
      }}
    >
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
