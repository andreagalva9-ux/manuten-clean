"use server";

import { revalidatePath } from "next/cache";

import { richiediUfficio } from "@/lib/auth";
import { messaggioErrore } from "@/lib/errori";
import { createClient } from "@/lib/supabase/server";

export type StatoCliente = { errore?: string; successo?: string };

function leggiCampi(formData: FormData) {
  return {
    nome: String(formData.get("nome") ?? "").trim(),
    indirizzo: String(formData.get("indirizzo") ?? "").trim() || null,
    citta: String(formData.get("citta") ?? "").trim() || null,
    cap: String(formData.get("cap") ?? "").trim() || null,
    provincia: String(formData.get("provincia") ?? "").trim() || null,
    piva: String(formData.get("piva") ?? "").trim() || null,
    telefono: String(formData.get("telefono") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    note: String(formData.get("note") ?? "").trim() || null,
  };
}

export async function creaCliente(
  _stato: StatoCliente,
  formData: FormData,
): Promise<StatoCliente> {
  await richiediUfficio();
  const campi = leggiCampi(formData);

  if (!campi.nome) return { errore: "Il nome del cliente è obbligatorio." };

  const supabase = await createClient();
  const { error } = await supabase.from("clients").insert(campi);

  if (error) return { errore: messaggioErrore(error) };

  revalidatePath("/clienti");
  revalidatePath("/nuovo");
  return { successo: `Cliente “${campi.nome}” aggiunto.` };
}

export async function aggiornaCliente(
  _stato: StatoCliente,
  formData: FormData,
): Promise<StatoCliente> {
  await richiediUfficio();
  const id = String(formData.get("id") ?? "");
  const campi = leggiCampi(formData);

  if (!id) return { errore: "Cliente non identificato." };
  if (!campi.nome) return { errore: "Il nome del cliente è obbligatorio." };

  const supabase = await createClient();
  const { error } = await supabase.from("clients").update(campi).eq("id", id);

  if (error) return { errore: messaggioErrore(error) };

  revalidatePath("/clienti");
  revalidatePath("/nuovo");
  revalidatePath("/archivio");
  return { successo: "Modifiche salvate." };
}

/**
 * Archiviazione logica: i fogli di lavoro già emessi devono restare leggibili
 * e la numerazione progressiva del cliente non va mai persa.
 */
export async function archiviaCliente(
  _stato: StatoCliente,
  formData: FormData,
): Promise<StatoCliente> {
  await richiediUfficio();
  const id = String(formData.get("id") ?? "");
  if (!id) return { errore: "Cliente non identificato." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { errore: messaggioErrore(error) };

  revalidatePath("/clienti");
  revalidatePath("/nuovo");
  return { successo: "Cliente archiviato." };
}

export async function ripristinaCliente(
  _stato: StatoCliente,
  formData: FormData,
): Promise<StatoCliente> {
  await richiediUfficio();
  const id = String(formData.get("id") ?? "");
  if (!id) return { errore: "Cliente non identificato." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) return { errore: messaggioErrore(error) };

  revalidatePath("/clienti");
  revalidatePath("/nuovo");
  return { successo: "Cliente ripristinato." };
}
