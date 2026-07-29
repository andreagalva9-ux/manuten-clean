"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import {
  creaIntervento,
  type StatoIntervento,
} from "@/app/(app)/nuovo/azioni";
import { FirmaTouch } from "@/components/firma-touch";
import { Avviso, Bottone, BottoneInvio } from "@/components/ui";
import {
  codiceCommessa,
  isTipoCommessa,
  oggiISO,
  TIPI_COMMESSA,
  type Assegnazione,
  type Cliente,
  type Profilo,
} from "@/lib/dominio";
import { createClient } from "@/lib/supabase/client";

type Anteprima =
  | { stato: "vuota" }
  | { stato: "caricamento" }
  | { stato: "pronta"; numero: number }
  | { stato: "errore" };

type Risultato = { chiave: string } & (
  | { esito: "pronta"; numero: number }
  | { esito: "errore" }
);

export function FormIntervento({
  clienti,
  tecnici,
  assegnazioni,
  profilo,
  clientIdIniziale,
  tipoIniziale,
}: {
  clienti: Pick<Cliente, "id" | "nome" | "indirizzo">[];
  tecnici: Pick<Profilo, "id" | "nome">[];
  assegnazioni: Pick<Assegnazione, "client_id" | "tecnico_id" | "tipo">[];
  profilo: Profilo;
  clientIdIniziale?: string;
  tipoIniziale?: string;
}) {
  const [stato, azione] = useActionState<StatoIntervento, FormData>(
    creaIntervento,
    {},
  );

  // Precompilati quando si arriva da un incarico pianificato
  // (/nuovo?client_id=...&tipo=...): restano comunque modificabili.
  const [clientId, setClientId] = useState(() =>
    clientIdIniziale && clienti.some((c) => c.id === clientIdIniziale)
      ? clientIdIniziale
      : "",
  );
  const [tipo, setTipo] = useState(() =>
    tipoIniziale && isTipoCommessa(tipoIniziale) ? tipoIniziale : "",
  );
  const [risultato, setRisultato] = useState<Risultato | null>(null);

  // Preselezione (non vincolante) dei tecnici in base alle assegnazioni: si
  // preferisce un'assegnazione specifica per quel tipo, altrimenti quella
  // generica ("tutti i tipi"). La chiave cliente+tipo viene usata come `key`
  // di SelezioneTecnici così, cambiando cliente o tipo, la selezione riparte
  // dal suggerimento invece di trascinarsi eventuali modifiche manuali fatte
  // per una combinazione precedente.
  const tecniciSuggeriti = useMemo(() => {
    if (!clientId) return new Set<string>();
    const perCliente = assegnazioni.filter((a) => a.client_id === clientId);
    const specifiche = tipo ? perCliente.filter((a) => a.tipo === tipo) : [];
    const generiche = perCliente.filter((a) => a.tipo === null);
    const suggerite = specifiche.length > 0 ? specifiche : generiche;
    return new Set(suggerite.map((a) => a.tecnico_id));
  }, [clientId, tipo, assegnazioni]);

  // La coppia cliente+tipo identifica la richiesta in corso: confrontandola con
  // quella dell'ultima risposta si distingue "sto caricando" da "ho il dato",
  // senza dover azzerare lo stato a ogni cambio di selezione.
  const chiave = clientId && tipo ? `${clientId}|${tipo}` : "";

  // Anteprima non vincolante del progressivo: il numero definitivo viene
  // assegnato dal database al momento del salvataggio.
  useEffect(() => {
    if (!chiave) return;

    let annullato = false;
    const [idCliente, tipoCommessa] = chiave.split("|");

    createClient()
      .rpc("anteprima_numero", {
        p_client_id: idCliente,
        p_tipo: tipoCommessa,
      })
      .then(({ data, error }) => {
        if (annullato) return;
        setRisultato(
          error || typeof data !== "number"
            ? { chiave, esito: "errore" }
            : { chiave, esito: "pronta", numero: data },
        );
      });

    return () => {
      annullato = true;
    };
  }, [chiave]);

  const anteprima: Anteprima = !chiave
    ? { stato: "vuota" }
    : risultato?.chiave !== chiave
      ? { stato: "caricamento" }
      : risultato.esito === "errore"
        ? { stato: "errore" }
        : { stato: "pronta", numero: risultato.numero };

  const clienteScelto = clienti.find((c) => c.id === clientId);

  return (
    <form action={azione} className="flex flex-col gap-5" noValidate>
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Nuovo foglio di lavoro
        </h1>
        <p className="text-sm text-slate-500">
          Compilato da {profilo.nome}
        </p>
      </div>

      {stato.errore && <Avviso>{stato.errore}</Avviso>}

      <TesserinoNumero
        tipo={tipo}
        anteprima={anteprima}
        cliente={clienteScelto?.nome}
      />

      <section className="scheda flex flex-col gap-4 p-4">
        <div>
          <label className="etichetta" htmlFor="client_id">
            Cliente *
          </label>
          <select
            id="client_id"
            name="client_id"
            required
            className="campo"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">— Seleziona cliente —</option>
            {clienti.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome}
              </option>
            ))}
          </select>
          {clienteScelto?.indirizzo && (
            <p className="mt-1.5 text-sm text-slate-500">
              {clienteScelto.indirizzo}
            </p>
          )}
        </div>

        <div>
          <label className="etichetta" htmlFor="tipo">
            Tipo di commessa *
          </label>
          <select
            id="tipo"
            name="tipo"
            required
            className="campo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="">— Seleziona tipo —</option>
            {TIPI_COMMESSA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etichetta" htmlFor="data">
              Data *
            </label>
            <input
              id="data"
              name="data"
              type="date"
              required
              defaultValue={oggiISO()}
              className="campo"
            />
          </div>

          <div>
            <label className="etichetta" htmlFor="ore">
              Ore
            </label>
            <input
              id="ore"
              name="ore"
              type="text"
              inputMode="decimal"
              placeholder="Es. 3,5"
              className="campo"
            />
          </div>
        </div>
      </section>

      <section className="scheda flex flex-col gap-4 p-4">
        <div>
          <label className="etichetta" htmlFor="materiali_installati">
            Materiali installati
          </label>
          <input
            id="materiali_installati"
            name="materiali_installati"
            className="campo"
            placeholder="Es. 4 erogatori, 2 trappole meccaniche…"
          />
        </div>

        <div>
          <label className="etichetta" htmlFor="aree_intervento">
            Aree d&apos;intervento
          </label>
          <input
            id="aree_intervento"
            name="aree_intervento"
            className="campo"
            placeholder="Es. Magazzino, spogliatoi, area esterna…"
          />
        </div>

        <div>
          <label className="etichetta" htmlFor="persona_contatto">
            Persona da contattare
          </label>
          <input
            id="persona_contatto"
            name="persona_contatto"
            className="campo"
            placeholder="Referente in loco, con recapito se utile"
          />
        </div>
      </section>

      <section className="scheda flex flex-col gap-4 p-4">
        <div>
          <label className="etichetta" htmlFor="lavoro_svolto">
            Lavoro svolto / osservazioni del tecnico *
          </label>
          <textarea
            id="lavoro_svolto"
            name="lavoro_svolto"
            required
            rows={6}
            className="campo resize-y"
            placeholder="Descrivi le attività eseguite, i locali interessati, i prodotti utilizzati…"
          />
        </div>

        <div>
          <label className="etichetta" htmlFor="note">
            Note
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            className="campo resize-y"
            placeholder="Anomalie riscontrate, richieste del cliente…"
          />
        </div>
      </section>

      <SelezioneTecnici
        key={`${clientId}|${tipo}`}
        tecnici={tecnici}
        suggeriti={tecniciSuggeriti}
      />

      <SezioneFirme />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <BottoneInvio inCorso="Salvataggio…" className="w-full sm:w-auto">
          Salva foglio di lavoro
        </BottoneInvio>
        <p className="text-xs text-slate-500">
          Il numero di commessa definitivo viene assegnato al salvataggio.
        </p>
      </div>
    </form>
  );
}

function TesserinoNumero({
  tipo,
  anteprima,
  cliente,
}: {
  tipo: string;
  anteprima: Anteprima;
  cliente?: string;
}) {
  return (
    <div className="rounded-xl bg-brand-800 px-4 py-4 text-white shadow-sm">
      <p className="text-[11px] font-semibold tracking-widest text-brand-200 uppercase">
        Numero commessa
      </p>
      <p className="mt-1 font-mono text-2xl font-bold tracking-tight">
        {anteprima.stato === "pronta" && tipo
          ? codiceCommessa(tipo, anteprima.numero)
          : anteprima.stato === "caricamento"
            ? "…"
            : "—"}
      </p>
      <p className="mt-1 text-xs text-brand-100">
        {anteprima.stato === "vuota" &&
          "Scegli cliente e tipo per vedere l'anteprima."}
        {anteprima.stato === "caricamento" && "Calcolo in corso…"}
        {anteprima.stato === "errore" &&
          "Anteprima non disponibile: il numero verrà comunque assegnato al salvataggio."}
        {anteprima.stato === "pronta" &&
          `Anteprima${cliente ? ` per ${cliente}` : ""} · confermato al salvataggio`}
      </p>
    </div>
  );
}

/**
 * Le firme sono facoltative e restano chiuse per default: il tecnico apre il
 * riquadro solo quando ha davvero il cliente a portata di mano.
 */
function SezioneFirme() {
  const [aperto, setAperto] = useState(false);

  return (
    <section className="scheda p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-slate-800">Firme</p>
          <p className="text-sm text-slate-500">
            Facoltative: puoi aggiungerle anche in seguito dall&apos;archivio.
          </p>
        </div>
        <Bottone
          type="button"
          variante="secondario"
          onClick={() => setAperto((v) => !v)}
        >
          {aperto ? "Nascondi" : "Raccogli firme"}
        </Bottone>
      </div>

      {aperto && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FirmaTouch
            nome="firma_tecnico_svg"
            etichetta="Firma del tecnico"
          />
          <FirmaTouch
            nome="firma_cliente_svg"
            etichetta="Firma del cliente"
          />
        </div>
      )}
    </section>
  );
}

function SelezioneTecnici({
  tecnici,
  suggeriti,
}: {
  tecnici: Pick<Profilo, "id" | "nome">[];
  suggeriti: Set<string>;
}) {
  const [selezionati, setSelezionati] = useState(suggeriti);

  function alternaTecnico(id: string) {
    setSelezionati((precedente) => {
      const nuovo = new Set(precedente);
      if (nuovo.has(id)) nuovo.delete(id);
      else nuovo.add(id);
      return nuovo;
    });
  }

  if (tecnici.length === 0) {
    return (
      <section className="scheda p-4">
        <p className="etichetta">Tecnici assegnati</p>
        <p className="text-sm text-slate-500">
          Nessun tecnico attivo in anagrafica. L&apos;ufficio può aggiungerli
          dalla pagina Tecnici.
        </p>
      </section>
    );
  }

  return (
    <section className="scheda p-4">
      <p className="etichetta">Tecnici assegnati</p>
      <p className="mb-2 text-xs text-slate-500">
        Precompilato in base alle assegnazioni cliente → tecnico: puoi
        correggerlo prima di salvare.
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {tecnici.map((tecnico) => (
          <li key={tecnico.id}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 transition hover:bg-slate-50 has-checked:border-brand-400 has-checked:bg-brand-50">
              <input
                type="checkbox"
                name="tecnici_ids"
                value={tecnico.id}
                checked={selezionati.has(tecnico.id)}
                onChange={() => alternaTecnico(tecnico.id)}
                className="h-5 w-5 rounded border-slate-300 accent-brand-700"
              />
              <span className="text-sm font-medium text-slate-800">
                {tecnico.nome}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
