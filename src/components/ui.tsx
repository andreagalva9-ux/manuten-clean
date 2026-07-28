"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Variante = "primario" | "secondario" | "pericolo" | "fantasma";

const VARIANTI: Record<Variante, string> = {
  primario:
    "bg-brand-700 text-white hover:bg-brand-800 focus-visible:outline-brand-700",
  secondario:
    "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400",
  pericolo:
    "bg-white text-red-700 border border-red-300 hover:bg-red-50 focus-visible:outline-red-500",
  fantasma:
    "bg-transparent text-brand-700 hover:bg-brand-50 focus-visible:outline-brand-700",
};

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold " +
  "transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export function Bottone({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: Variante }) {
  return (
    <button
      {...props}
      className={`${BASE} ${VARIANTI[variante]} ${className}`}
    />
  );
}

export function BottoneLink({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante }) {
  return (
    <Link {...props} className={`${BASE} ${VARIANTI[variante]} ${className}`} />
  );
}

/**
 * Bottone di submit che riflette da solo lo stato di invio del form:
 * su mobile è l'unico feedback che il tecnico ha del salvataggio in corso.
 */
export function BottoneInvio({
  children,
  inCorso,
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<"button"> & {
  children: ReactNode;
  inCorso?: string;
  variante?: Variante;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      {...props}
      type="submit"
      disabled={pending || props.disabled}
      aria-busy={pending}
      className={`${BASE} ${VARIANTI[variante]} ${className}`}
    >
      {pending ? (
        <>
          <Spinner />
          {inCorso ?? "Attendere…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export function Avviso({
  tipo = "errore",
  children,
}: {
  tipo?: "errore" | "successo" | "info";
  children: ReactNode;
}) {
  const stili = {
    errore: "border-red-200 bg-red-50 text-red-800",
    successo: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-brand-200 bg-brand-50 text-brand-800",
  }[tipo];

  return (
    <div
      role={tipo === "errore" ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-sm ${stili}`}
    >
      {children}
    </div>
  );
}

export function Etichetta({
  children,
  colore = "slate",
}: {
  children: ReactNode;
  colore?: "slate" | "brand" | "rosso";
}) {
  const stili = {
    slate: "bg-slate-100 text-slate-700",
    brand: "bg-brand-100 text-brand-800",
    rosso: "bg-red-100 text-red-700",
  }[colore];
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${stili}`}
    >
      {children}
    </span>
  );
}

export function StatoVuoto({
  titolo,
  descrizione,
  azione,
}: {
  titolo: string;
  descrizione: string;
  azione?: ReactNode;
}) {
  return (
    <div className="scheda flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-base font-semibold text-slate-800">{titolo}</p>
      <p className="max-w-sm text-sm text-slate-500">{descrizione}</p>
      {azione}
    </div>
  );
}
