import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getDefaultRouteForRole, isPublicPath, isRoleAllowedForPath } from "@/lib/rbac";
import { type Role } from "@/lib/roles";
import { getSupabasePublicEnv, validateRuntimeConfig } from "@/lib/runtime-config";

function toAppRole(value: string | undefined): Role {
  if (
    value === "Admin" ||
    value === "Recruiter" ||
    value === "Sales" ||
    value === "Candidate" ||
    value === "Developer"
  ) {
    return value;
  }

  return "Recruiter";
}

export async function middleware(request: NextRequest) {
  const runtimeCheck = validateRuntimeConfig();
  const isSupabaseRuntime = runtimeCheck.mode === "supabase";

  if (runtimeCheck.ok === false) {
    return new NextResponse(
      "Runtime misconfiguration: " + runtimeCheck.errors.join(" "),
      { status: 503 }
    );
  }

  if (isSupabaseRuntime === false) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;

  const isFrameworkAsset = pathname.startsWith("/_next/") || pathname === "/favicon.ico";
  const isImageAsset = /\.(?:svg|png|jpg|jpeg|gif|webp)$/i.test(pathname);
  if (isFrameworkAsset || isImageAsset) {
    return NextResponse.next();
  }

  const isPublic = isPublicPath(pathname);

  // Declare variables that will hold the validated config
  let config: ReturnType<typeof getSupabasePublicEnv>;
  
  try {
    config = getSupabasePublicEnv();
  } catch {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(
        "Runtime misconfiguration: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.",
        { status: 503 }
      );
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user == null) {
    if (isPublic) {
      return response;
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // API routes enforce their own RBAC — skip the role DB query for them.
  if (pathname.startsWith("/api/")) {
    return response;
  }

  // Use app_metadata.role if set by a server-side Supabase hook (tamper-proof).
  // Fall back to a DB lookup only when it hasn't been populated yet.
  let roleValue = user.app_metadata?.role as string | undefined;
  if (!roleValue) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    roleValue = profile?.role as string | undefined;
  }

  const role = toAppRole(roleValue || (user.user_metadata?.role as string | undefined));

  if (isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getDefaultRouteForRole(role);
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (isRoleAllowedForPath(role, pathname) === false) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getDefaultRouteForRole(role);
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/:path*"],
};
