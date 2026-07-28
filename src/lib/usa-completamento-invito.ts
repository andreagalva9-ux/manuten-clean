"use client";

import { useEffect, useState } from "react";
import { useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export type EsitoInvito = "assente" | "in-corso" | "errore";

function leggiToken(searchParams: ReadonlyURLSearchParams) {
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type");
  const hash =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");

  return { code, tokenHash, tipo, accessToken, refreshToken };
}

/**
 * Completa un invito/recupero password di Supabase Auth, in qualunque
 * formato arrivi il link (`code` PKCE, `token_hash`+`type`, o i token nel
 * frammento `#` dell'URL). Va montato non solo su /auth/callback ma anche
 * su /login: se il progetto Supabase non ha il redirect_to nell'allow-list
 * delle URL consentite, il redirect finisce comunque sul login "semplice"
 * invece che sulla nostra pagina di callback, ignorando redirectTo.
 */
export function useCompletaInvito(
  destinazione = "/imposta-password",
): EsitoInvito {
  const searchParams = useSearchParams();

  // Calcolato in modo sincrono al primo render (non in un effetto): evita
  // di mostrare per un istante il modulo di login quando in realtà c'è un
  // invito da completare.
  const [stato, setStato] = useState<EsitoInvito>(() => {
    const { code, tokenHash, tipo, accessToken, refreshToken } =
      leggiToken(searchParams);
    return code || (tokenHash && tipo) || (accessToken && refreshToken)
      ? "in-corso"
      : "assente";
  });

  useEffect(() => {
    const { code, tokenHash, tipo, accessToken, refreshToken } =
      leggiToken(searchParams);

    if (!code && !(tokenHash && tipo) && !(accessToken && refreshToken)) {
      return;
    }

    const supabase = createClient();
    let annullato = false;

    async function completa() {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          window.location.assign(destinazione);
          return;
        }
      }

      if (tokenHash && tipo) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: tipo as
            | "invite"
            | "recovery"
            | "signup"
            | "email_change"
            | "magiclink",
        });
        if (!error) {
          window.location.assign(destinazione);
          return;
        }
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error) {
          window.location.assign(destinazione);
          return;
        }
      }

      if (!annullato) setStato("errore");
    }

    completa();

    return () => {
      annullato = true;
    };
  }, [searchParams, destinazione]);

  return stato;
}
