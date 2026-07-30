import Link from "next/link";

import {
  Anello,
  COLORE_GRAFICI,
  GraficoBarre,
  GraficoScadenze,
  Scheda,
} from "@/components/grafici";
import { richiediProfilo } from "@/lib/auth";
import {
  formattaData,
  isPianificatore,
  isSupervisore,
  oggiISO,
  type Profilo,
} from "@/lib/dominio";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Panoramica · Manuten & Clean" };

function inizioMeseISO() {
  const oggi = new Date();
  return `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, "0")}-01`;
}

function fineMeseISO() {
  const oggi = new Date();
  const fine = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0);
  return fine.toISOString().slice(0, 10);
}

function traGiorniISO(giorni: number) {
  const d = new Date();
  d.setDate(d.getDate() + giorni);
  return d.toISOString().slice(0, 10);
}

type IncaricoAperto = {
  id: string;
  tipo: string;
  scadenza: string;
  client_id: string;
  cliente: { nome: string } | null;
  tecnico: { nome: string } | null;
};

export default async function PaginaPanoramica() {
  const profilo = await richiediProfilo();
  const supabase = await createClient();

  const oggi = oggiISO();
  const inizioMese = inizioMeseISO();
  const fineMese = fineMeseISO();
  const traSette = traGiorniISO(7);
  const traTrenta = traGiorniISO(30);

  // Le policy RLS scopano già i risultati per ruolo: il tecnico riceve solo i
  // propri incarichi, gli altri ruoli tutti. Si legge l'elenco degli aperti
  // una volta sola e si aggrega qui, invece di moltiplicare le interrogazioni.
  const [{ data: aperti }, { data: delMese }] = await Promise.all([
    supabase
      .from("incarichi")
      .select(
        "id, tipo, scadenza, client_id, cliente:clients(nome), tecnico:profiles!incarichi_tecnico_id_fkey(nome)",
      )
      .is("completato_at", null)
      .order("scadenza"),
    supabase
      .from("incarichi")
      .select("id, completato_at")
      .gte("scadenza", inizioMese)
      .lte("scadenza", fineMese),
  ]);

  const incarichiAperti = (aperti ?? []) as unknown as IncaricoAperto[];
  const mese = delMese ?? [];

  const inRitardo = incarichiAperti.filter((i) => i.scadenza < oggi);
  const dati = {
    aperti: incarichiAperti,
    inRitardo,
    prossimi: incarichiAperti.slice(0, 5),
    meseTotali: mese.length,
    meseCompletati: mese.filter((i) => i.completato_at).length,
    fasce: [
      {
        etichetta: "In ritardo",
        valore: inRitardo.length,
        colore: COLORE_GRAFICI.ritardo,
      },
      {
        etichetta: "Oggi",
        valore: incarichiAperti.filter((i) => i.scadenza === oggi).length,
        colore: COLORE_GRAFICI.oggi,
      },
      {
        etichetta: "Entro 7 gg",
        valore: incarichiAperti.filter(
          (i) => i.scadenza > oggi && i.scadenza <= traSette,
        ).length,
        colore: COLORE_GRAFICI.vicino,
      },
      {
        etichetta: "Entro 30 gg",
        valore: incarichiAperti.filter(
          (i) => i.scadenza > traSette && i.scadenza <= traTrenta,
        ).length,
        colore: COLORE_GRAFICI.lontano,
      },
      {
        etichetta: "Oltre",
        valore: incarichiAperti.filter((i) => i.scadenza > traTrenta).length,
        colore: COLORE_GRAFICI.lontano,
      },
    ],
    perTecnico: raggruppa(
      incarichiAperti,
      (i) => i.tecnico?.nome ?? "Senza tecnico",
      oggi,
    ),
    perTipo: raggruppa(incarichiAperti, (i) => i.tipo, oggi),
  };

  if (profilo.ruolo === "tecnico") {
    return <DashboardTecnico profilo={profilo} dati={dati} />;
  }
  if (isPianificatore(profilo)) {
    return <DashboardPianificatore profilo={profilo} dati={dati} />;
  }
  if (isSupervisore(profilo)) {
    return <DashboardSupervisore profilo={profilo} dati={dati} />;
  }
  return <DashboardUfficio profilo={profilo} dati={dati} />;
}

/** Conta gli incarichi per chiave, tenendo separata la quota già scaduta. */
function raggruppa(
  incarichi: IncaricoAperto[],
  chiave: (i: IncaricoAperto) => string,
  oggi: string,
) {
  const mappa = new Map<string, { valore: number; evidenzia: number }>();

  for (const incarico of incarichi) {
    const k = chiave(incarico);
    const voce = mappa.get(k) ?? { valore: 0, evidenzia: 0 };
    voce.valore += 1;
    if (incarico.scadenza < oggi) voce.evidenzia += 1;
    mappa.set(k, voce);
  }

  return [...mappa.entries()]
    .map(([etichetta, v]) => ({ etichetta, ...v }))
    .sort((a, b) => b.valore - a.valore)
    .slice(0, 6);
}

type Dati = {
  aperti: IncaricoAperto[];
  inRitardo: IncaricoAperto[];
  prossimi: IncaricoAperto[];
  meseTotali: number;
  meseCompletati: number;
  fasce: { etichetta: string; valore: number; colore: string }[];
  perTecnico: { etichetta: string; valore: number; evidenzia: number }[];
  perTipo: { etichetta: string; valore: number; evidenzia: number }[];
};

/* ---------- Dashboard per ruolo ---------- */

function DashboardTecnico({ profilo, dati }: { profilo: Profilo; dati: Dati }) {
  return (
    <div className="flex flex-col gap-5">
      <Intestazione
        titolo={`Ciao ${primoNome(profilo.nome)}`}
        sottotitolo="Il tuo lavoro e le tue scadenze, a colpo d'occhio."
      />

      <Indicatori
        voci={[
          { etichetta: "Da fare", valore: dati.aperti.length, href: "/incarichi" },
          {
            etichetta: "In ritardo",
            valore: dati.inRitardo.length,
            href: "/incarichi",
            allarme: dati.inRitardo.length > 0,
          },
          {
            etichetta: "Completati nel mese",
            valore: dati.meseCompletati,
            href: "/incarichi",
          },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Scheda
            titolo="Le tue scadenze"
            sottotitolo="Incarichi aperti per urgenza"
            azione={{ href: "/incarichi", etichetta: "Vedi tutti" }}
          >
            <GraficoScadenze fasce={dati.fasce} />
          </Scheda>
        </div>
        <Scheda titolo="Avanzamento del mese">
          <Anello
            completati={dati.meseCompletati}
            totali={dati.meseTotali}
            etichetta="Incarichi con scadenza in questo mese"
          />
        </Scheda>
      </div>

      <ListaIncarichi
        titolo="I tuoi prossimi incarichi"
        incarichi={dati.prossimi}
        mostraTecnico={false}
        vuoto="Nessun incarico in programma: ottimo lavoro!"
      />

      <AzioniRapide
        azioni={[
          { href: "/nuovo", etichetta: "Compila un nuovo foglio", primaria: true },
          { href: "/incarichi", etichetta: "I miei incarichi" },
          { href: "/miei-fogli", etichetta: "I miei fogli" },
        ]}
      />
    </div>
  );
}

function DashboardPianificatore({
  profilo,
  dati,
}: {
  profilo: Profilo;
  dati: Dati;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Intestazione
        titolo={`Ciao ${primoNome(profilo.nome)}`}
        sottotitolo="Lo stato della pianificazione e il carico dei tecnici."
      />

      <Indicatori
        voci={[
          { etichetta: "Incarichi aperti", valore: dati.aperti.length, href: "/incarichi" },
          {
            etichetta: "In ritardo",
            valore: dati.inRitardo.length,
            href: "/incarichi",
            allarme: dati.inRitardo.length > 0,
          },
          { etichetta: "Completati nel mese", valore: dati.meseCompletati, href: "/incarichi" },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Scheda
            titolo="Scadenze"
            sottotitolo="Incarichi aperti per urgenza"
            azione={{ href: "/incarichi", etichetta: "Gestisci" }}
          >
            <GraficoScadenze fasce={dati.fasce} />
          </Scheda>
        </div>
        <Scheda titolo="Avanzamento del mese">
          <Anello
            completati={dati.meseCompletati}
            totali={dati.meseTotali}
            etichetta="Incarichi con scadenza in questo mese"
          />
        </Scheda>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Scheda titolo="Carico per tecnico" sottotitolo="Incarichi aperti assegnati">
          <GraficoBarre
            voci={dati.perTecnico}
            vuoto="Nessun incarico assegnato al momento."
          />
        </Scheda>
        <Scheda titolo="Per tipo di lavorazione" sottotitolo="Incarichi aperti">
          <GraficoBarre voci={dati.perTipo} vuoto="Nessun incarico aperto." />
        </Scheda>
      </div>

      <ListaIncarichi
        titolo="Prossime scadenze"
        incarichi={dati.prossimi}
        mostraTecnico
        vuoto="Nessun incarico aperto: pianifica il prossimo periodo."
      />

      <AzioniRapide
        azioni={[
          { href: "/incarichi", etichetta: "Gestisci gli incarichi", primaria: true },
          { href: "/clienti", etichetta: "Anagrafica clienti" },
        ]}
      />
    </div>
  );
}

function DashboardUfficio({ profilo, dati }: { profilo: Profilo; dati: Dati }) {
  return (
    <div className="flex flex-col gap-5">
      <Intestazione
        titolo={`Ciao ${primoNome(profilo.nome)}`}
        sottotitolo="Lo stato del lavoro assegnato ai tecnici."
      />

      <Indicatori
        voci={[
          { etichetta: "Incarichi aperti", valore: dati.aperti.length, href: "/incarichi" },
          {
            etichetta: "In ritardo",
            valore: dati.inRitardo.length,
            href: "/incarichi",
            allarme: dati.inRitardo.length > 0,
          },
          { etichetta: "Completati nel mese", valore: dati.meseCompletati, href: "/incarichi" },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Scheda
            titolo="Scadenze"
            sottotitolo="Incarichi aperti per urgenza"
            azione={{ href: "/incarichi", etichetta: "Vedi tutti" }}
          >
            <GraficoScadenze fasce={dati.fasce} />
          </Scheda>
        </div>
        <Scheda titolo="Avanzamento del mese">
          <Anello
            completati={dati.meseCompletati}
            totali={dati.meseTotali}
            etichetta="Incarichi con scadenza in questo mese"
          />
        </Scheda>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Scheda titolo="Carico per tecnico" sottotitolo="Incarichi aperti assegnati">
          <GraficoBarre
            voci={dati.perTecnico}
            vuoto="Nessun incarico assegnato al momento."
          />
        </Scheda>
        <Scheda titolo="Per tipo di lavorazione" sottotitolo="Incarichi aperti">
          <GraficoBarre voci={dati.perTipo} vuoto="Nessun incarico aperto." />
        </Scheda>
      </div>

      <ListaIncarichi
        titolo="Prossime scadenze"
        incarichi={dati.prossimi}
        mostraTecnico
        vuoto="Nessun incarico aperto."
      />

      <AzioniRapide
        azioni={[
          { href: "/nuovo", etichetta: "Nuovo foglio", primaria: true },
          { href: "/archivio", etichetta: "Archivio" },
          { href: "/clienti", etichetta: "Clienti" },
          { href: "/tecnici", etichetta: "Tecnici" },
        ]}
      />
    </div>
  );
}

function DashboardSupervisore({
  profilo,
  dati,
}: {
  profilo: Profilo;
  dati: Dati;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Intestazione
        titolo={`Ciao ${primoNome(profilo.nome)}`}
        sottotitolo="Il quadro generale dell'attività, in sola consultazione."
      />

      <Indicatori
        voci={[
          { etichetta: "Incarichi aperti", valore: dati.aperti.length, href: "/incarichi" },
          {
            etichetta: "In ritardo",
            valore: dati.inRitardo.length,
            href: "/incarichi",
            allarme: dati.inRitardo.length > 0,
          },
          { etichetta: "Completati nel mese", valore: dati.meseCompletati, href: "/incarichi" },
          { etichetta: "Nel mese", valore: dati.meseTotali, href: "/incarichi" },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Scheda titolo="Scadenze" sottotitolo="Incarichi aperti per urgenza">
            <GraficoScadenze fasce={dati.fasce} />
          </Scheda>
        </div>
        <Scheda titolo="Avanzamento del mese">
          <Anello
            completati={dati.meseCompletati}
            totali={dati.meseTotali}
            etichetta="Incarichi con scadenza in questo mese"
          />
        </Scheda>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Scheda titolo="Carico per tecnico" sottotitolo="Incarichi aperti assegnati">
          <GraficoBarre
            voci={dati.perTecnico}
            vuoto="Nessun incarico assegnato al momento."
          />
        </Scheda>
        <Scheda titolo="Per tipo di lavorazione" sottotitolo="Incarichi aperti">
          <GraficoBarre voci={dati.perTipo} vuoto="Nessun incarico aperto." />
        </Scheda>
      </div>

      <ListaIncarichi
        titolo="Prossime scadenze"
        incarichi={dati.prossimi}
        mostraTecnico
        vuoto="Nessun incarico aperto."
      />

      <AzioniRapide
        azioni={[
          { href: "/incarichi", etichetta: "Tutti gli incarichi", primaria: true },
          { href: "/archivio", etichetta: "Archivio" },
          { href: "/clienti", etichetta: "Clienti" },
          { href: "/tecnici", etichetta: "Utenti" },
        ]}
      />
    </div>
  );
}

/* ---------- Componenti di presentazione ---------- */

function primoNome(nome: string) {
  return nome.split(" ")[0] || nome;
}

function Intestazione({
  titolo,
  sottotitolo,
}: {
  titolo: string;
  sottotitolo: string;
}) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">{titolo}</h1>
      <p className="text-sm text-slate-500">{sottotitolo}</p>
    </div>
  );
}

function Indicatori({
  voci,
}: {
  voci: {
    etichetta: string;
    valore: number;
    href: string;
    allarme?: boolean;
  }[];
}) {
  return (
    <div
      className={`grid gap-3 ${voci.length > 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}
    >
      {voci.map((voce) => (
        <Link
          key={voce.etichetta}
          href={voce.href}
          className={`scheda block p-4 transition hover:shadow-md ${
            voce.allarme ? "border-red-200 bg-red-50" : ""
          }`}
        >
          <p
            className={`text-2xl font-bold ${
              voce.allarme ? "text-red-700" : "text-slate-900"
            }`}
          >
            {voce.valore}
          </p>
          <p
            className={`mt-0.5 text-xs font-medium ${
              voce.allarme ? "text-red-700" : "text-slate-500"
            }`}
          >
            {voce.etichetta}
          </p>
        </Link>
      ))}
    </div>
  );
}

function ListaIncarichi({
  titolo,
  incarichi,
  mostraTecnico,
  vuoto,
}: {
  titolo: string;
  incarichi: IncaricoAperto[];
  mostraTecnico: boolean;
  vuoto: string;
}) {
  const oggi = oggiISO();

  return (
    <Scheda titolo={titolo} azione={{ href: "/incarichi", etichetta: "Vedi tutti" }}>
      {incarichi.length === 0 ? (
        <p className="py-4 text-sm text-slate-500">{vuoto}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {incarichi.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {i.cliente?.nome ?? "Cliente rimosso"}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {i.tipo}
                  {mostraTecnico && i.tecnico && ` · ${i.tecnico.nome}`}
                </p>
              </div>
              <span
                className={`shrink-0 text-xs font-semibold ${
                  i.scadenza < oggi ? "text-red-700" : "text-slate-600"
                }`}
              >
                {i.scadenza < oggi ? "In ritardo" : formattaData(i.scadenza)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Scheda>
  );
}

function AzioniRapide({
  azioni,
}: {
  azioni: { href: string; etichetta: string; primaria?: boolean }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {azioni.map((a) =>
        a.primaria ? (
          <Link
            key={a.href}
            href={a.href}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
            {a.etichetta}
          </Link>
        ) : (
          <Link
            key={a.href}
            href={a.href}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {a.etichetta}
          </Link>
        ),
      )}
    </div>
  );
}
