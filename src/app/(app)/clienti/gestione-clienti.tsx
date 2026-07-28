"use client";

import { useActionState, useState } from "react";

import {
  aggiornaCliente,
  archiviaCliente,
  creaCliente,
  ripristinaCliente,
  type StatoCliente,
} from "@/app/(app)/clienti/azioni";
import { Avviso, Bottone, BottoneInvio, Etichetta } from "@/components/ui";
import type { Cliente } from "@/lib/dominio";

type ClienteConConteggio = Cliente & { interventi: number };

export function GestioneClienti({
  clienti,
}: {
  clienti: ClienteConConteggio[];
}) {
  const [nuovoAperto, setNuovoAperto] = useState(false);
  const attivi = clienti.filter((c) => !c.deleted_at);
  const archiviati = clienti.filter((c) => c.deleted_at);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Clienti</h1>
          <p className="text-sm text-slate-500">
            {attivi.length} attivi
            {archiviati.length > 0 && ` · ${archiviati.length} archiviati`}
          </p>
        </div>
        <Bottone
          type="button"
          onClick={() => setNuovoAperto((v) => !v)}
          variante={nuovoAperto ? "secondario" : "primario"}
        >
          {nuovoAperto ? "Annulla" : "Nuovo cliente"}
        </Bottone>
      </div>

      {nuovoAperto && (
        <FormNuovoCliente onFatto={() => setNuovoAperto(false)} />
      )}

      {attivi.length === 0 && !nuovoAperto ? (
        <div className="scheda px-6 py-12 text-center">
          <p className="font-semibold text-slate-800">
            Nessun cliente in anagrafica
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Aggiungi il primo cliente per poter compilare i fogli di lavoro.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {attivi.map((cliente) => (
            <RigaCliente key={cliente.id} cliente={cliente} />
          ))}
        </ul>
      )}

      {archiviati.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Archiviati
          </h2>
          <ul className="flex flex-col gap-3">
            {archiviati.map((cliente) => (
              <RigaCliente key={cliente.id} cliente={cliente} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function FormNuovoCliente({ onFatto }: { onFatto: () => void }) {
  const [stato, azione] = useActionState<StatoCliente, FormData>(
    async (precedente, formData) => {
      const risultato = await creaCliente(precedente, formData);
      if (risultato.successo) onFatto();
      return risultato;
    },
    {},
  );

  return (
    <form action={azione} className="scheda flex flex-col gap-4 p-4">
      <h2 className="font-semibold text-slate-900">Nuovo cliente</h2>
      {stato.errore && <Avviso>{stato.errore}</Avviso>}

      <CampiCliente />

      <div className="flex gap-2">
        <BottoneInvio inCorso="Salvataggio…">Salva cliente</BottoneInvio>
        <Bottone type="button" variante="secondario" onClick={onFatto}>
          Annulla
        </Bottone>
      </div>
    </form>
  );
}

function CampiCliente({ cliente }: { cliente?: Cliente }) {
  return (
    <>
      <div>
        <label className="etichetta" htmlFor={`nome-${cliente?.id ?? "nuovo"}`}>
          Nome / ragione sociale *
        </label>
        <input
          id={`nome-${cliente?.id ?? "nuovo"}`}
          name="nome"
          required
          defaultValue={cliente?.nome ?? ""}
          className="campo"
          placeholder="Es. Condominio Via Roma 12"
        />
      </div>

      <div>
        <label
          className="etichetta"
          htmlFor={`indirizzo-${cliente?.id ?? "nuovo"}`}
        >
          Indirizzo
        </label>
        <input
          id={`indirizzo-${cliente?.id ?? "nuovo"}`}
          name="indirizzo"
          defaultValue={cliente?.indirizzo ?? ""}
          className="campo"
          placeholder="Via, numero civico, città"
        />
      </div>

      <div>
        <label className="etichetta" htmlFor={`note-${cliente?.id ?? "nuovo"}`}>
          Note
        </label>
        <textarea
          id={`note-${cliente?.id ?? "nuovo"}`}
          name="note"
          rows={2}
          defaultValue={cliente?.note ?? ""}
          className="campo resize-y"
          placeholder="Referente, orari di accesso, chiavi…"
        />
      </div>
    </>
  );
}

function RigaCliente({ cliente }: { cliente: ClienteConConteggio }) {
  const [modifica, setModifica] = useState(false);
  const archiviato = Boolean(cliente.deleted_at);

  const [stato, azione] = useActionState<StatoCliente, FormData>(
    async (precedente, formData) => {
      const risultato = await aggiornaCliente(precedente, formData);
      if (risultato.successo) setModifica(false);
      return risultato;
    },
    {},
  );

  const [statoArchivio, azioneArchivio] = useActionState<StatoCliente, FormData>(
    archiviato ? ripristinaCliente : archiviaCliente,
    {},
  );

  return (
    <li className={`scheda p-4 ${archiviato ? "opacity-70" : ""}`}>
      {modifica ? (
        <form action={azione} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={cliente.id} />
          {stato.errore && <Avviso>{stato.errore}</Avviso>}
          <CampiCliente cliente={cliente} />
          <div className="flex gap-2">
            <BottoneInvio inCorso="Salvataggio…">Salva</BottoneInvio>
            <Bottone
              type="button"
              variante="secondario"
              onClick={() => setModifica(false)}
            >
              Annulla
            </Bottone>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{cliente.nome}</p>
              {cliente.indirizzo && (
                <p className="text-sm text-slate-500">{cliente.indirizzo}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {archiviato && <Etichetta colore="rosso">Archiviato</Etichetta>}
              <Etichetta>
                {cliente.interventi}{" "}
                {cliente.interventi === 1 ? "foglio" : "fogli"}
              </Etichetta>
            </div>
          </div>

          {cliente.note && (
            <p className="text-sm whitespace-pre-line text-slate-600">
              {cliente.note}
            </p>
          )}

          {statoArchivio.errore && <Avviso>{statoArchivio.errore}</Avviso>}

          <div className="flex flex-wrap gap-2">
            {!archiviato && (
              <Bottone
                type="button"
                variante="secondario"
                onClick={() => setModifica(true)}
              >
                Modifica
              </Bottone>
            )}
            <form action={azioneArchivio}>
              <input type="hidden" name="id" value={cliente.id} />
              <BottoneInvio
                variante={archiviato ? "secondario" : "pericolo"}
                inCorso="Attendere…"
              >
                {archiviato ? "Ripristina" : "Archivia"}
              </BottoneInvio>
            </form>
          </div>
        </div>
      )}
    </li>
  );
}
