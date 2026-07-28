import { FormImpostaPassword } from "@/app/imposta-password/form-imposta-password";
import { Logo } from "@/components/logo";
import { richiediProfilo } from "@/lib/auth";
import { AZIENDA } from "@/lib/dominio";

export const metadata = { title: "Imposta password · Manuten & Clean" };

export default async function PaginaImpostaPassword() {
  const profilo = await richiediProfilo();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="scheda p-6">
          <h1 className="mb-1 text-lg font-semibold text-slate-900">
            Benvenuto/a, {profilo.nome}
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Imposta la tua password personale per accedere al gestionale.
          </p>

          <FormImpostaPassword />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          {AZIENDA.nome} · {AZIENDA.sito}
        </p>
      </div>
    </main>
  );
}
