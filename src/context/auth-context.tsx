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

interface SignupMetadata {
  accountType?: 'personal' | 'company';
  companyName?: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AppUser | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    name?: string,
    metadata?: SignupMetadata
  ) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  runtimeMode: ReturnType<typeof getRuntimeMode>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_STORAGE_KEY = 'recruitedai.mock-user';
const MOCK_DEMO_EMAIL = 'demo@dem.com';
const MOCK_DEMO_PASSWORD = 'demo';
const TEMP_BYPASS_STORAGE_KEY = 'recruitedai.temp-enter-bypass';
const TEMP_BYPASS_COOKIE = 'recruitedai-enter-bypass';

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

function getTempBypassUser() {
  return normalizeUser({
    id: 'temp-bypass-user',
    email: 'temp-access@local',
    name: 'Temporary Access',
    companyId: 'temp-company',
    role: 'Recruiter',
  });
}

function isTempBypassEnabled() {
  const localFlag = window.localStorage.getItem(TEMP_BYPASS_STORAGE_KEY) === '1';
  const cookieFlag = document.cookie
    .split(';')
    .map((item) => item.trim())
    .some((item) => item === `${TEMP_BYPASS_COOKIE}=1`);

  return localFlag || cookieFlag;
}

function clearTempBypass() {
  window.localStorage.removeItem(TEMP_BYPASS_STORAGE_KEY);
  document.cookie = `${TEMP_BYPASS_COOKIE}=; path=/; max-age=0; samesite=lax`;
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

function normalizeSupabaseUser(
  sessionUser: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  },
  profile: {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
    company_id?: string;
  } | null
) {
  return normalizeUser({
    id: profile?.id || sessionUser.id,
    email: profile?.email || sessionUser.email || '',
    name:
      profile?.name ||
      (sessionUser.user_metadata?.name as string | undefined) ||
      (sessionUser.user_metadata?.full_name as string | undefined) ||
      undefined,
    companyId:
      profile?.company_id ||
      (sessionUser.user_metadata?.company_id as string | undefined) ||
      sessionUser.id,
    role:
      (profile?.role as Role | undefined) ||
      (sessionUser.user_metadata?.role as Role | undefined) ||
      'Recruiter',
  });
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
          if (isTempBypassEnabled()) {
            const bypassUser = getTempBypassUser();
            setUser(bypassUser);
            if (pathIsPublic) {
              handleRedirect(router, bypassUser.role);
            }
          } else {
            setUser(null);
            if (!pathIsPublic) {
              router.push('/login');
            }
          }

          setIsLoading(false);
          return;
        }

        clearTempBypass();
        const profile = await loadSupabaseProfile(session.user.id);
        const nextUser = normalizeSupabaseUser(session.user, profile);

        setUser(nextUser);
        if (pathIsPublic) {
          handleRedirect(router, nextUser.role);
        }
        setIsLoading(false);
      };

      void bootstrap();

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session?.user) {
          if (isTempBypassEnabled()) {
            setUser(getTempBypassUser());
            return;
          }

          setUser(null);
          if (!isPublicPath(pathname)) {
            router.push('/login');
          }
          return;
        }

        clearTempBypass();
        void loadSupabaseProfile(session.user.id).then((profile) => {
          const nextUser = normalizeSupabaseUser(session.user, profile);
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
      const isDemoLogin = email.trim().toLowerCase() === MOCK_DEMO_EMAIL && password === MOCK_DEMO_PASSWORD;
      const nextUser = normalizeUser({
        id: isDemoLogin ? MOCK_DEMO_EMAIL : email,
        email: isDemoLogin ? MOCK_DEMO_EMAIL : email,
        name: isDemoLogin ? 'Demo Recruiter' : email.split('@')[0] || 'Demo User',
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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('Sign in succeeded but no active user was returned.');
      }

      clearTempBypass();
      const profile = await loadSupabaseProfile(data.user.id);
      const nextUser = normalizeSupabaseUser(data.user, profile);
      setUser(nextUser);
      handleRedirect(router, nextUser.role);
      return;
    }

    throw new Error('Unsupported runtime mode.');
  };

  const signup = async (
    email: string,
    password: string,
    name?: string,
    metadata?: SignupMetadata
  ) => {
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
            account_type: metadata?.accountType || 'personal',
            company_name: metadata?.companyName || undefined,
            first_name: metadata?.firstName || undefined,
            last_name: metadata?.lastName || undefined,
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
    clearTempBypass();

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
