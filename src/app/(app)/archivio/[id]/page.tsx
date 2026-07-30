import Link from "next/link";
import { notFound } from "next/navigation";

import { Dettaglio } from "@/app/(app)/archivio/[id]/dettaglio";
import { Avviso } from "@/components/ui";
import { richiediProfilo } from "@/lib/auth";
import { codiceCommessa, puoVedereTutto } from "@/lib/dominio";
import { messaggioErrore } from "@/lib/errori";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Foglio di lavoro · Manuten & Clean" };

export default async function PaginaDettaglio({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creato?: string }>;
}) {
  const profilo = await richiediProfilo();
  const { id } = await params;
  const { creato } = await searchParams;
  const supabase = await createClient();

  const { data: intervento, error } = await supabase
    .from("interventi")
    .select(
      "*, cliente:clients(id, nome, indirizzo), compilatore:profiles!interventi_compilato_da_fkey(id, nome)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <Avviso>
        Impossibile caricare il foglio. {messaggioErrore(error)}
      </Avviso>
    );
  }

  // Le policy RLS filtrano già i fogli non accessibili: qui non si distingue
  // tra "inesistente" e "non tuo", per non rivelare l'esistenza del record.
  if (!intervento) notFound();

  const { data: tuttiTecnici } = await supabase
    .from("profiles")
    .select("id, nome")
    .eq("ruolo", "tecnico")
    .eq("attivo", true)
    .order("nome");

  const { data: assegnati } = intervento.tecnici_ids.length
    ? await supabase
        .from("profiles")
        .select("id, nome")
        .in("id", intervento.tecnici_ids)
        .order("nome")
    : { data: [] };

  // Include anche gli interventi eliminati: i numeri non vengono mai
  // riassegnati, quindi il totale riflette "N. X di Y" del modulo cartaceo.
  const { count: numeroTotale } = await supabase
    .from("interventi")
    .select("id", { count: "exact", head: true })
    .eq("client_id", intervento.client_id)
    .eq("tipo", intervento.tipo);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={puoVedereTutto(profilo) ? "/archivio" : "/miei-fogli"}
        className="self-start text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        ← {puoVedereTutto(profilo) ? "Archivio" : "I miei fogli"}
      </Link>

      <Dettaglio
        intervento={intervento}
        tecnici={tuttiTecnici ?? []}
        tecniciAssegnati={assegnati ?? []}
        profilo={profilo}
        appenaCreato={creato === "1"}
        numeroTotale={numeroTotale ?? intervento.numero}
      />

      <p className="text-center text-xs text-slate-400">
        Commessa {codiceCommessa(intervento.tipo, intervento.numero)} ·
        intervento n. {intervento.numero} di {numeroTotale ?? intervento.numero}{" "}
        per questo cliente e tipo
      </p>
    </div>
  );
}
