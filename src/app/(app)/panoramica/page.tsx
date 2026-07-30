import Link from "next/link";

import { richiediProfilo } from "@/lib/auth";
import {
  codiceCommessa,
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

function traGiorniISO(giorni: number) {
  const d = new Date();
  d.setDate(d.getDate() + giorni);
  return d.toISOString().slice(0, 10);
}

type IncaricoLista = {
  id: string;
  tipo: string;
  scadenza: string;
  client_id: string;
  cliente: { nome: string } | null;
  tecnico: { nome: string } | null;
};

type FoglioLista = {
  id: string;
  tipo: string;
  numero: number;
  data: string;
  finalizzato_at: string | null;
  cliente: { nome: string } | null;
};

export default async function PaginaPanoramica() {
  const profilo = await richiediProfilo();
  const supabase = await createClient();
  const oggi = oggiISO();
  const inizioMese = inizioMeseISO();
  const tragiorni = traGiorniISO(7);

  // Le policy RLS scopano già le query per ruolo: il tecnico riceve solo i
  // propri incarichi e fogli, ufficio/supervisore/pianificatore tutto.
  const [
    { count: incarichiDaFare },
    { count: incarichiInRitardo },
    { count: incarichiSettimana },
    { count: incarichiCompletatiMese },
    { data: prossimiIncarichi },
    { count: fogliMese },
    { count: bozze },
    { data: ultimiFogli },
  ] = await Promise.all([
    supabase
      .from("incarichi")
      .select("id", { count: "exact", head: true })
      .is("completato_at", null),
    supabase
      .from("incarichi")
      .select("id", { count: "exact", head: true })
      .is("completato_at", null)
      .lt("scadenza", oggi),
    supabase
      .from("incarichi")
      .select("id", { count: "exact", head: true })
      .is("completato_at", null)
      .gte("scadenza", oggi)
      .lte("scadenza", tragiorni),
    supabase
      .from("incarichi")
      .select("id", { count: "exact", head: true })
      .gte("completato_at", `${inizioMese}T00:00:00Z`),
    supabase
      .from("incarichi")
      .select(
        "id, tipo, scadenza, client_id, cliente:clients(nome), tecnico:profiles!incarichi_tecnico_id_fkey(nome)",
      )
      .is("completato_at", null)
      .order("scadenza")
      .limit(5),
    supabase
      .from("interventi")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("data", inizioMese),
    supabase
      .from("interventi")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .is("finalizzato_at", null),
    supabase
      .from("interventi")
      .select(
        "id, tipo, numero, data, finalizzato_at, cliente:clients(nome)",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const dati = {
    incarichiDaFare: incarichiDaFare ?? 0,
    incarichiInRitardo: incarichiInRitardo ?? 0,
    incarichiSettimana: incarichiSettimana ?? 0,
    incarichiCompletatiMese: incarichiCompletatiMese ?? 0,
    fogliMese: fogliMese ?? 0,
    bozze: bozze ?? 0,
    prossimiIncarichi: (prossimiIncarichi ?? []) as unknown as IncaricoLista[],
    ultimiFogli: (ultimiFogli ?? []) as unknown as FoglioLista[],
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

type Dati = {
  incarichiDaFare: number;
  incarichiInRitardo: number;
  incarichiSettimana: number;
  incarichiCompletatiMese: number;
  fogliMese: number;
  bozze: number;
  prossimiIncarichi: IncaricoLista[];
  ultimiFogli: FoglioLista[];
};

/* ---------- Dashboard per ruolo ---------- */

function DashboardTecnico({
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
        sottotitolo="Il tuo lavoro di oggi, a colpo d'occhio."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          etichetta="Incarichi da fare"
          valore={dati.incarichiDaFare}
          href="/incarichi"
        />
        <StatCard
          etichetta="In ritardo"
          valore={dati.incarichiInRitardo}
          href="/incarichi"
          allarme={dati.incarichiInRitardo > 0}
        />
        <StatCard
          etichetta="Bozze da inviare"
          valore={dati.bozze}
          href="/archivio"
          allarme={dati.bozze > 0}
        />
        <StatCard
          etichetta="Fogli questo mese"
          valore={dati.fogliMese}
          href="/archivio"
        />
      </div>

      <ListaIncarichi
        titolo="I tuoi prossimi incarichi"
        incarichi={dati.prossimiIncarichi}
        mostraTecnico={false}
        vuoto="Nessun incarico in programma: ottimo lavoro!"
      />

      <AzioniRapide
        azioni={[
          { href: "/nuovo", etichetta: "Compila un nuovo foglio", primaria: true },
          { href: "/incarichi", etichetta: "I miei incarichi" },
          { href: "/archivio", etichetta: "I miei fogli" },
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
        sottotitolo="Lo stato della pianificazione dei tecnici."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          etichetta="Incarichi aperti"
          valore={dati.incarichiDaFare}
          href="/incarichi"
        />
        <StatCard
          etichetta="In ritardo"
          valore={dati.incarichiInRitardo}
          href="/incarichi"
          allarme={dati.incarichiInRitardo > 0}
        />
        <StatCard
          etichetta="In scadenza (7 gg)"
          valore={dati.incarichiSettimana}
          href="/incarichi"
        />
        <StatCard
          etichetta="Completati nel mese"
          valore={dati.incarichiCompletatiMese}
          href="/incarichi"
        />
      </div>

      <ListaIncarichi
        titolo="Prossime scadenze"
        incarichi={dati.prossimiIncarichi}
        mostraTecnico
        vuoto="Nessun incarico aperto: pianifica il prossimo periodo."
      />

      <AzioniRapide
        azioni={[
          { href: "/incarichi", etichetta: "Gestisci gli incarichi", primaria: true },
          { href: "/archivio", etichetta: "Consulta l'archivio" },
          { href: "/clienti", etichetta: "Anagrafica clienti" },
        ]}
      />
    </div>
  );
}

function DashboardUfficio({
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
        sottotitolo="L'operatività di oggi: fogli, incarichi e scadenze."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          etichetta="Fogli questo mese"
          valore={dati.fogliMese}
          href="/archivio"
        />
        <StatCard
          etichetta="Bozze aperte"
          valore={dati.bozze}
          href="/archivio"
          allarme={dati.bozze > 0}
        />
        <StatCard
          etichetta="Incarichi aperti"
          valore={dati.incarichiDaFare}
          href="/incarichi"
        />
        <StatCard
          etichetta="In ritardo"
          valore={dati.incarichiInRitardo}
          href="/incarichi"
          allarme={dati.incarichiInRitardo > 0}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ListaFogli titolo="Ultimi fogli di lavoro" fogli={dati.ultimiFogli} />
        <ListaIncarichi
          titolo="Prossime scadenze"
          incarichi={dati.prossimiIncarichi}
          mostraTecnico
          vuoto="Nessun incarico aperto."
        />
      </div>

      <AzioniRapide
        azioni={[
          { href: "/nuovo", etichetta: "Nuovo foglio", primaria: true },
          { href: "/incarichi", etichetta: "Incarichi" },
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
        sottotitolo="Il quadro generale della piattaforma, in sola consultazione."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          etichetta="Fogli questo mese"
          valore={dati.fogliMese}
          href="/archivio"
        />
        <StatCard
          etichetta="Bozze aperte"
          valore={dati.bozze}
          href="/archivio"
        />
        <StatCard
          etichetta="Incarichi aperti"
          valore={dati.incarichiDaFare}
          href="/incarichi"
        />
        <StatCard
          etichetta="In ritardo"
          valore={dati.incarichiInRitardo}
          href="/incarichi"
          allarme={dati.incarichiInRitardo > 0}
        />
        <StatCard
          etichetta="In scadenza (7 gg)"
          valore={dati.incarichiSettimana}
          href="/incarichi"
        />
        <StatCard
          etichetta="Completati nel mese"
          valore={dati.incarichiCompletatiMese}
          href="/incarichi"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ListaFogli titolo="Ultimi fogli di lavoro" fogli={dati.ultimiFogli} />
        <ListaIncarichi
          titolo="Prossime scadenze"
          incarichi={dati.prossimiIncarichi}
          mostraTecnico
          vuoto="Nessun incarico aperto."
        />
      </div>

      <AzioniRapide
        azioni={[
          { href: "/archivio", etichetta: "Archivio completo", primaria: true },
          { href: "/incarichi", etichetta: "Tutti gli incarichi" },
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

function StatCard({
  etichetta,
  valore,
  href,
  allarme = false,
}: {
  etichetta: string;
  valore: number;
  href: string;
  allarme?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`scheda block p-4 transition hover:shadow-md ${
        allarme ? "border-red-200 bg-red-50" : ""
      }`}
    >
      <p
        className={`text-2xl font-bold ${
          allarme ? "text-red-700" : "text-slate-900"
        }`}
      >
        {valore}
      </p>
      <p
        className={`mt-0.5 text-xs font-medium ${
          allarme ? "text-red-700" : "text-slate-500"
        }`}
      >
        {etichetta}
      </p>
    </Link>
  );
}

function ListaIncarichi({
  titolo,
  incarichi,
  mostraTecnico,
  vuoto,
}: {
  titolo: string;
  incarichi: IncaricoLista[];
  mostraTecnico: boolean;
  vuoto: string;
}) {
  const oggi = oggiISO();

  return (
    <section className="scheda p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">{titolo}</h2>
        <Link
          href="/incarichi"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          Vedi tutti
        </Link>
      </div>

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
                {i.scadenza < oggi
                  ? "In ritardo"
                  : formattaData(i.scadenza)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ListaFogli({
  titolo,
  fogli,
}: {
  titolo: string;
  fogli: FoglioLista[];
}) {
  return (
    <section className="scheda p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">{titolo}</h2>
        <Link
          href="/archivio"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          Archivio
        </Link>
      </div>

      {fogli.length === 0 ? (
        <p className="py-4 text-sm text-slate-500">
          Nessun foglio di lavoro ancora salvato.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {fogli.map((f) => (
            <li key={f.id}>
              <Link
                href={`/archivio/${f.id}`}
                className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {f.cliente?.nome ?? "Cliente rimosso"}
                  </p>
                  <p className="truncate font-mono text-xs text-brand-800">
                    {codiceCommessa(f.tipo, f.numero)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-medium text-slate-600">
                    {formattaData(f.data)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {f.finalizzato_at ? "Inviato" : "Bozza"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
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
