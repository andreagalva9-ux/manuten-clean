"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Avviso } from "@/components/ui";
import { Logo } from "@/components/logo";
import { AZIENDA } from "@/lib/dominio";
import { createClient } from "@/lib/supabase/client";

/**
 * Destinazione dei link inviati da Supabase Auth (invito, recupero password).
 * A seconda della configurazione del progetto Supabase, il link può
 * consegnare la sessione in tre formati diversi: un `code` PKCE, un
 * `token_hash`+`type` da verificare, oppure (il caso classico per gli invii
 * di GoTrue) i token direttamente nel frammento `#` dell'URL, mai inviato al
 * server. Si gestiscono tutti e tre lato client per non dipendere da come è
 * configurato il template email.
 */
export default function PaginaCallbackAuth() {
  return (
    <Suspense fallback={null}>
      <CompletaAccesso />
    </Suspense>
  );
}

function CompletaAccesso() {
  const searchParams = useSearchParams();
  const [errore, setErrore] = useState(false);

  useEffect(() => {
    const next = searchParams.get("next") ?? "/imposta-password";
    const supabase = createClient();
    let annullato = false;

    // Navigazione "dura" invece del router di Next: garantisce che la
    // richiesta successiva porti con sé i cookie di sessione appena scritti,
    // senza incertezze dovute alla cache client-side dell'App Router.
    function vaiA(destinazione: string) {
      window.location.assign(destinazione);
    }

    async function completa() {
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          vaiA(next);
          return;
        }
      }

      const tokenHash = searchParams.get("token_hash");
      const tipo = searchParams.get("type");
      if (tokenHash && tipo) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: tipo as "invite" | "recovery" | "signup" | "email_change" | "magiclink",
        });
        if (!error) {
          vaiA(next);
          return;
        }
      }

      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error) {
          vaiA(next);
          return;
        }
      }

      if (!annullato) setErrore(true);
    }

    completa();

    return () => {
      annullato = true;
    };
  }, [searchParams]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="scheda p-6">
          {errore ? (
            <>
              <Avviso>
                Il link non è più valido o è scaduto. Chiedi all&apos;ufficio
                di inviartene uno nuovo.
              </Avviso>
              <a
                href="/login"
                className="mt-4 inline-block text-sm font-semibold text-brand-700 underline underline-offset-2"
              >
                Vai al login
              </a>
            </>
          ) : (
            <p className="text-sm text-slate-500">Accesso in corso…</p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          {AZIENDA.nome} · {AZIENDA.sito}
        </p>
      </div>
    </main>
  );
}
