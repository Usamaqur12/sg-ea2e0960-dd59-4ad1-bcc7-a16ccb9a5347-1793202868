import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes (pages and API endpoints)
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Allow admin login page
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  // Create Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Check authentication
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // Not authenticated - redirect to admin login
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Check if user is admin
  // In demo mode, check for demo admin email
  const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_DEMO_BACKEND === "true";
  const isDemoAdmin = isDemoMode && session.user.email === "admin@primebet.demo";

  if (isDemoAdmin) {
    return response;
  }

  // Check real admin role from database
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, admin_role")
    .eq("id", session.user.id)
    .single();

  const isAdmin = profile?.role === "admin" || profile?.admin_role !== null;

  if (!isAdmin) {
    // Not authorized - redirect based on route type
    if (pathname.startsWith("/api/admin")) {
      // API routes return 403
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    } else {
      // Page routes redirect to home
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};