import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Destinazione dei link di invito/recupero password inviati da Supabase Auth
 * (flusso PKCE, di default in @supabase/ssr): scambia il `code` con una
 * sessione vera e propria, poi porta l'utente a impostare la sua password.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/imposta-password";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?errore=invito_non_valido`,
  );
}
