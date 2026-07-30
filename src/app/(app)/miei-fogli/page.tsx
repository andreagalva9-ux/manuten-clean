import Link from "next/link";
import { redirect } from "next/navigation";

import { Avviso, BottoneLink, Etichetta, StatoVuoto } from "@/components/ui";
import { richiediProfilo } from "@/lib/auth";
import {
  codiceCommessa,
  formattaData,
  formattaOre,
  puoVedereTutto,
} from "@/lib/dominio";
import { messaggioErrore } from "@/lib/errori";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "I miei fogli · Manuten & Clean" };

/**
 * Vista personale del tecnico: solo i fogli che ha compilato o su cui è
 * assegnato, senza i filtri e la navigazione dell'archivio generale, a cui
 * non ha accesso. Chi vede tutto usa direttamente /archivio.
 */
export default async function PaginaMieiFogli() {
  const profilo = await richiediProfilo();
  if (puoVedereTutto(profilo)) redirect("/archivio");

  const supabase = await createClient();

  // Le policy RLS restituiscono già solo i fogli del tecnico: non serve
  // filtrare di nuovo qui, e non si rischia di divergere dalle regole.
  const { data: fogli, error } = await supabase
    .from("interventi")
    .select("*, cliente:clients(nome)")
    .is("deleted_at", null)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <Avviso>Impossibile caricare i tuoi fogli. {messaggioErrore(error)}</Avviso>
    );
  }

  const bozze = (fogli ?? []).filter((f) => !f.finalizzato_at);
  const inviati = (fogli ?? []).filter((f) => f.finalizzato_at);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">I miei fogli</h1>
          <p className="text-sm text-slate-500">
            {bozze.length} da completare
            {inviati.length > 0 && ` · ${inviati.length} inviati`}
          </p>
        </div>
        <BottoneLink href="/nuovo" className="shrink-0">
          Nuovo foglio
        </BottoneLink>
      </div>

      {bozze.length === 0 && inviati.length === 0 ? (
        <StatoVuoto
          titolo="Nessun foglio di lavoro"
          descrizione="Qui trovi i fogli che compili. Iniziane uno nuovo quando esegui un intervento."
          azione={
            <Link
              href="/nuovo"
              className="font-semibold text-brand-700 underline underline-offset-2"
            >
              Compila il primo foglio
            </Link>
          }
        />
      ) : (
        <>
          <Sezione
            titolo="Da completare e inviare"
            vuoto="Nessuna bozza in sospeso."
            fogli={bozze}
          />
          {inviati.length > 0 && (
            <Sezione
              titolo="Inviati definitivamente"
              vuoto=""
              fogli={inviati}
            />
          )}
        </>
      )}
    </div>
  );
}

type Foglio = {
  id: string;
  tipo: string;
  numero: number;
  data: string;
  ore: number | null;
  lavoro_svolto: string;
  finalizzato_at: string | null;
  cliente: { nome: string } | null;
};

function Sezione({
  titolo,
  vuoto,
  fogli,
}: {
  titolo: string;
  vuoto: string;
  fogli: Foglio[];
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
        {titolo}
      </h2>

      {fogli.length === 0 ? (
        <p className="py-4 text-sm text-slate-500">{vuoto}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {fogli.map((foglio) => (
            <li key={foglio.id}>
              <Link
                href={`/archivio/${foglio.id}`}
                className="scheda block p-4 transition hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold text-brand-800">
                      {codiceCommessa(foglio.tipo, foglio.numero)}
                    </p>
                    <p className="mt-0.5 font-semibold text-slate-900">
                      {foglio.cliente?.nome ?? "Cliente rimosso"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-medium text-slate-700">
                      {formattaData(foglio.data)}
                    </span>
                    <Etichetta>{formattaOre(foglio.ore)}</Etichetta>
                  </div>
                </div>

                <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                  {foglio.lavoro_svolto}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Etichetta colore="brand">{foglio.tipo}</Etichetta>
                  {foglio.finalizzato_at ? (
                    <Etichetta>Inviato</Etichetta>
                  ) : (
                    <Etichetta colore="rosso">Da inviare</Etichetta>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
