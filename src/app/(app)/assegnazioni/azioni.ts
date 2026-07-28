"use server";

import { revalidatePath } from "next/cache";

import { richiediUfficio } from "@/lib/auth";
import { isTipoCommessa } from "@/lib/dominio";
import { messaggioErrore } from "@/lib/errori";
import { createClient } from "@/lib/supabase/server";

export type StatoAssegnazione = { errore?: string; successo?: string };

/**
 * Assegnazione non vincolante: preseleziona il tecnico nel form "Nuovo
 * foglio" per quel cliente (ed eventualmente quel solo tipo di commessa),
 * ma non limita in alcun modo chi può compilare o vedere i fogli.
 */
export async function creaAssegnazione(
  _stato: StatoAssegnazione,
  formData: FormData,
): Promise<StatoAssegnazione> {
  await richiediUfficio();

  const clientId = String(formData.get("client_id") ?? "");
  const tecnicoId = String(formData.get("tecnico_id") ?? "");
  const tipoGrezzo = String(formData.get("tipo") ?? "").trim();
  const tipo = tipoGrezzo ? tipoGrezzo : null;

  if (!clientId || !tecnicoId) {
    return { errore: "Seleziona cliente e tecnico." };
  }
  if (tipo !== null && !isTipoCommessa(tipo)) {
    return { errore: "Tipo di commessa non valido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("assegnazioni")
    .insert({ client_id: clientId, tecnico_id: tecnicoId, tipo });

  if (error) {
    if (error.code === "23505") {
      return { errore: "Questo tecnico è già assegnato a questo cliente/tipo." };
    }
    return { errore: messaggioErrore(error) };
  }

  revalidatePath("/assegnazioni");
  revalidatePath("/nuovo");
  return { successo: "Assegnazione salvata." };
}

export async function eliminaAssegnazione(
  _stato: StatoAssegnazione,
  formData: FormData,
): Promise<StatoAssegnazione> {
  await richiediUfficio();
  const id = String(formData.get("id") ?? "");
  if (!id) return { errore: "Assegnazione non identificata." };

  const supabase = await createClient();
  const { error } = await supabase.from("assegnazioni").delete().eq("id", id);

  if (error) return { errore: messaggioErrore(error) };

  revalidatePath("/assegnazioni");
  revalidatePath("/nuovo");
  return { successo: "Assegnazione rimossa." };
}
