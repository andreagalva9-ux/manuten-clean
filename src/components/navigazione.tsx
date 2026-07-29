"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isSupervisore, puoVedereTutto, type Profilo } from "@/lib/dominio";

type Voce = { href: string; etichetta: string; icona: React.ReactNode };

function Icona({ d }: { d: string }) {
  return (
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
      <path d={d} />
    </svg>
  );
}

function vociPerRuolo(profilo: Profilo): Voce[] {
  const voci: Voce[] = [];

  // Chi è in sola supervisione non compila fogli: consulta solo l'archivio.
  if (!isSupervisore(profilo)) {
    voci.push({
      href: "/nuovo",
      etichetta: "Nuovo",
      icona: <Icona d="M12 5v14M5 12h14" />,
    });
  }

  voci.push(
    {
      href: "/incarichi",
      etichetta: "Incarichi",
      icona: (
        <Icona d="M9 11l3 3L22 4M6 12v7a1 1 0 001 1h10a1 1 0 001-1V9a1 1 0 00-1-1h-5" />
      ),
    },
    {
      href: "/archivio",
      etichetta: "Archivio",
      icona: (
        <Icona d="M3 7h18M5 7v12a1 1 0 001 1h12a1 1 0 001-1V7M9 11h6M4 7l1.5-3h13L20 7" />
      ),
    },
  );

  if (puoVedereTutto(profilo)) {
    voci.push(
      {
        href: "/clienti",
        etichetta: "Clienti",
        icona: (
          <Icona d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM17 21v-2a4 4 0 00-3-3.87" />
        ),
      },
      {
        href: "/tecnici",
        etichetta: "Tecnici",
        icona: (
          <Icona d="M12 12a4 4 0 100-8 4 4 0 000 8zM5 21v-1a7 7 0 0114 0v1M19 8h4M21 6v4" />
        ),
      },
      {
        href: "/assegnazioni",
        etichetta: "Assegnazioni",
        icona: (
          <Icona d="M9 12l2 2 4-4M7.5 3.5l-3 1.5v4l3 1.5 3-1.5v-4zM16.5 13.5l-3 1.5v4l3 1.5 3-1.5v-4z" />
        ),
      },
    );
  }

  return voci;
}

function attiva(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavigazioneDesktop({ profilo }: { profilo: Profilo }) {
  const pathname = usePathname();
  const voci = vociPerRuolo(profilo);

  return (
    <nav className="hidden items-center gap-1 sm:flex">
      {voci.map((voce) => (
        <Link
          key={voce.href}
          href={voce.href}
          aria-current={attiva(pathname, voce.href) ? "page" : undefined}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            attiva(pathname, voce.href)
              ? "bg-brand-50 text-brand-800"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          {voce.etichetta}
        </Link>
      ))}
    </nav>
  );
}

export function NavigazioneMobile({ profilo }: { profilo: Profilo }) {
  const pathname = usePathname();
  const voci = vociPerRuolo(profilo);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg">
        {voci.map((voce) => {
          const corrente = attiva(pathname, voce.href);
          return (
            <li key={voce.href} className="flex-1">
              <Link
                href={voce.href}
                aria-current={corrente ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
                  corrente ? "text-brand-700" : "text-slate-500"
                }`}
              >
                {voce.icona}
                {voce.etichetta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
