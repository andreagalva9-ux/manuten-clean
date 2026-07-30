"use server";

import { revalidatePath } from "next/cache";

import { richiediPianificazione, richiediProfilo } from "@/lib/auth";
import { isTipoCommessa } from "@/lib/dominio";
import { messaggioErrore } from "@/lib/errori";
import { createClient } from "@/lib/supabase/server";

export type StatoIncarico = { errore?: string; successo?: string };

/** Ufficio o pianificatore: cliente + tecnico + tipo di lavorazione + scadenza. */
export async function creaIncarico(
  _stato: StatoIncarico,
  formData: FormData,
): Promise<StatoIncarico> {
  const pianificatore = await richiediPianificazione();

  const clientId = String(formData.get("client_id") ?? "");
  const tecnicoId = String(formData.get("tecnico_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const scadenza = String(formData.get("scadenza") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!clientId || !tecnicoId) {
    return { errore: "Seleziona cliente e tecnico." };
  }
  if (!isTipoCommessa(tipo)) {
    return { errore: "Tipo di commessa non valido." };
  }
  if (!scadenza) {
    return { errore: "Indica la scadenza." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("incarichi").insert({
    client_id: clientId,
    tecnico_id: tecnicoId,
    tipo,
    scadenza,
    note,
    creato_da: pianificatore.id,
  });

  if (error) return { errore: messaggioErrore(error) };

  revalidatePath("/incarichi");
  return { successo: "Incarico assegnato." };
}

export async function eliminaIncarico(
  _stato: StatoIncarico,
  formData: FormData,
): Promise<StatoIncarico> {
  await richiediPianificazione();
  const id = String(formData.get("id") ?? "");
  if (!id) return { errore: "Incarico non identificato." };

  const supabase = await createClient();
  const { error } = await supabase.from("incarichi").delete().eq("id", id);

  if (error) return { errore: messaggioErrore(error) };

  revalidatePath("/incarichi");
  return { successo: "Incarico eliminato." };
}

/**
 * Il tecnico spunta il proprio incarico come fatto (o lo riapre): l'RLS e il
 * trigger sul database impediscono comunque di toccare cliente, tecnico,
 * tipo o scadenza se non si è ufficio.
 */
export async function segnaIncarico(
  _stato: StatoIncarico,
  formData: FormData,
): Promise<StatoIncarico> {
  await richiediProfilo();
  const id = String(formData.get("id") ?? "");
  const completato = String(formData.get("completato") ?? "") === "true";
  if (!id) return { errore: "Incarico non identificato." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("incarichi")
    .update({ completato_at: completato ? new Date().toISOString() : null })
    .eq("id", id);

  if (error) return { errore: messaggioErrore(error) };

  revalidatePath("/incarichi");
  return { successo: completato ? "Segnato come fatto." : "Riaperto." };
}
