"use server";

import { revalidatePath } from "next/cache";

import { richiediPianificazione, richiediProfilo } from "@/lib/auth";
import { isTipoCommessa, oggiISO } from "@/lib/dominio";
import { inviaEmail } from "@/lib/email/invio";
import { templateNuovoIncarico } from "@/lib/email/template";
import { messaggioErrore } from "@/lib/errori";
import { createClient } from "@/lib/supabase/server";

export type StatoIncarico = { errore?: string; successo?: string };

/** Solo il pianificatore: cliente + tecnico + tipo di lavorazione + scadenza. */
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

  const avviso = await avvisaTecnico({
    tecnicoId,
    clientId,
    tipo,
    scadenza,
    note,
  });

  revalidatePath("/incarichi");
  revalidatePath("/panoramica");
  return {
    successo: avviso
      ? `Incarico assegnato. ${avviso}`
      : "Incarico assegnato: il tecnico ha ricevuto la notifica via email.",
  };
}

/**
 * Avvisa via email il tecnico del nuovo incarico. Restituisce un messaggio
 * da mostrare al pianificatore solo quando la notifica NON è partita:
 * l'incarico è comunque salvato, va solo avvisato a voce.
 */
async function avvisaTecnico({
  tecnicoId,
  clientId,
  tipo,
  scadenza,
  note,
}: {
  tecnicoId: string;
  clientId: string;
  tipo: string;
  scadenza: string;
  note: string | null;
}): Promise<string | null> {
  const supabase = await createClient();

  const [{ data: tecnico }, { data: cliente }] = await Promise.all([
    supabase.from("profiles").select("nome, email").eq("id", tecnicoId).maybeSingle(),
    supabase.from("clients").select("nome, indirizzo").eq("id", clientId).maybeSingle(),
  ]);

  if (!tecnico?.email) {
    return "Nessuna email in anagrafica per questo tecnico: avvisalo tu.";
  }

  const esito = await inviaEmail({
    a: tecnico.email,
    messaggio: templateNuovoIncarico({
      tecnico: tecnico.nome,
      cliente: cliente?.nome ?? "Cliente",
      indirizzo: cliente?.indirizzo ?? null,
      tipo,
      scadenza,
      note,
      inRitardo: scadenza < oggiISO(),
    }),
  });

  return esito.inviata
    ? null
    : `Notifica email non inviata (${esito.errore}): avvisa il tecnico a voce.`;
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
  revalidatePath("/panoramica");
  return { successo: "Incarico eliminato." };
}

/**
 * Il tecnico spunta come fatto un proprio incarico che non prevede foglio
 * di lavoro. Quando il foglio c'è, non serve: un trigger sul database
 * chiude l'incarico da solo nel momento dell'invio definitivo.
 *
 * Il percorso inverso non esiste per nessuno: un incarico completato non si
 * riapre. Se era sbagliato, il pianificatore lo elimina e ne crea uno nuovo.
 */
export async function segnaIncarico(
  _stato: StatoIncarico,
  formData: FormData,
): Promise<StatoIncarico> {
  const profilo = await richiediProfilo();
  const id = String(formData.get("id") ?? "");
  if (!id) return { errore: "Incarico non identificato." };

  if (profilo.ruolo !== "tecnico") {
    return {
      errore: "Solo il tecnico assegnato può segnare un incarico come fatto.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("incarichi")
    .update({ completato_at: new Date().toISOString() })
    .eq("id", id)
    // Se qualcuno lo ha già chiuso nel frattempo, non lo si ridata per fatto
    // con una data diversa: la chiusura vale una volta sola.
    .is("completato_at", null);

  if (error) return { errore: messaggioErrore(error) };

  revalidatePath("/incarichi");
  revalidatePath("/panoramica");
  return { successo: "Segnato come fatto." };
}
