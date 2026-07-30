"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { richiediProfilo } from "@/lib/auth";
import { isTipoCommessa } from "@/lib/dominio";
import { messaggioErrore } from "@/lib/errori";
import { leggiFirma } from "@/lib/firme";
import { createClient } from "@/lib/supabase/server";

export type StatoIntervento = { errore?: string };

const TENTATIVI_MAX = 3;

export async function creaIntervento(
  _stato: StatoIntervento,
  formData: FormData,
): Promise<StatoIntervento> {
  const profilo = await richiediProfilo();

  const clientId = String(formData.get("client_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const data = String(formData.get("data") ?? "");
  const oreGrezze = String(formData.get("ore") ?? "").trim();
  const lavoroSvolto = String(formData.get("lavoro_svolto") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  const personaContatto =
    String(formData.get("persona_contatto") ?? "").trim() || null;
  const materialiInstallati =
    String(formData.get("materiali_installati") ?? "").trim() || null;
  const areeIntervento =
    String(formData.get("aree_intervento") ?? "").trim() || null;
  const tecniciIds = formData
    .getAll("tecnici_ids")
    .map(String)
    .filter(Boolean);
  const firmaTecnico = leggiFirma(formData.get("firma_tecnico_svg"));
  const firmaCliente = leggiFirma(formData.get("firma_cliente_svg"));

  if (!clientId) return { errore: "Seleziona il cliente." };
  if (!isTipoCommessa(tipo)) return { errore: "Seleziona il tipo di commessa." };
  if (!data) return { errore: "Indica la data dell'intervento." };
  if (!lavoroSvolto) {
    return { errore: "Descrivi il lavoro svolto: è il cuore del foglio." };
  }

  let ore: number | null = null;
  if (oreGrezze) {
    ore = Number(oreGrezze.replace(",", "."));
    if (!Number.isFinite(ore) || ore < 0) {
      return { errore: "Le ore devono essere un numero positivo." };
    }
  }

  const supabase = await createClient();

  // Il numero non viene mai inviato dal client: lo assegna il trigger sul
  // database dentro la stessa transazione dell'INSERT. Il retry copre il caso
  // limite in cui un contatore disallineato produca una collisione sull'unique.
  let ultimoErrore: unknown = null;
  let idCreato: string | null = null;

  for (let tentativo = 0; tentativo < TENTATIVI_MAX; tentativo++) {
    const { data: creato, error } = await supabase
      .from("interventi")
      .insert({
        client_id: clientId,
        tipo,
        data,
        ore,
        lavoro_svolto: lavoroSvolto,
        note,
        persona_contatto: personaContatto,
        materiali_installati: materialiInstallati,
        aree_intervento: areeIntervento,
        tecnici_ids: tecniciIds,
        compilato_da: profilo.id,
        firma_tecnico_svg: firmaTecnico,
        firma_cliente_svg: firmaCliente,
      })
      .select("id")
      .single();

    if (!error) {
      idCreato = creato.id;
      break;
    }

    ultimoErrore = error;
    if (error.code !== "23505") break;
  }

  if (!idCreato) {
    return { errore: messaggioErrore(ultimoErrore as Error) };
  }

  revalidatePath("/archivio");
  revalidatePath("/clienti");
  revalidatePath("/panoramica");
  redirect(`/archivio/${idCreato}?creato=1`);
}
