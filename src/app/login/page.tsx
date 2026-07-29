import Link from "next/link";

import { FormLogin } from "@/app/login/form-login";
import { GateInvito } from "@/app/login/gate-invito";
import { Logo } from "@/components/logo";
import { AZIENDA } from "@/lib/dominio";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Accedi · Manuten & Clean" };

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: destinazione = "" } = await searchParams;

  // Se non esiste ancora nessun account, proponiamo la creazione del primo
  // utente ufficio invece di un login che nessuno potrebbe superare.
  const supabase = await createClient();
  const { data: serveBootstrap } = await supabase.rpc("serve_bootstrap");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="scheda p-6">
          <h1 className="mb-1 text-lg font-semibold text-slate-900">
            Accedi al gestionale
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Compila e consulta i fogli di lavoro dal cantiere o dall&apos;ufficio.
          </p>

          <GateInvito>
            <FormLogin destinazione={destinazione} />
            <p className="mt-3 text-center text-sm text-slate-500">
              Password dimenticata? Chiedi all&apos;ufficio di reimpostartela.
            </p>
          </GateInvito>

          {serveBootstrap && (
            <p className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-600">
              Prima installazione?{" "}
              <Link
                href="/registrazione"
                className="font-semibold text-brand-700 underline underline-offset-2"
              >
                Crea l&apos;account ufficio
              </Link>
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          {AZIENDA.nome} · {AZIENDA.sito}
        </p>
      </div>
    </main>
  );
}
