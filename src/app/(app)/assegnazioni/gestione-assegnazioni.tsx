"use client";

import { useActionState, useState } from "react";

import {
  creaAssegnazione,
  eliminaAssegnazione,
  type StatoAssegnazione,
} from "@/app/(app)/assegnazioni/azioni";
import { Avviso, Bottone, BottoneInvio } from "@/components/ui";
import { TIPI_COMMESSA } from "@/lib/dominio";

type ClienteBase = { id: string; nome: string };
type TecnicoBase = { id: string; nome: string };
type AssegnazioneRiga = {
  id: string;
  client_id: string;
  tecnico_id: string;
  tipo: string | null;
};

export function GestioneAssegnazioni({
  clienti,
  tecnici,
  assegnazioni,
  soloLettura = false,
}: {
  clienti: ClienteBase[];
  tecnici: TecnicoBase[];
  assegnazioni: AssegnazioneRiga[];
  soloLettura?: boolean;
}) {
  const [filtro, setFiltro] = useState("");
  const filtroNormalizzato = filtro.trim().toLowerCase();
  const clientiFiltrati = filtroNormalizzato
    ? clienti.filter((c) => c.nome.toLowerCase().includes(filtroNormalizzato))
    : clienti;

  function nomeTecnico(id: string) {
    return tecnici.find((t) => t.id === id)?.nome ?? "Tecnico non più attivo";
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        placeholder="Cerca cliente…"
        className="campo"
        aria-label="Cerca cliente"
      />

      <ul className="flex flex-col gap-3">
        {clientiFiltrati.map((cliente) => (
          <RigaCliente
            key={cliente.id}
            cliente={cliente}
            tecnici={tecnici}
            assegnazioni={assegnazioni.filter((a) => a.client_id === cliente.id)}
            nomeTecnico={nomeTecnico}
            soloLettura={soloLettura}
          />
        ))}
      </ul>

      {clientiFiltrati.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500">
          Nessun cliente corrisponde alla ricerca.
        </p>
      )}
    </div>
  );
}

function RigaCliente({
  cliente,
  tecnici,
  assegnazioni,
  nomeTecnico,
  soloLettura,
}: {
  cliente: ClienteBase;
  tecnici: TecnicoBase[];
  assegnazioni: AssegnazioneRiga[];
  nomeTecnico: (id: string) => string;
  soloLettura: boolean;
}) {
  const [aperto, setAperto] = useState(false);

  return (
    <li className="scheda p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{cliente.nome}</p>
          <p className="text-sm text-slate-500">
            {assegnazioni.length === 0
              ? "Nessun tecnico assegnato"
              : `${assegnazioni.length} ${
                  assegnazioni.length === 1 ? "assegnazione" : "assegnazioni"
                }`}
          </p>
        </div>
        <Bottone
          type="button"
          variante="secondario"
          onClick={() => setAperto((v) => !v)}
        >
          {aperto ? "Chiudi" : "Gestisci"}
        </Bottone>
      </div>

      {aperto && (
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4">
          {assegnazioni.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {assegnazioni.map((a) => (
                <RigaAssegnazione
                  key={a.id}
                  assegnazione={a}
                  nomeTecnico={nomeTecnico(a.tecnico_id)}
                  soloLettura={soloLettura}
                />
              ))}
            </ul>
          )}

          {soloLettura ? null : tecnici.length > 0 ? (
            <FormAggiungi clientId={cliente.id} tecnici={tecnici} />
          ) : (
            <p className="text-sm text-slate-500">
              Nessun tecnico attivo disponibile da assegnare.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function RigaAssegnazione({
  assegnazione,
  nomeTecnico,
  soloLettura,
}: {
  assegnazione: AssegnazioneRiga;
  nomeTecnico: string;
  soloLettura: boolean;
}) {
  const [stato, azione] = useActionState<StatoAssegnazione, FormData>(
    eliminaAssegnazione,
    {},
  );

  const contenuto = (
    <>
      <span className="font-medium">{nomeTecnico}</span>
      <span className="text-slate-400">·</span>
      <span>{assegnazione.tipo ?? "Tutti i tipi"}</span>
      {!soloLettura && (
        <button
          type="submit"
          aria-label={`Rimuovi assegnazione di ${nomeTecnico}`}
          className="ml-1 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
        >
          ×
        </button>
      )}
    </>
  );

  return (
    <li>
      {soloLettura ? (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1 pr-1.5 pl-3 text-sm text-slate-700">
          {contenuto}
        </span>
      ) : (
        <form action={azione}>
          <input type="hidden" name="id" value={assegnazione.id} />
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1 pr-1.5 pl-3 text-sm text-slate-700">
            {contenuto}
          </span>
        </form>
      )}
      {stato.errore && (
        <p className="mt-1 text-xs text-red-700">{stato.errore}</p>
      )}
    </li>
  );
}

function FormAggiungi({
  clientId,
  tecnici,
}: {
  clientId: string;
  tecnici: TecnicoBase[];
}) {
  const [stato, azione] = useActionState<StatoAssegnazione, FormData>(
    creaAssegnazione,
    {},
  );

  return (
    <div className="flex flex-col gap-2">
      <form
        action={azione}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <input type="hidden" name="client_id" value={clientId} />
        <div className="flex-1">
          <label className="etichetta" htmlFor={`tecnico-${clientId}`}>
            Tecnico
          </label>
          <select
            id={`tecnico-${clientId}`}
            name="tecnico_id"
            required
            className="campo"
            defaultValue=""
          >
            <option value="">— Seleziona tecnico —</option>
            {tecnici.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="etichetta" htmlFor={`tipo-${clientId}`}>
            Tipo di commessa
          </label>
          <select
            id={`tipo-${clientId}`}
            name="tipo"
            className="campo"
            defaultValue=""
          >
            <option value="">Tutti i tipi</option>
            {TIPI_COMMESSA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <BottoneInvio inCorso="Salvataggio…" variante="secondario">
          Assegna
        </BottoneInvio>
      </form>
      {stato.errore && <Avviso>{stato.errore}</Avviso>}
    </div>
  );
}
