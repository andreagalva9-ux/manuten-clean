import { GestioneClienti } from "@/app/(app)/clienti/gestione-clienti";
import { Avviso } from "@/components/ui";
import { richiediVisibilitaCompleta } from "@/lib/auth";
import { isUfficio } from "@/lib/dominio";
import { messaggioErrore } from "@/lib/errori";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Clienti · Manuten & Clean" };

export default async function PaginaClienti() {
  const profilo = await richiediVisibilitaCompleta();
  const supabase = await createClient();

  const [{ data: clienti, error }, { data: interventi, error: erroreConteggi }] =
    await Promise.all([
      supabase.from("clients").select("*").order("nome"),
      supabase.from("interventi").select("client_id").is("deleted_at", null),
    ]);

  if (error) {
    return (
      <Avviso>
        Impossibile caricare l&apos;anagrafica clienti. {messaggioErrore(error)}
      </Avviso>
    );
  }

  const conteggi = new Map<string, number>();
  for (const riga of interventi ?? []) {
    conteggi.set(riga.client_id, (conteggi.get(riga.client_id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      {erroreConteggi && (
        <Avviso tipo="info">
          Elenco caricato, ma il conteggio dei fogli non è disponibile.
        </Avviso>
      )}
      <GestioneClienti
        clienti={(clienti ?? []).map((c) => ({
          ...c,
          interventi: conteggi.get(c.id) ?? 0,
        }))}
        soloLettura={!isUfficio(profilo)}
      />
    </div>
  );
}
