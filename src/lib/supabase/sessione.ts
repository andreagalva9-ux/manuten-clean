import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PERCORSI_PUBBLICI = ["/login", "/registrazione", "/auth"];

export async function aggiornaSessione(request: NextRequest) {
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
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Non inserire codice tra createServerClient e getUser: il refresh del token
  // deve avvenire prima di qualunque decisione di routing.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const pubblico = PERCORSI_PUBBLICI.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!user && !pubblico) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/registrazione")) {
    const url = request.nextUrl.clone();
    url.pathname = "/panoramica";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
