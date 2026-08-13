import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { REPORTER_COOKIE, verifySessionToken } from "@/lib/reporter-session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const redirectToLogin = () => {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  };

  // Cegah halaman dashboard tersimpan di bfcache (bisa diakses lewat tombol back setelah logout)
  const noStore = (res: NextResponse) => {
    res.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return res;
  };

  // Protect /portal (pelapor) — kecuali halaman masuk
  if (pathname.startsWith("/portal") && pathname !== "/portal/login") {
    const token = request.cookies.get(REPORTER_COOKIE)?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      const masukUrl = request.nextUrl.clone();
      masukUrl.pathname = "/portal/login";
      return NextResponse.redirect(masukUrl);
    }
    return noStore(NextResponse.next());
  }

  // Sudah login pelapor & buka /portal/login → arahkan ke portal
  if (pathname === "/portal/login") {
    const token = request.cookies.get(REPORTER_COOKIE)?.value;
    const session = await verifySessionToken(token);
    if (session) {
      const portalUrl = request.nextUrl.clone();
      portalUrl.pathname = "/portal";
      return NextResponse.redirect(portalUrl);
    }
  }

  // Protect /dashboard routes
  if (pathname.startsWith("/dashboard")) {
    // 1. Check demo session cookie
    const demoSession = request.cookies.get("rekah_demo_session")?.value;
    if (demoSession === "authenticated") {
      return noStore(NextResponse.next());
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // 2. Tanpa Supabase terkonfigurasi & tanpa sesi demo → tolak
    if (!url || !anonKey) {
      return redirectToLogin();
    }

    // 3. Check Supabase auth session
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    let user = null;
    try {
      const result = await supabase.auth.getUser();
      user = result.data.user;
    } catch {
      // Gagal verifikasi sesi → perlakukan sebagai belum login
      user = null;
    }

    // If unauthenticated, redirect to /login
    if (!user) {
      return redirectToLogin();
    }

    return noStore(response);
  }

  // If already authenticated and visiting /login, redirect to /dashboard
  if (pathname === "/login") {
    const demoSession = request.cookies.get("rekah_demo_session")?.value;
    if (demoSession === "authenticated") {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/portal/:path*"],
};
