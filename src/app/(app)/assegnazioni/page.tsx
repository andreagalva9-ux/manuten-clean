import { GestioneAssegnazioni } from "@/app/(app)/assegnazioni/gestione-assegnazioni";
import { Avviso, StatoVuoto } from "@/components/ui";
import { richiediUfficio } from "@/lib/auth";
import { messaggioErrore } from "@/lib/errori";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Assegnazioni · Manuten & Clean" };

export default async function PaginaAssegnazioni() {
  await richiediUfficio();
  const supabase = await createClient();

  const [
    { data: clienti, error: erroreClienti },
    { data: tecnici, error: erroreTecnici },
    { data: assegnazioni, error: erroreAssegnazioni },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, nome")
      .is("deleted_at", null)
      .order("nome"),
    supabase
      .from("profiles")
      .select("id, nome")
      .eq("ruolo", "tecnico")
      .eq("attivo", true)
      .order("nome"),
    supabase
      .from("assegnazioni")
      .select("id, client_id, tecnico_id, tipo")
      .order("created_at"),
  ]);

  if (erroreClienti || erroreTecnici || erroreAssegnazioni) {
    return (
      <Avviso>
        Impossibile caricare le assegnazioni.{" "}
        {messaggioErrore(erroreClienti ?? erroreTecnici ?? erroreAssegnazioni)}
      </Avviso>
    );
  }

  if (!clienti || clienti.length === 0) {
    return (
      <StatoVuoto
        titolo="Nessun cliente in anagrafica"
        descrizione="Aggiungi almeno un cliente prima di poter assegnare i tecnici."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Assegnazioni</h1>
        <p className="text-sm text-slate-500">
          Indica quali tecnici seguono abitualmente ogni cliente (in generale o
          per un singolo tipo di commessa). Serve solo a precompilare il form
          &quot;Nuovo foglio&quot;: resta sempre possibile scegliere tecnici
          diversi al momento della compilazione.
        </p>
      </div>

      {tecnici && tecnici.length === 0 && (
        <Avviso tipo="info">
          Nessun tecnico attivo in anagrafica: aggiungine almeno uno dalla
          pagina Tecnici prima di creare assegnazioni.
        </Avviso>
      )}

      <GestioneAssegnazioni
        clienti={clienti}
        tecnici={tecnici ?? []}
        assegnazioni={assegnazioni ?? []}
      />
    </div>
  );
}
