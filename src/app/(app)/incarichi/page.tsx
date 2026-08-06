import { GestioneIncarichi } from "@/app/(app)/incarichi/gestione-incarichi";
import { Avviso } from "@/components/ui";
import { richiediVisibilitaIncarichi } from "@/lib/auth";
import {
  isSupervisore,
  puoPianificare,
  puoVedereTuttiGliIncarichi,
} from "@/lib/dominio";
import { messaggioErrore } from "@/lib/errori";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Incarichi · Manuten & Clean" };

export default async function PaginaIncarichi() {
  const profilo = await richiediVisibilitaIncarichi();
  const supabase = await createClient();
  const vedeTutto = puoVedereTuttiGliIncarichi(profilo);

  let query = supabase
    .from("incarichi")
    .select(
      "*, cliente:clients(id, nome), tecnico:profiles!incarichi_tecnico_id_fkey(id, nome)",
    )
    .order("scadenza");

  if (!vedeTutto) {
    query = query.eq("tecnico_id", profilo.id);
  }

  const { data: incarichi, error } = await query;

  if (error) {
    return (
      <Avviso>
        Impossibile caricare gli incarichi. {messaggioErrore(error)}
      </Avviso>
    );
  }

  let clienti: { id: string; nome: string }[] = [];
  let tecnici: { id: string; nome: string }[] = [];

  if (vedeTutto) {
    const [{ data: datiClienti }, { data: datiTecnici }] = await Promise.all([
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
    ]);
    clienti = datiClienti ?? [];
    tecnici = datiTecnici ?? [];
  }

  return (
    <GestioneIncarichi
      incarichi={incarichi ?? []}
      clienti={clienti}
      tecnici={tecnici}
      puoGestire={puoPianificare(profilo)}
      puoSegnare={!isSupervisore(profilo)}
    />
  );
}
