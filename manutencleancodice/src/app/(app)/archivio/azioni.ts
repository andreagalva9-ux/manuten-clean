"use server";

import { revalidatePath } from "next/cache";

import { richiediProfilo } from "@/lib/auth";
import { puoEliminare } from "@/lib/dominio";
import { messaggioErrore } from "@/lib/errori";
import { leggiFirma } from "@/lib/firme";
import { createClient } from "@/lib/supabase/server";

export type StatoArchivio = { errore?: string; successo?: string };

/**
 * Eliminazione sempre logica: il record resta a database perché il numero di
 * commessa già assegnato non deve mai tornare disponibile.
 */
export async function eliminaIntervento(
  _stato: StatoArchivio,
  formData: FormData,
): Promise<StatoArchivio> {
  const profilo = await richiediProfilo();
  const id = String(formData.get("id") ?? "");
  if (!id) return { errore: "Foglio non identificato." };

  const supabase = await createClient();

  const { data: intervento, error: erroreLettura } = await supabase
    .from("interventi")
    .select("compilato_da")
    .eq("id", id)
    .maybeSingle();

  if (erroreLettura) return { errore: messaggioErrore(erroreLettura) };
  if (!intervento) return { errore: "Foglio non trovato." };

  if (!puoEliminare(intervento, profilo)) {
    return {
      errore:
        "Solo l'ufficio o chi ha compilato il foglio può eliminarlo.",
    };
  }

  const { error } = await supabase
    .from("interventi")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { errore: messaggioErrore(error) };

  revalidatePath("/archivio");
  revalidatePath(`/archivio/${id}`);
  return { successo: "Foglio eliminato." };
}

export async function ripristinaIntervento(
  _stato: StatoArchivio,
  formData: FormData,
): Promise<StatoArchivio> {
  const profilo = await richiediProfilo();
  const id = String(formData.get("id") ?? "");
  if (!id) return { errore: "Foglio non identificato." };
  if (profilo.ruolo !== "ufficio") {
    return { errore: "Solo l'ufficio può ripristinare un foglio eliminato." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("interventi")
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) return { errore: messaggioErrore(error) };

  revalidatePath("/archivio");
  revalidatePath(`/archivio/${id}`);
  return { successo: "Foglio ripristinato." };
}

export async function aggiornaIntervento(
  _stato: StatoArchivio,
  formData: FormData,
): Promise<StatoArchivio> {
  await richiediProfilo();
  const id = String(formData.get("id") ?? "");
  if (!id) return { errore: "Foglio non identificato." };

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
  const tecniciIds = formData.getAll("tecnici_ids").map(String).filter(Boolean);
  const firmaTecnico = leggiFirma(formData.get("firma_tecnico_svg"));
  const firmaCliente = leggiFirma(formData.get("firma_cliente_svg"));

  if (!data) return { errore: "Indica la data dell'intervento." };
  if (!lavoroSvolto) return { errore: "Il lavoro svolto non può essere vuoto." };

  let ore: number | null = null;
  if (oreGrezze) {
    ore = Number(oreGrezze.replace(",", "."));
    if (!Number.isFinite(ore) || ore < 0) {
      return { errore: "Le ore devono essere un numero positivo." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("interventi")
    .update({
      data,
      ore,
      lavoro_svolto: lavoroSvolto,
      note,
      persona_contatto: personaContatto,
      materiali_installati: materialiInstallati,
      aree_intervento: areeIntervento,
      tecnici_ids: tecniciIds,
      firma_tecnico_svg: firmaTecnico,
      firma_cliente_svg: firmaCliente,
    })
    .eq("id", id);

  if (error) return { errore: messaggioErrore(error) };

  revalidatePath("/archivio");
  revalidatePath(`/archivio/${id}`);
  return { successo: "Modifiche salvate." };
}
