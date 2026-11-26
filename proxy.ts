import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages that need a signed-in user.
const PROTECTED = ["/start", "/new", "/invoices", "/leads", "/settings", "/billing", "/admin"];

// Signed-in visitors skip the log-in and sign-up pages.
const GUEST_ONLY = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

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
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Refreshes the session cookie if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }
  if (user && GUEST_ONLY.includes(path) && !request.nextUrl.searchParams.has("error")) {
    const url = request.nextUrl.clone();
    // Honor a safe ?next= (e.g. the home page's Lead Tracker button), else go to invoices.
    const next = request.nextUrl.searchParams.get("next") ?? "";
    url.pathname = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next.split("?")[0] : "/invoices";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Skip static files, the Stripe webhook (raw body), and public invoice links.
  // The home page ("/") is static and needs no session check, so it's skipped too.
  matcher: ["/((?!$|_next/static|_next/image|favicon.ico|icon|manifest|robots.txt|sitemap.xml|brand/|api/stripe/webhook|api/stripe/connect-webhook|i/).*)"],
};
