import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie and guards /dashboard.
 * Guest routes (/e/*) are untouched — guests never authenticate.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  let user = null;

  try {
    const supabase = createServerClient(
      (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co").trim(),
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key").trim(),
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );
    user = (await supabase.auth.getUser()).data.user;
  } catch (err) {
    // Malformed env (stray quotes/whitespace, wrong key) or Supabase
    // unreachable — never let a bad config crash every request. Degrade
    // to signed-out; /dashboard below will bounce to /login as usual.
    console.error("middleware auth check failed:", err);
  }

  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
