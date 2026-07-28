"use client";

import { useActionState, useState } from "react";

import {
  cambiaRuolo,
  impostaAttivo,
  invitaUtente,
  type StatoTecnico,
} from "@/app/(app)/tecnici/azioni";
import { Avviso, Bottone, BottoneInvio, Etichetta } from "@/components/ui";
import type { Profilo } from "@/lib/dominio";

type UtenteConConteggio = Profilo & { fogli: number };

export function GestioneTecnici({
  utenti,
  idCorrente,
  invitoEmailDisponibile,
}: {
  utenti: UtenteConConteggio[];
  idCorrente: string;
  invitoEmailDisponibile: boolean;
}) {
  const [aperto, setAperto] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tecnici</h1>
          <p className="text-sm text-slate-500">
            {utenti.filter((u) => u.attivo).length} utenti attivi
          </p>
        </div>
        <Bottone
          type="button"
          onClick={() => setAperto((v) => !v)}
          variante={aperto ? "secondario" : "primario"}
        >
          {aperto ? "Annulla" : "Invita utente"}
        </Bottone>
      </div>

      {aperto && (
        <FormInvito invitoEmailDisponibile={invitoEmailDisponibile} />
      )}

      <ul className="flex flex-col gap-3">
        {utenti.map((utente) => (
          <RigaUtente
            key={utente.id}
            utente={utente}
            corrente={utente.id === idCorrente}
          />
        ))}
      </ul>
    </div>
  );
}

function FormInvito({
  invitoEmailDisponibile,
}: {
  invitoEmailDisponibile: boolean;
}) {
  const [stato, azione] = useActionState<StatoTecnico, FormData>(
    invitaUtente,
    {},
  );

  return (
    <form action={azione} className="scheda flex flex-col gap-4 p-4">
      <h2 className="font-semibold text-slate-900">Nuovo utente</h2>

      {stato.errore && <Avviso>{stato.errore}</Avviso>}
      {stato.successo && <Avviso tipo="successo">{stato.successo}</Avviso>}
      {stato.passwordTemporanea && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">
            Password temporanea
          </p>
          <p className="mt-1 font-mono text-base break-all text-amber-950 select-all">
            {stato.passwordTemporanea}
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Visibile solo ora: copiala e consegnala al destinatario.
          </p>
        </div>
      )}

      <div>
        <label className="etichetta" htmlFor="nome-utente">
          Nome e cognome *
        </label>
        <input id="nome-utente" name="nome" required className="campo" />
      </div>

      <div>
        <label className="etichetta" htmlFor="email-utente">
          Email *
        </label>
        <input
          id="email-utente"
          name="email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          required
          className="campo"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etichetta" htmlFor="ruolo-utente">
            Ruolo
          </label>
          <select
            id="ruolo-utente"
            name="ruolo"
            defaultValue="tecnico"
            className="campo"
          >
            <option value="tecnico">Tecnico</option>
            <option value="ufficio">Ufficio</option>
          </select>
        </div>

        <div>
          <label className="etichetta" htmlFor="modalita-utente">
            Modalità
          </label>
          <select
            id="modalita-utente"
            name="modalita"
            defaultValue={invitoEmailDisponibile ? "invito" : "password"}
            className="campo"
            disabled={!invitoEmailDisponibile}
          >
            <option value="invito">Invito via email</option>
            <option value="password">Password temporanea</option>
          </select>
        </div>
      </div>

      {!invitoEmailDisponibile && (
        <Avviso tipo="info">
          L&apos;invito via email richiede la chiave{" "}
          <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          nelle variabili d&apos;ambiente. Senza di essa l&apos;utente viene
          creato con una password temporanea da consegnare a mano.
        </Avviso>
      )}

      <BottoneInvio inCorso="Creazione in corso…" className="self-start">
        Crea utente
      </BottoneInvio>
    </form>
  );
}

function RigaUtente({
  utente,
  corrente,
}: {
  utente: UtenteConConteggio;
  corrente: boolean;
}) {
  const [statoAttivo, azioneAttivo] = useActionState<StatoTecnico, FormData>(
    impostaAttivo,
    {},
  );
  const [statoRuolo, azioneRuolo] = useActionState<StatoTecnico, FormData>(
    cambiaRuolo,
    {},
  );

  return (
    <li className={`scheda p-4 ${utente.attivo ? "" : "opacity-70"}`}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">
              {utente.nome}
              {corrente && (
                <span className="ml-2 text-xs font-normal text-slate-500">
                  (tu)
                </span>
              )}
            </p>
            {utente.email && (
              <p className="text-sm break-all text-slate-500">{utente.email}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Etichetta colore={utente.ruolo === "ufficio" ? "brand" : "slate"}>
              {utente.ruolo === "ufficio" ? "Ufficio" : "Tecnico"}
            </Etichetta>
            {!utente.attivo && <Etichetta colore="rosso">Disattivato</Etichetta>}
            <Etichetta>
              {utente.fogli} {utente.fogli === 1 ? "foglio" : "fogli"}
            </Etichetta>
          </div>
        </div>

        {statoAttivo.errore && <Avviso>{statoAttivo.errore}</Avviso>}
        {statoRuolo.errore && <Avviso>{statoRuolo.errore}</Avviso>}

        <div className="flex flex-wrap items-center gap-2">
          <form action={azioneRuolo} className="flex items-center gap-2">
            <input type="hidden" name="id" value={utente.id} />
            <input
              type="hidden"
              name="ruolo"
              value={utente.ruolo === "ufficio" ? "tecnico" : "ufficio"}
            />
            <BottoneInvio variante="secondario" inCorso="Attendere…">
              {utente.ruolo === "ufficio"
                ? "Rendi tecnico"
                : "Rendi ufficio"}
            </BottoneInvio>
          </form>

          <form action={azioneAttivo}>
            <input type="hidden" name="id" value={utente.id} />
            <input
              type="hidden"
              name="attivo"
              value={utente.attivo ? "false" : "true"}
            />
            <BottoneInvio
              variante={utente.attivo ? "pericolo" : "secondario"}
              inCorso="Attendere…"
            >
              {utente.attivo ? "Disattiva" : "Attiva"}
            </BottoneInvio>
          </form>
        </div>
      </div>
    </li>
  );
}
