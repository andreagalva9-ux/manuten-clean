"use client";

import { Suspense } from "react";

import { Avviso } from "@/components/ui";
import { Logo } from "@/components/logo";
import { AZIENDA } from "@/lib/dominio";
import { useCompletaInvito } from "@/lib/usa-completamento-invito";

export default function PaginaCallbackAuth() {
  return (
    <Suspense fallback={null}>
      <CompletaAccesso />
    </Suspense>
  );
}

function CompletaAccesso() {
  const stato = useCompletaInvito();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="scheda p-6">
          {stato === "errore" ? (
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
