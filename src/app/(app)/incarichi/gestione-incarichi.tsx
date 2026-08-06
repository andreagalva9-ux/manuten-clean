"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  creaIncarico,
  eliminaIncarico,
  segnaIncarico,
  type StatoIncarico,
} from "@/app/(app)/incarichi/azioni";
import {
  GraficoCaricoTecnici,
  type CaricoTecnico,
} from "@/app/(app)/incarichi/grafico-carico";
import { Avviso, Bottone, BottoneInvio, Etichetta } from "@/components/ui";
import { formattaData, oggiISO, TIPI_COMMESSA } from "@/lib/dominio";

/** Fasce di urgenza, usate sia dal grafico sia dai filtri dell'elenco. */
type Urgenza = "inRitardo" | "inScadenza" | "piuAvanti";

function traGiorniISO(giorni: number) {
  const d = new Date();
  d.setDate(d.getDate() + giorni);
  return d.toISOString().slice(0, 10);
}

function urgenzaDi(scadenza: string, oggi: string, traSette: string): Urgenza {
  if (scadenza < oggi) return "inRitardo";
  if (scadenza <= traSette) return "inScadenza";
  return "piuAvanti";
}

type ClienteBase = { id: string; nome: string };
type TecnicoBase = { id: string; nome: string };
type IncaricoRiga = {
  id: string;
  client_id: string;
  tecnico_id: string;
  tipo: string;
  scadenza: string;
  note: string | null;
  completato_at: string | null;
  /** Foglio che ha chiuso l'incarico, valorizzato all'invio definitivo. */
  intervento_id: string | null;
  cliente: { id: string; nome: string } | null;
  tecnico: { id: string; nome: string } | null;
};

export function GestioneIncarichi({
  incarichi,
  clienti,
  tecnici,
  puoGestire,
  eTecnico,
  vedeTutti,
}: {
  incarichi: IncaricoRiga[];
  clienti: ClienteBase[];
  tecnici: TecnicoBase[];
  /** Pianificatore: crea ed elimina. */
  puoGestire: boolean;
  /** Tecnico: compila il foglio e spunta come fatto. */
  eTecnico: boolean;
  /** Pianificatore e supervisore: vedono il carico di tutti. */
  vedeTutti: boolean;
}) {
  const [nuovoAperto, setNuovoAperto] = useState(false);
  const [mostraCompletati, setMostraCompletati] = useState(false);
  const [tecnicoScelto, setTecnicoScelto] = useState<string | null>(null);
  const [urgenzaScelta, setUrgenzaScelta] = useState<Urgenza | null>(null);

  const oggi = oggiISO();
  const traSette = traGiorniISO(7);

  const daFare = incarichi.filter((i) => !i.completato_at);
  const completati = incarichi.filter((i) => i.completato_at);

  // Il carico si calcola sempre su tutti gli incarichi aperti, non su quelli
  // filtrati: il grafico deve continuare a mostrare il quadro intero anche
  // mentre si guarda un singolo tecnico.
  const carichi: CaricoTecnico[] = Object.values(
    daFare.reduce<Record<string, CaricoTecnico>>((acc, i) => {
      const id = i.tecnico?.id ?? "senza-tecnico";
      acc[id] ??= {
        id,
        nome: i.tecnico?.nome ?? "Senza tecnico",
        inRitardo: 0,
        inScadenza: 0,
        piuAvanti: 0,
        totale: 0,
      };
      acc[id][urgenzaDi(i.scadenza, oggi, traSette)] += 1;
      acc[id].totale += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b.totale - a.totale || a.nome.localeCompare(b.nome));

  const filtrati = daFare.filter((i) => {
    const idTecnico = i.tecnico?.id ?? "senza-tecnico";
    if (tecnicoScelto && idTecnico !== tecnicoScelto) return false;
    if (urgenzaScelta && urgenzaDi(i.scadenza, oggi, traSette) !== urgenzaScelta)
      return false;
    return true;
  });

  // Raggruppa per tecnico quando si vede il lavoro di tutti: rispecchia il
  // "5 a uno, 5 a un altro" fatto finora sulla carta, invece di un unico
  // elenco indistinto. Con un tecnico già selezionato il raggruppamento
  // sarebbe un titolo su un solo gruppo, quindi si salta.
  const perTecnico =
    vedeTutti && !tecnicoScelto
      ? Object.entries(
          filtrati.reduce<Record<string, IncaricoRiga[]>>((acc, i) => {
            const chiave = i.tecnico?.nome ?? "Senza tecnico";
            (acc[chiave] ??= []).push(i);
            return acc;
          }, {}),
        ).sort(([a], [b]) => a.localeCompare(b))
      : null;

  const filtroAttivo = tecnicoScelto !== null || urgenzaScelta !== null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Incarichi</h1>
          <p className="text-sm text-slate-500">
            {daFare.length} da fare
            {completati.length > 0 && ` · ${completati.length} completati`}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Gli incarichi si segnano da soli come fatti quando il tecnico invia
            definitivamente il foglio di lavoro corrispondente.
          </p>
        </div>
        {puoGestire && (
          <Bottone
            type="button"
            onClick={() => setNuovoAperto((v) => !v)}
            variante={nuovoAperto ? "secondario" : "primario"}
          >
            {nuovoAperto ? "Annulla" : "Nuovo incarico"}
          </Bottone>
        )}
      </div>

      {nuovoAperto && (
        <FormNuovoIncarico
          clienti={clienti}
          tecnici={tecnici}
          onFatto={() => setNuovoAperto(false)}
        />
      )}

      {vedeTutti && daFare.length > 0 && (
        <GraficoCaricoTecnici
          carichi={carichi}
          selezionato={tecnicoScelto}
          onSeleziona={setTecnicoScelto}
        />
      )}

      {daFare.length > 0 && (
        <FiltroUrgenza
          incarichi={daFare}
          oggi={oggi}
          traSette={traSette}
          scelta={urgenzaScelta}
          onScegli={setUrgenzaScelta}
        />
      )}

      {daFare.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          Nessun incarico da fare al momento.
        </p>
      ) : filtrati.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-slate-500">
            Nessun incarico con questi filtri.
          </p>
          <button
            type="button"
            onClick={() => {
              setTecnicoScelto(null);
              setUrgenzaScelta(null);
            }}
            className="mt-2 text-sm font-medium text-brand-700 hover:underline"
          >
            Togli i filtri
          </button>
        </div>
      ) : perTecnico ? (
        <div className="flex flex-col gap-5">
          {perTecnico.map(([nomeTecnico, righe]) => (
            <section key={nomeTecnico}>
              <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
                {nomeTecnico} · {righe.length}
              </h2>
              <ul className="flex flex-col gap-3">
                {righe.map((i) => (
                  <RigaIncarico
                    key={i.id}
                    incarico={i}
                    puoGestire={puoGestire}
                    eTecnico={eTecnico}
                    mostraTecnico={false}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtroAttivo && (
            <li className="text-xs text-slate-500">
              {filtrati.length} di {daFare.length} incarichi
            </li>
          )}
          {filtrati.map((i) => (
            <RigaIncarico
              key={i.id}
              incarico={i}
              puoGestire={puoGestire}
              eTecnico={eTecnico}
              mostraTecnico={false}
            />
          ))}
        </ul>
      )}

      {completati.length > 0 && (
        <section className="mt-2">
          <Bottone
            type="button"
            variante="secondario"
            onClick={() => setMostraCompletati((v) => !v)}
          >
            {mostraCompletati
              ? "Nascondi completati"
              : `Mostra completati (${completati.length})`}
          </Bottone>
          {mostraCompletati && (
            <ul className="mt-3 flex flex-col gap-3">
              {completati.map((i) => (
                <RigaIncarico
                  key={i.id}
                  incarico={i}
                  puoGestire={puoGestire}
                  eTecnico={eTecnico}
                  mostraTecnico={vedeTutti}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/** Chip di filtro per urgenza, con il conteggio di ciascuna fascia. */
function FiltroUrgenza({
  incarichi,
  oggi,
  traSette,
  scelta,
  onScegli,
}: {
  incarichi: IncaricoRiga[];
  oggi: string;
  traSette: string;
  scelta: Urgenza | null;
  onScegli: (u: Urgenza | null) => void;
}) {
  const conta = (u: Urgenza) =>
    incarichi.filter((i) => urgenzaDi(i.scadenza, oggi, traSette) === u).length;

  const voci: { valore: Urgenza | null; etichetta: string; numero: number }[] = [
    { valore: null, etichetta: "Tutti", numero: incarichi.length },
    { valore: "inRitardo", etichetta: "In ritardo", numero: conta("inRitardo") },
    {
      valore: "inScadenza",
      etichetta: "Entro 7 giorni",
      numero: conta("inScadenza"),
    },
    { valore: "piuAvanti", etichetta: "Più avanti", numero: conta("piuAvanti") },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {voci.map((voce) => {
        const attivo = scelta === voce.valore;
        return (
          <button
            key={voce.etichetta}
            type="button"
            onClick={() => onScegli(voce.valore)}
            aria-pressed={attivo}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              attivo
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {voce.etichetta}
            <span
              className={attivo ? "text-brand-100" : "text-slate-400"}
            >
              {voce.numero}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function RigaIncarico({
  incarico,
  puoGestire,
  eTecnico,
  mostraTecnico,
}: {
  incarico: IncaricoRiga;
  puoGestire: boolean;
  eTecnico: boolean;
  mostraTecnico: boolean;
}) {
  const [statoSegna, azioneSegna] = useActionState<StatoIncarico, FormData>(
    segnaIncarico,
    {},
  );
  const [statoElimina, azioneElimina] = useActionState<StatoIncarico, FormData>(
    eliminaIncarico,
    {},
  );
  const [confermaElimina, setConfermaElimina] = useState(false);

  const completato = Boolean(incarico.completato_at);
  const scaduto = !completato && incarico.scadenza < oggiISO();

  return (
    <li className={`scheda p-4 ${completato ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">
            {incarico.cliente?.nome ?? "Cliente rimosso"}
          </p>
          <p className="text-sm text-slate-600">{incarico.tipo}</p>
          {incarico.note && (
            <p className="mt-1 text-sm whitespace-pre-line text-slate-500">
              {incarico.note}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Etichetta
            colore={completato ? "slate" : scaduto ? "rosso" : "brand"}
          >
            {completato
              ? "Completato"
              : scaduto
                ? "In ritardo"
                : `Entro ${formattaData(incarico.scadenza)}`}
          </Etichetta>
          {mostraTecnico && incarico.tecnico && (
            <span className="text-xs text-slate-400">
              {incarico.tecnico.nome}
            </span>
          )}
        </div>
      </div>

      {statoSegna.errore && (
        <p className="mt-2 text-xs text-red-700">{statoSegna.errore}</p>
      )}
      {statoElimina.errore && (
        <p className="mt-2 text-xs text-red-700">{statoElimina.errore}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Solo il tecnico compila: per gli altri ruoli il collegamento
            porterebbe a una pagina che non possono aprire. */}
        {eTecnico && !completato && (
          <Link
            href={`/nuovo?client_id=${incarico.client_id}&tipo=${encodeURIComponent(incarico.tipo)}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
            Vai a compila
          </Link>
        )}

        {/* Dall'incarico chiuso si risale al foglio che lo ha completato. */}
        {completato && incarico.intervento_id && (
          <Link
            href={`/archivio/${incarico.intervento_id}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Apri il foglio
          </Link>
        )}

        {/* La spunta serve solo ai lavori senza foglio: quando il foglio
            c'è, l'incarico si chiude da sé all'invio definitivo. Non si
            torna indietro: un incarico chiuso resta chiuso. */}
        {eTecnico && !completato && (
          <form action={azioneSegna}>
            <input type="hidden" name="id" value={incarico.id} />
            <BottoneInvio variante="secondario" inCorso="Attendere…">
              Segna come fatto
            </BottoneInvio>
          </form>
        )}

        {puoGestire &&
          (confermaElimina ? (
            <form action={azioneElimina} className="flex items-center gap-2">
              <input type="hidden" name="id" value={incarico.id} />
              <BottoneInvio variante="pericolo" inCorso="Eliminazione…">
                Conferma
              </BottoneInvio>
              <Bottone
                type="button"
                variante="secondario"
                onClick={() => setConfermaElimina(false)}
              >
                Annulla
              </Bottone>
            </form>
          ) : (
            <Bottone
              type="button"
              variante="secondario"
              onClick={() => setConfermaElimina(true)}
            >
              Elimina
            </Bottone>
          ))}
      </div>
    </li>
  );
}

function FormNuovoIncarico({
  clienti,
  tecnici,
  onFatto,
}: {
  clienti: ClienteBase[];
  tecnici: TecnicoBase[];
  onFatto: () => void;
}) {
  const [stato, azione] = useActionState<StatoIncarico, FormData>(
    async (precedente, formData) => {
      const risultato = await creaIncarico(precedente, formData);
      if (risultato.successo) onFatto();
      return risultato;
    },
    {},
  );

  return (
    <form action={azione} className="scheda flex flex-col gap-4 p-4">
      <h2 className="font-semibold text-slate-900">Nuovo incarico</h2>
      {stato.errore && <Avviso>{stato.errore}</Avviso>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etichetta" htmlFor="client_id-incarico">
            Cliente *
          </label>
          <select
            id="client_id-incarico"
            name="client_id"
            required
            className="campo"
            defaultValue=""
          >
            <option value="">— Seleziona cliente —</option>
            {clienti.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="etichetta" htmlFor="tecnico_id-incarico">
            Tecnico *
          </label>
          <select
            id="tecnico_id-incarico"
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etichetta" htmlFor="tipo-incarico">
            Tipo di commessa *
          </label>
          <select
            id="tipo-incarico"
            name="tipo"
            required
            className="campo"
            defaultValue=""
          >
            <option value="">— Seleziona tipo —</option>
            {TIPI_COMMESSA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="etichetta" htmlFor="scadenza-incarico">
            Scadenza *
          </label>
          <input
            id="scadenza-incarico"
            name="scadenza"
            type="date"
            required
            defaultValue={oggiISO()}
            className="campo"
          />
        </div>
      </div>

      <div>
        <label className="etichetta" htmlFor="note-incarico">
          Note
        </label>
        <textarea
          id="note-incarico"
          name="note"
          rows={2}
          className="campo resize-y"
          placeholder="Dettagli specifici della lavorazione richiesta…"
        />
      </div>

      <BottoneInvio inCorso="Salvataggio…" className="self-start">
        Assegna incarico
      </BottoneInvio>
    </form>
  );
}
