import Link from "next/link";
import { redirect } from "next/navigation";

import { FormRegistrazione } from "@/app/registrazione/form-registrazione";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Primo accesso · Manuten & Clean" };

export default async function PaginaRegistrazione() {
  const supabase = await createClient();
  const { data: serveBootstrap } = await supabase.rpc("serve_bootstrap");

  if (!serveBootstrap) redirect("/login");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="scheda p-6">
          <h1 className="mb-1 text-lg font-semibold text-slate-900">
            Crea l&apos;account ufficio
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            È il primo accesso all&apos;installazione: questo account avrà il
            ruolo <strong>ufficio</strong> e potrà creare clienti e tecnici.
          </p>

          <FormRegistrazione />

          <p className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-600">
            Hai già un account?{" "}
            <Link
              href="/login"
              className="font-semibold text-brand-700 underline underline-offset-2"
            >
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
