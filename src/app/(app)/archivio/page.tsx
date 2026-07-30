import Link from "next/link";

import { Filtri } from "@/app/(app)/archivio/filtri";
import { Avviso, BottoneLink, Etichetta, StatoVuoto } from "@/components/ui";
import { richiediProfilo } from "@/lib/auth";
import {
  codiceCommessa,
  formattaData,
  formattaOre,
  isUfficio,
  puoCompilare,
  puoVedereTutto,
} from "@/lib/dominio";
import { messaggioErrore } from "@/lib/errori";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Archivio · Manuten & Clean" };

const PER_PAGINA = 20;

type ParametriRicerca = {
  cliente?: string;
  tipo?: string;
  q?: string;
  pagina?: string;
  eliminati?: string;
};

export default async function PaginaArchivio({
  searchParams,
}: {
  searchParams: Promise<ParametriRicerca>;
}) {
  const profilo = await richiediProfilo();
  const params = await searchParams;
  const supabase = await createClient();

  const pagina = Math.max(1, Number(params.pagina ?? "1") || 1);
  const da = (pagina - 1) * PER_PAGINA;
  const soloEliminati = params.eliminati === "1" && isUfficio(profilo);

  let query = supabase
    .from("interventi")
    .select(
      "*, cliente:clients(id, nome, indirizzo), compilatore:profiles!interventi_compilato_da_fkey(id, nome)",
      { count: "exact" },
    )
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
    .range(da, da + PER_PAGINA - 1);

  query = soloEliminati
    ? query.not("deleted_at", "is", null)
    : query.is("deleted_at", null);

  if (params.cliente) query = query.eq("client_id", params.cliente);
  if (params.tipo) query = query.eq("tipo", params.tipo);
  if (params.q) query = query.ilike("lavoro_svolto", `%${params.q}%`);

  const [{ data: interventi, error, count }, { data: clienti }] =
    await Promise.all([
      query,
      supabase
        .from("clients")
        .select("id, nome")
        .order("nome"),
    ]);

  if (error) {
    return (
      <Avviso>
        Impossibile caricare l&apos;archivio. {messaggioErrore(error)}
      </Avviso>
    );
  }

  const totale = count ?? 0;
  const pagineTotali = Math.max(1, Math.ceil(totale / PER_PAGINA));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {soloEliminati ? "Fogli eliminati" : "Archivio fogli di lavoro"}
          </h1>
          <p className="text-sm text-slate-500">
            {totale} {totale === 1 ? "foglio" : "fogli"}
            {!puoVedereTutto(profilo) && " visibili al tuo profilo"}
          </p>
        </div>
        {puoCompilare(profilo) && (
          <BottoneLink href="/nuovo" className="shrink-0">
            Nuovo foglio
          </BottoneLink>
        )}
      </div>

      <Filtri clienti={clienti ?? []} />

      {interventi && interventi.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {interventi.map((intervento) => (
            <li key={intervento.id}>
              <Link
                href={`/archivio/${intervento.id}`}
                className="scheda block p-4 transition hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold text-brand-800">
                      {codiceCommessa(intervento.tipo, intervento.numero)}
                    </p>
                    <p className="mt-0.5 font-semibold text-slate-900">
                      {intervento.cliente?.nome ?? "Cliente rimosso"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-medium text-slate-700">
                      {formattaData(intervento.data)}
                    </span>
                    <Etichetta>{formattaOre(intervento.ore)}</Etichetta>
                  </div>
                </div>

                <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                  {intervento.lavoro_svolto}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Etichetta colore="brand">{intervento.tipo}</Etichetta>
                  {intervento.deleted_at && (
                    <Etichetta colore="rosso">Eliminato</Etichetta>
                  )}
                  {!intervento.deleted_at && intervento.finalizzato_at && (
                    <Etichetta>Inviato</Etichetta>
                  )}
                  <span className="text-xs text-slate-400">
                    {intervento.compilatore?.nome ?? "—"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <StatoVuoto
          titolo="Nessun foglio trovato"
          descrizione={
            params.q || params.cliente || params.tipo
              ? "Nessun risultato con i filtri impostati. Prova ad allargare la ricerca."
              : "Non è ancora stato salvato nessun foglio di lavoro."
          }
        />
      )}

      <Paginazione
        pagina={pagina}
        pagineTotali={pagineTotali}
        params={params}
      />

      {isUfficio(profilo) && (
        <Link
          href={soloEliminati ? "/archivio" : "/archivio?eliminati=1"}
          className="self-center text-sm font-medium text-slate-500 underline underline-offset-2"
        >
          {soloEliminati
            ? "Torna ai fogli attivi"
            : "Mostra i fogli eliminati"}
        </Link>
      )}
    </div>
  );
}

function Paginazione({
  pagina,
  pagineTotali,
  params,
}: {
  pagina: number;
  pagineTotali: number;
  params: ParametriRicerca;
}) {
  if (pagineTotali <= 1) return null;

  function href(nuovaPagina: number) {
    const q = new URLSearchParams();
    if (params.cliente) q.set("cliente", params.cliente);
    if (params.tipo) q.set("tipo", params.tipo);
    if (params.q) q.set("q", params.q);
    if (params.eliminati) q.set("eliminati", params.eliminati);
    if (nuovaPagina > 1) q.set("pagina", String(nuovaPagina));
    const stringa = q.toString();
    return stringa ? `/archivio?${stringa}` : "/archivio";
  }

  return (
    <nav
      className="flex items-center justify-between gap-3"
      aria-label="Paginazione archivio"
    >
      {pagina > 1 ? (
        <BottoneLink variante="secondario" href={href(pagina - 1)}>
          ← Precedente
        </BottoneLink>
      ) : (
        <span />
      )}

      <span className="text-sm text-slate-500">
        Pagina {pagina} di {pagineTotali}
      </span>

      {pagina < pagineTotali ? (
        <BottoneLink variante="secondario" href={href(pagina + 1)}>
          Successiva →
        </BottoneLink>
      ) : (
        <span />
      )}
    </nav>
  );
}
