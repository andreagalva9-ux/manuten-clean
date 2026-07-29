import Link from "next/link";
import { redirect } from "next/navigation";

import { FormIntervento } from "@/app/(app)/nuovo/form-intervento";
import { Avviso, StatoVuoto } from "@/components/ui";
import { richiediProfilo } from "@/lib/auth";
import { isSupervisore } from "@/lib/dominio";
import { messaggioErrore } from "@/lib/errori";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Nuovo foglio · Manuten & Clean" };

export default async function PaginaNuovo({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string; tipo?: string }>;
}) {
  const profilo = await richiediProfilo();
  // Chi è in sola supervisione non compila fogli, solo consultazione.
  if (isSupervisore(profilo)) redirect("/archivio");
  const { client_id: clientIdIniziale, tipo: tipoIniziale } = await searchParams;
  const supabase = await createClient();

  const [
    { data: clienti, error: erroreClienti },
    { data: tecnici, error: erroreTecnici },
    { data: assegnazioni },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, nome, indirizzo")
      .is("deleted_at", null)
      .order("nome"),
    supabase
      .from("profiles")
      .select("id, nome")
      .eq("ruolo", "tecnico")
      .eq("attivo", true)
      .order("nome"),
    supabase.from("assegnazioni").select("client_id, tecnico_id, tipo"),
  ]);

  if (erroreClienti) {
    return (
      <Avviso>
        Impossibile caricare l&apos;elenco clienti. {messaggioErrore(erroreClienti)}
      </Avviso>
    );
  }

  if (!clienti || clienti.length === 0) {
    return (
      <StatoVuoto
        titolo="Nessun cliente disponibile"
        descrizione={
          profilo.ruolo === "ufficio"
            ? "Aggiungi almeno un cliente in anagrafica per poter compilare un foglio di lavoro."
            : "L'ufficio deve inserire i clienti in anagrafica prima che tu possa compilare un foglio."
        }
        azione={
          profilo.ruolo === "ufficio" ? (
            <Link
              href="/clienti"
              className="font-semibold text-brand-700 underline underline-offset-2"
            >
              Vai ai clienti
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {erroreTecnici && (
        <Avviso tipo="info">
          Elenco tecnici non disponibile: potrai assegnarli modificando il foglio
          più tardi.
        </Avviso>
      )}
      <FormIntervento
        clienti={clienti}
        tecnici={tecnici ?? []}
        assegnazioni={assegnazioni ?? []}
        profilo={profilo}
        clientIdIniziale={clientIdIniziale}
        tipoIniziale={tipoIniziale}
      />
    </div>
  );
}
