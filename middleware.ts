import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { getDefaultRouteForRole, isPublicPath, isRoleAllowedForPath } from '@/lib/rbac';
import { type Role } from '@/lib/roles';

const authOnlyMode = process.env.NEXT_PUBLIC_RUNTIME_MODE?.toLowerCase() === 'supabase';

function toAppRole(value: string | undefined): Role {
  if (
    value === 'Admin' ||
    value === 'Recruiter' ||
    value === 'Sales' ||
    value === 'Candidate' ||
    value === 'Developer'
  ) {
    return value;
  }

  return 'Recruiter';
}

export async function middleware(request: NextRequest) {
  if (!authOnlyMode) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  const isPublic = isPublicPath(pathname);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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

  if (!user) {
    if (isPublic) {
      return response;
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = toAppRole(
    (profile?.role as string | undefined) || (user.user_metadata?.role as string | undefined)
  );

  if (isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getDefaultRouteForRole(role);
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  if (!isRoleAllowedForPath(role, pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getDefaultRouteForRole(role);
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
