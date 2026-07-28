"use client";

import { Suspense, type ReactNode } from "react";

import { useCompletaInvito } from "@/lib/usa-completamento-invito";

/**
 * Se il link cliccato porta ancora token di invito/recupero (perché il
 * progetto Supabase non rispetta il redirect_to configurato e riporta al
 * login "semplice"), li completa e manda l'utente a impostare la password
 * invece di mostrargli il modulo email+password. Nel caso normale (nessun
 * token nell'URL) mostra subito il modulo, senza alcun ritardo percepibile.
 */
export function GateInvito({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <RilevaInvito>{children}</RilevaInvito>
    </Suspense>
  );
}

function RilevaInvito({ children }: { children: ReactNode }) {
  const stato = useCompletaInvito();

  if (stato === "in-corso") {
    return <p className="text-sm text-slate-500">Accesso in corso…</p>;
  }

  return <>{children}</>;
}
