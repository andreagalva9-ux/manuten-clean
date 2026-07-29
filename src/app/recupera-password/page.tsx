import Link from "next/link";

import { FormRecupero } from "@/app/recupera-password/form-recupero";
import { Logo } from "@/components/logo";
import { AZIENDA } from "@/lib/dominio";

export const metadata = { title: "Recupera password · Manuten & Clean" };

export default function PaginaRecuperaPassword() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="scheda p-6">
          <h1 className="mb-1 text-lg font-semibold text-slate-900">
            Recupera la password
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Indica l&apos;email con cui accedi: ti mandiamo un link per
            impostarne una nuova.
          </p>

          <FormRecupero />

          <p className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-600">
            <Link
              href="/login"
              className="font-semibold text-brand-700 underline underline-offset-2"
            >
              Torna al login
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          {AZIENDA.nome} · {AZIENDA.sito}
        </p>
      </div>
    </main>
  );
}
