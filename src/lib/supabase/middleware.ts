import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/** Public routes that never require authentication. */
const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/verify-email",
  "/auth",
  "/api/mcp",
  "/api/export",
  "/api/demo-assets",
  "/.well-known",
  "/api/oauth",
  // /oauth/authorize does its own auth check (see app/oauth/authorize/page.tsx)
  // so it can preserve the full OAuth query string across the sign-in redirect,
  // which this middleware's generic redirect (pathname only) would drop.
  "/oauth/authorize",
];

/**
 * Refreshes the Supabase session cookie and gates protected routes.
 * When Supabase is not configured, requests pass through untouched so the app
 * still runs against demo data locally.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Signed-in users with unconfirmed emails are redirected to /verify-email.
  if (user && !user.email_confirmed_at && path !== "/verify-email") {
    const url = request.nextUrl.clone();
    url.pathname = "/verify-email";
    return NextResponse.redirect(url);
  }

  return response;
}
