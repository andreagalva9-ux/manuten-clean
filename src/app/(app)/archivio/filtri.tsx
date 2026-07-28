"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Spinner } from "@/components/ui";
import { TIPI_COMMESSA, type Cliente } from "@/lib/dominio";

export function Filtri({
  clienti,
}: {
  clienti: Pick<Cliente, "id" | "nome">[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inTransizione, avviaTransizione] = useTransition();

  const [ricerca, setRicerca] = useState(searchParams.get("q") ?? "");
  const primoRender = useRef(true);

  function applica(modifiche: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [chiave, valore] of Object.entries(modifiche)) {
      if (valore) params.set(chiave, valore);
      else params.delete(chiave);
    }
    // Ogni cambio di filtro riporta alla prima pagina.
    params.delete("pagina");
    avviaTransizione(() => {
      router.replace(`/archivio?${params.toString()}`, { scroll: false });
    });
  }

  // Ricerca testuale con debounce: evita una query a ogni tasto premuto.
  useEffect(() => {
    if (primoRender.current) {
      primoRender.current = false;
      return;
    }
    const timer = setTimeout(() => applica({ q: ricerca.trim() }), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ricerca]);

  const cliente = searchParams.get("cliente") ?? "";
  const tipo = searchParams.get("tipo") ?? "";
  const soloEliminati = searchParams.get("eliminati") === "1";
  const filtriAttivi = Boolean(cliente || tipo || ricerca || soloEliminati);

  return (
    <div className="scheda flex flex-col gap-3 p-4">
      <div className="relative">
        <input
          type="search"
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
          placeholder="Cerca nel lavoro svolto…"
          aria-label="Cerca nel lavoro svolto"
          className="campo pr-10"
        />
        {inTransizione && (
          <span className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400">
            <Spinner />
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <select
          value={cliente}
          onChange={(e) => applica({ cliente: e.target.value })}
          aria-label="Filtra per cliente"
          className="campo"
        >
          <option value="">Tutti i clienti</option>
          {clienti.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>

        <select
          value={tipo}
          onChange={(e) => applica({ tipo: e.target.value })}
          aria-label="Filtra per tipo di commessa"
          className="campo"
        >
          <option value="">Tutti i tipi</option>
          {TIPI_COMMESSA.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {filtriAttivi && (
        <button
          type="button"
          onClick={() => {
            setRicerca("");
            avviaTransizione(() => router.replace("/archivio"));
          }}
          className="self-start text-sm font-medium text-brand-700 underline underline-offset-2"
        >
          Azzera filtri
        </button>
      )}
    </div>
  );
}
