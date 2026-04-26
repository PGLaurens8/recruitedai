"use client";

import React, { createContext, useContext, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { getRuntimeMode, isMockMode, isSupabaseMode } from "@/lib/runtime-mode";
import { getSupabasePublicEnvError } from "@/lib/runtime-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getDefaultRouteForRole, isPublicPath } from "@/lib/rbac";
import { normalizeRole, type Role } from "@/lib/roles";

export interface AppUser {
  id?: string;
  name: string;
  role: Role;
  email: string;
  companyId: string;
}

interface SignupMetadata {
  accountType?: "personal" | "company";
  companyName?: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AppUser | null;
  login: (email: string, password: string, redirectTo?: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    name?: string,
    metadata?: SignupMetadata,
    redirectTo?: string
  ) => Promise<{ requiresEmailConfirmation: boolean }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  runtimeMode: ReturnType<typeof getRuntimeMode>;
  authConfigError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_STORAGE_KEY = "recruitedai.mock-user";
const MOCK_DEMO_EMAIL = "demo@dem.com";
const MOCK_DEMO_PASSWORD = "demo";

function normalizeUser(partial: Partial<AppUser> & { email: string }): AppUser {
  const fallbackName = partial.name || partial.email.split("@")[0] || "User";
  const fallbackCompanyId = partial.companyId || partial.id || partial.email;

  return {
    id: partial.id,
    name: fallbackName,
    role: normalizeRole(partial.role),
    email: partial.email,
    companyId: fallbackCompanyId,
  };
}

async function loadSupabaseProfile(userId: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, role, company_id")
    .eq("id", userId)
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
    email: profile?.email || sessionUser.email || "",
    name:
      profile?.name ||
      (sessionUser.user_metadata?.name as string | undefined) ||
      (sessionUser.user_metadata?.full_name as string | undefined) ||
      undefined,
    companyId:
      profile?.company_id ||
      (sessionUser.user_metadata?.company_id as string | undefined) ||
      sessionUser.id,
    role: normalizeRole(profile?.role ?? sessionUser.user_metadata?.role),
  });
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const runtimeMode = useMemo(() => getRuntimeMode(), []);
  const authConfigError = useMemo(
    () => (runtimeMode === "supabase" ? getSupabasePublicEnvError() : null),
    [runtimeMode]
  );
  const isSigningOutRef = useRef(false);
  const pendingRedirectReasonRef = useRef<string | null>(null);

  // Effect 1: Bootstrap auth state and subscribe to changes — runs once on mount.
  // Intentionally excludes `pathname` so navigations don't tear down and recreate
  // the Supabase subscription or re-trigger the profile fetch.
  useEffect(() => {
    if (isMockMode()) {
      const raw = window.localStorage.getItem(MOCK_STORAGE_KEY);
      if (raw) {
        try {
          setUser(JSON.parse(raw) as AppUser);
        } catch {
          window.localStorage.removeItem(MOCK_STORAGE_KEY);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
      return;
    }

    if (isSupabaseMode()) {
      if (authConfigError) {
        console.error("Supabase runtime is misconfigured.", authConfigError);
        setUser(null);
        setIsLoading(false);
        return;
      }

      const supabase = createSupabaseBrowserClient();

      const bootstrap = async () => {
        try {
          // Use getUser() (server-validated) rather than getSession() (local cache only).
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();

          if (authUser == null) {
            setUser(null);
            setIsLoading(false);
            return;
          }

          const profile = await loadSupabaseProfile(authUser.id);
          setUser(normalizeSupabaseUser(authUser, profile));
          setIsLoading(false);
        } catch (error) {
          console.error("Failed to bootstrap Supabase session.", error);
          setUser(null);
          setIsLoading(false);
        }
      };

      void bootstrap();

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user == null) {
          if (event !== "SIGNED_OUT" && !isSigningOutRef.current) {
            pendingRedirectReasonRef.current = "session-expired";
          }
          setUser(null);
          return;
        }

        void loadSupabaseProfile(session.user.id)
          .then((profile) => {
            setUser(normalizeSupabaseUser(session.user, profile));
          })
          .catch((error) => {
            console.error("Failed to refresh Supabase profile.", error);
            setUser(normalizeSupabaseUser(session.user, null));
          });
      });

      return () => subscription.unsubscribe();
    }

    setUser(null);
    setIsLoading(false);
  }, [authConfigError]);

  // Effect 2: Handle redirects based on current auth state and path.
  // Separated from Effect 1 so navigations don't restart the subscription.
  useEffect(() => {
    if (isLoading) return;

    const pathIsPublic = isPublicPath(pathname);

    if (user != null) {
      if (pathIsPublic) {
        router.push(getDefaultRouteForRole(user.role));
      }
    } else if (!pathIsPublic && !isSigningOutRef.current) {
      const params = new URLSearchParams({ redirectTo: pathname });
      const reason = pendingRedirectReasonRef.current;
      if (reason) {
        params.set("reason", reason);
        pendingRedirectReasonRef.current = null;
      }
      router.push(`/login?${params.toString()}`);
    }
  }, [isLoading, user, pathname, router]);

  const login = async (email: string, password: string, redirectTo?: string) => {
    if (isMockMode()) {
      const isDemoLogin = email.trim().toLowerCase() === MOCK_DEMO_EMAIL && password === MOCK_DEMO_PASSWORD;
      const nextUser = normalizeUser({
        id: isDemoLogin ? MOCK_DEMO_EMAIL : email,
        email: isDemoLogin ? MOCK_DEMO_EMAIL : email,
        name: isDemoLogin ? "Demo Recruiter" : email.split("@")[0] || "Demo User",
        companyId: "mock-company",
        role: "Recruiter",
      });

      window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
      router.push(redirectTo || getDefaultRouteForRole(nextUser.role));
      return;
    }

    if (isSupabaseMode()) {
      if (authConfigError) {
        throw new Error(authConfigError);
      }

      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }

      if (data.user == null) {
        throw new Error("Sign in succeeded but no active user was returned.");
      }

      const profile = await loadSupabaseProfile(data.user.id);
      const nextUser = normalizeSupabaseUser(data.user, profile);
      setUser(nextUser);
      router.push(redirectTo || getDefaultRouteForRole(nextUser.role));
      return;
    }

    throw new Error("Unsupported runtime mode.");
  };

  const signup = async (
    email: string,
    password: string,
    name?: string,
    metadata?: SignupMetadata,
    redirectTo?: string
  ) => {
    if (isMockMode()) {
      const nextUser = normalizeUser({
        id: email,
        email,
        name: name || email.split("@")[0] || "Demo User",
        companyId: "mock-company",
        role: "Recruiter",
      });

      window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
      router.push(redirectTo || getDefaultRouteForRole(nextUser.role));
      return { requiresEmailConfirmation: false };
    }

    if (isSupabaseMode()) {
      if (authConfigError) {
        throw new Error(authConfigError);
      }

      const nextRole: Role = metadata?.accountType === "company" ? "Admin" : "Candidate";
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split("@")[0],
            role: nextRole,
            account_type: metadata?.accountType || "personal",
            company_name: metadata?.companyName || undefined,
            first_name: metadata?.firstName || undefined,
            last_name: metadata?.lastName || undefined,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.user == null) {
        throw new Error("Sign up succeeded but no user was returned.");
      }

      if (data.session?.user) {
        const nextUser = normalizeSupabaseUser(data.session.user, null);
        setUser(nextUser);
        router.push(redirectTo || getDefaultRouteForRole(nextUser.role));
        return { requiresEmailConfirmation: false };
      }

      return { requiresEmailConfirmation: true };
    }

    throw new Error("Unsupported runtime mode.");
  };

  const logout = async () => {
    if (isMockMode()) {
      setUser(null);
      window.localStorage.removeItem(MOCK_STORAGE_KEY);
      router.push("/");
      return;
    }

    if (isSupabaseMode()) {
      if (authConfigError) {
        throw new Error(authConfigError);
      }

      // Set ref before setUser so Effect 2 sees it and skips the login redirect.
      isSigningOutRef.current = true;
      setUser(null);
      try {
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.signOut();
        if (error) {
          throw error;
        }
      } finally {
        isSigningOutRef.current = false;
      }
      router.push("/");
      return;
    }

    throw new Error("Unsupported runtime mode.");
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: user != null,
        user,
        login,
        signup,
        logout,
        isLoading,
        runtimeMode,
        authConfigError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
