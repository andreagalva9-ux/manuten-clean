"use client";

import { useActionState, useState } from "react";

import {
  aggiornaIntervento,
  eliminaIntervento,
  finalizzaIntervento,
  ripristinaIntervento,
  sbloccaIntervento,
  type StatoArchivio,
} from "@/app/(app)/archivio/azioni";
import { FirmaTouch } from "@/components/firma-touch";
import { Avviso, Bottone, BottoneInvio, Etichetta } from "@/components/ui";
import {
  codiceCommessa,
  formattaData,
  formattaOre,
  isUfficio,
  puoEliminare,
  puoModificare,
  type Cliente,
  type Intervento,
  type Profilo,
} from "@/lib/dominio";

type Dati = Intervento & {
  cliente: Pick<Cliente, "id" | "nome" | "indirizzo"> | null;
  compilatore: Pick<Profilo, "id" | "nome"> | null;
};

export function Dettaglio({
  intervento,
  tecnici,
  tecniciAssegnati,
  profilo,
  appenaCreato,
  numeroTotale,
}: {
  intervento: Dati;
  tecnici: Pick<Profilo, "id" | "nome">[];
  tecniciAssegnati: Pick<Profilo, "id" | "nome">[];
  profilo: Profilo;
  appenaCreato: boolean;
  numeroTotale: number;
}) {
  const [modifica, setModifica] = useState(false);
  const [confermaEliminazione, setConfermaEliminazione] = useState(false);
  const [confermaInvio, setConfermaInvio] = useState(false);

  const [statoModifica, azioneModifica] = useActionState<StatoArchivio, FormData>(
    async (precedente, formData) => {
      const risultato = await aggiornaIntervento(precedente, formData);
      if (risultato.successo) setModifica(false);
      return risultato;
    },
    {},
  );

  const [statoElimina, azioneElimina] = useActionState<StatoArchivio, FormData>(
    intervento.deleted_at ? ripristinaIntervento : eliminaIntervento,
    {},
  );

  const [statoInvio, azioneInvio] = useActionState<StatoArchivio, FormData>(
    finalizzaIntervento,
    {},
  );

  const [statoSblocco, azioneSblocco] = useActionState<StatoArchivio, FormData>(
    sbloccaIntervento,
    {},
  );

  const eliminato = Boolean(intervento.deleted_at);
  const finalizzato = Boolean(intervento.finalizzato_at);
  const modificabile = puoModificare(intervento, profilo);
  const codice = codiceCommessa(intervento.tipo, intervento.numero);

  return (
    <div className="flex flex-col gap-4">
      {appenaCreato && (
        <Avviso tipo="successo">
          Foglio salvato con il numero di commessa <strong>{codice}</strong>.
        </Avviso>
      )}

      <header className="rounded-xl bg-brand-800 px-4 py-4 text-white shadow-sm">
        <p className="text-[11px] font-semibold tracking-widest text-brand-200 uppercase">
          Numero commessa
        </p>
        <p className="mt-1 font-mono text-2xl font-bold tracking-tight">
          {codice}
        </p>
        <p className="mt-1 text-sm text-brand-100">
          {intervento.tipo} · intervento n. {intervento.numero} di{" "}
          {numeroTotale}
        </p>
        {finalizzato && (
          <span className="mt-2 inline-flex items-center rounded-md bg-white/15 px-2 py-0.5 text-xs font-medium text-white">
            Inviato definitivamente
          </span>
        )}
      </header>

      {eliminato && (
        <Avviso>
          Questo foglio è stato eliminato il{" "}
          {new Date(intervento.deleted_at!).toLocaleDateString("it-IT")}. Il
          numero di commessa resta riservato e non verrà riassegnato.
        </Avviso>
      )}

      {finalizzato && !isUfficio(profilo) && (
        <Avviso tipo="info">
          Questo foglio è stato inviato definitivamente e non è più
          modificabile. Se serve una correzione, chiedi all&apos;ufficio.
        </Avviso>
      )}

      {statoElimina.errore && <Avviso>{statoElimina.errore}</Avviso>}
      {statoElimina.successo && (
        <Avviso tipo="successo">{statoElimina.successo}</Avviso>
      )}
      {statoInvio.errore && <Avviso>{statoInvio.errore}</Avviso>}
      {statoInvio.successo && (
        <Avviso tipo="successo">{statoInvio.successo}</Avviso>
      )}
      {statoSblocco.errore && <Avviso>{statoSblocco.errore}</Avviso>}
      {statoSblocco.successo && (
        <Avviso tipo="successo">{statoSblocco.successo}</Avviso>
      )}

      {modifica ? (
        <form action={azioneModifica} className="scheda flex flex-col gap-4 p-4">
          <input type="hidden" name="id" value={intervento.id} />
          {statoModifica.errore && <Avviso>{statoModifica.errore}</Avviso>}

          <p className="text-sm text-slate-500">
            Cliente, tipo e numero di commessa non sono modificabili: fanno parte
            della numerazione storica.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="etichetta" htmlFor="data-mod">
                Data *
              </label>
              <input
                id="data-mod"
                name="data"
                type="date"
                required
                defaultValue={intervento.data}
                className="campo"
              />
            </div>
            <div>
              <label className="etichetta" htmlFor="ore-mod">
                Ore
              </label>
              <input
                id="ore-mod"
                name="ore"
                type="text"
                inputMode="decimal"
                defaultValue={
                  intervento.ore === null
                    ? ""
                    : String(intervento.ore).replace(".", ",")
                }
                className="campo"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="etichetta" htmlFor="materiali-mod">
                Materiali installati
              </label>
              <input
                id="materiali-mod"
                name="materiali_installati"
                defaultValue={intervento.materiali_installati ?? ""}
                className="campo"
              />
            </div>
            <div>
              <label className="etichetta" htmlFor="aree-mod">
                Aree d&apos;intervento
              </label>
              <input
                id="aree-mod"
                name="aree_intervento"
                defaultValue={intervento.aree_intervento ?? ""}
                className="campo"
              />
            </div>
          </div>

          <div>
            <label className="etichetta" htmlFor="persona-mod">
              Persona da contattare
            </label>
            <input
              id="persona-mod"
              name="persona_contatto"
              defaultValue={intervento.persona_contatto ?? ""}
              className="campo"
            />
          </div>

          <div>
            <label className="etichetta" htmlFor="lavoro-mod">
              Lavoro svolto / osservazioni del tecnico *
            </label>
            <textarea
              id="lavoro-mod"
              name="lavoro_svolto"
              rows={6}
              required
              defaultValue={intervento.lavoro_svolto}
              className="campo resize-y"
            />
          </div>

          <div>
            <label className="etichetta" htmlFor="note-mod">
              Note
            </label>
            <textarea
              id="note-mod"
              name="note"
              rows={3}
              defaultValue={intervento.note ?? ""}
              className="campo resize-y"
            />
          </div>

          {tecnici.length > 0 && (
            <div>
              <p className="etichetta">Tecnici assegnati</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {tecnici.map((tecnico) => (
                  <li key={tecnico.id}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 transition hover:bg-slate-50 has-checked:border-brand-400 has-checked:bg-brand-50">
                      <input
                        type="checkbox"
                        name="tecnici_ids"
                        value={tecnico.id}
                        defaultChecked={intervento.tecnici_ids.includes(
                          tecnico.id,
                        )}
                        className="h-5 w-5 rounded border-slate-300 accent-brand-700"
                      />
                      <span className="text-sm font-medium text-slate-800">
                        {tecnico.nome}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
            <FirmaTouch
              nome="firma_tecnico_svg"
              etichetta="Firma del tecnico"
              valoreIniziale={intervento.firma_tecnico_svg}
            />
            <FirmaTouch
              nome="firma_cliente_svg"
              etichetta="Firma del cliente"
              valoreIniziale={intervento.firma_cliente_svg}
            />
          </div>

          <div className="flex gap-2">
            <BottoneInvio inCorso="Salvataggio…">Salva modifiche</BottoneInvio>
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
        <div className="scheda flex flex-col divide-y divide-slate-100">
          <Sezione titolo="Cliente">
            <p className="font-semibold text-slate-900">
              {intervento.cliente?.nome ?? "Cliente rimosso"}
            </p>
            {intervento.cliente?.indirizzo && (
              <p className="text-sm text-slate-500">
                {intervento.cliente.indirizzo}
              </p>
            )}
          </Sezione>

          <div className="grid grid-cols-2 divide-x divide-slate-100">
            <Sezione titolo="Data">
              <p className="font-semibold text-slate-900">
                {formattaData(intervento.data)}
              </p>
            </Sezione>
            <Sezione titolo="Ore">
              <p className="font-semibold text-slate-900">
                {formattaOre(intervento.ore)}
              </p>
            </Sezione>
          </div>

          {(intervento.materiali_installati || intervento.aree_intervento) && (
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              {intervento.materiali_installati && (
                <Sezione titolo="Materiali installati">
                  <p className="text-slate-800">
                    {intervento.materiali_installati}
                  </p>
                </Sezione>
              )}
              {intervento.aree_intervento && (
                <Sezione titolo="Aree d'intervento">
                  <p className="text-slate-800">{intervento.aree_intervento}</p>
                </Sezione>
              )}
            </div>
          )}

          {intervento.persona_contatto && (
            <Sezione titolo="Persona da contattare">
              <p className="text-slate-800">{intervento.persona_contatto}</p>
            </Sezione>
          )}

          <Sezione titolo="Lavoro svolto / osservazioni del tecnico">
            <p className="whitespace-pre-line text-slate-800">
              {intervento.lavoro_svolto}
            </p>
          </Sezione>

          {intervento.note && (
            <Sezione titolo="Note">
              <p className="whitespace-pre-line text-slate-700">
                {intervento.note}
              </p>
            </Sezione>
          )}

          <Sezione titolo="Tecnici assegnati">
            {tecniciAssegnati.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tecniciAssegnati.map((t) => (
                  <Etichetta key={t.id}>{t.nome}</Etichetta>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Nessuno</p>
            )}
          </Sezione>

          {(intervento.firma_tecnico_svg || intervento.firma_cliente_svg) && (
            <Sezione titolo="Firme">
              <div className="grid gap-4 sm:grid-cols-2">
                <FirmaSalvata
                  etichetta="Tecnico"
                  immagine={intervento.firma_tecnico_svg}
                />
                <FirmaSalvata
                  etichetta="Cliente"
                  immagine={intervento.firma_cliente_svg}
                />
              </div>
            </Sezione>
          )}

          <Sezione titolo="Compilato da">
            <p className="text-slate-800">
              {intervento.compilatore?.nome ?? "—"}
            </p>
            <p className="text-xs text-slate-400">
              {new Date(intervento.created_at).toLocaleString("it-IT")}
            </p>
          </Sezione>
        </div>
      )}

      {!modifica && (
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/interventi/${intervento.id}/pdf`}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
            Esporta PDF
          </a>

          {!eliminato && modificabile && (
            <Bottone
              type="button"
              variante="secondario"
              onClick={() => setModifica(true)}
            >
              Modifica
            </Bottone>
          )}

          {!eliminato && !finalizzato && modificabile && (
            <>
              {confermaInvio ? (
                <form action={azioneInvio} className="flex gap-2">
                  <input type="hidden" name="id" value={intervento.id} />
                  <BottoneInvio inCorso="Invio…">
                    Conferma invio
                  </BottoneInvio>
                  <Bottone
                    type="button"
                    variante="secondario"
                    onClick={() => setConfermaInvio(false)}
                  >
                    Annulla
                  </Bottone>
                </form>
              ) : (
                <Bottone
                  type="button"
                  variante="secondario"
                  onClick={() => setConfermaInvio(true)}
                >
                  Invia definitivamente
                </Bottone>
              )}
            </>
          )}

          {!eliminato && finalizzato && isUfficio(profilo) && (
            <form action={azioneSblocco}>
              <input type="hidden" name="id" value={intervento.id} />
              <BottoneInvio variante="secondario" inCorso="Attendere…">
                Sblocca per modificare
              </BottoneInvio>
            </form>
          )}

          {puoEliminare(intervento, profilo) && !eliminato && (
            <>
              {confermaEliminazione ? (
                <form action={azioneElimina} className="flex gap-2">
                  <input type="hidden" name="id" value={intervento.id} />
                  <BottoneInvio variante="pericolo" inCorso="Eliminazione…">
                    Conferma eliminazione
                  </BottoneInvio>
                  <Bottone
                    type="button"
                    variante="secondario"
                    onClick={() => setConfermaEliminazione(false)}
                  >
                    Annulla
                  </Bottone>
                </form>
              ) : (
                <Bottone
                  type="button"
                  variante="pericolo"
                  onClick={() => setConfermaEliminazione(true)}
                >
                  Elimina
                </Bottone>
              )}
            </>
          )}

          {eliminato && isUfficio(profilo) && (
            <form action={azioneElimina}>
              <input type="hidden" name="id" value={intervento.id} />
              <BottoneInvio variante="secondario" inCorso="Attendere…">
                Ripristina
              </BottoneInvio>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function FirmaSalvata({
  etichetta,
  immagine,
}: {
  etichetta: string;
  immagine: string | null;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-slate-500">{etichetta}</p>
      <div className="flex h-24 items-end justify-center rounded-lg border border-slate-200 bg-white p-2">
        {immagine ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={immagine}
            alt={`Firma ${etichetta.toLowerCase()}`}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="self-center text-sm text-slate-400">
            Non firmato
          </span>
        )}
      </div>
    </div>
  );
}

function Sezione({
  titolo,
  children,
}: {
  titolo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-4 py-3.5">
      <h2 className="mb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
        {titolo}
      </h2>
      {children}
    </section>
  );
}
