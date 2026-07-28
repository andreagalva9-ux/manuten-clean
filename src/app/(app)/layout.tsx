import { esci } from "@/app/login/azioni";
import { Logo } from "@/components/logo";
import {
  NavigazioneDesktop,
  NavigazioneMobile,
} from "@/components/navigazione";
import { richiediProfilo } from "@/lib/auth";

export default async function LayoutApp({
  children,
}: {
  children: React.ReactNode;
}) {
  const profilo = await richiediProfilo();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
          <Logo />

          <div className="ml-auto flex items-center gap-2">
            <NavigazioneDesktop profilo={profilo} />

            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800">
                {profilo.nome}
              </p>
              <p className="text-xs text-slate-500 capitalize">
                {profilo.ruolo}
              </p>
            </div>

            <form action={esci}>
              <button
                type="submit"
                title="Esci"
                className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <span className="sr-only">Esci</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-24 sm:pb-10">
        {children}
      </main>

      <NavigazioneMobile profilo={profilo} />
    </div>
  );
}
