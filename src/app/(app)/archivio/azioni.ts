"use server";

import { revalidatePath } from "next/cache";

import { richiediProfilo } from "@/lib/auth";
import { puoEliminare, puoModificare } from "@/lib/dominio";
import { inviaEmail } from "@/lib/email/invio";
import { templateFoglioCliente } from "@/lib/email/template";
import { messaggioErrore } from "@/lib/errori";
import { leggiFirma } from "@/lib/firme";
import { generaPdfFoglio } from "@/lib/pdf/genera";
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
  const profilo = await richiediProfilo();
  const id = String(formData.get("id") ?? "");
  if (!id) return { errore: "Foglio non identificato." };

  const supabaseLettura = await createClient();
  const { data: esistente, error: erroreLettura } = await supabaseLettura
    .from("interventi")
    .select("compilato_da, tecnici_ids, finalizzato_at")
    .eq("id", id)
    .maybeSingle();

  if (erroreLettura) return { errore: messaggioErrore(erroreLettura) };
  if (!esistente) return { errore: "Foglio non trovato." };
  if (!puoModificare(esistente, profilo)) {
    return {
      errore: esistente.finalizzato_at
        ? "Questo foglio è stato inviato definitivamente e non è più modificabile da nessuno. Se contiene un errore, annullalo e compilane uno nuovo."
        : "Non hai i permessi per modificare questo foglio.",
    };
  }

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

/**
 * Invio definitivo: da qui in poi solo l'ufficio può ancora modificare il
 * foglio. Azione volutamente a senso unico per il tecnico (non può
 * "sbloccarsi" da solo).
 */
export async function finalizzaIntervento(
  _stato: StatoArchivio,
  formData: FormData,
): Promise<StatoArchivio> {
  const profilo = await richiediProfilo();
  const id = String(formData.get("id") ?? "");
  if (!id) return { errore: "Foglio non identificato." };

  const supabase = await createClient();
  const { data: esistente, error: erroreLettura } = await supabase
    .from("interventi")
    .select("compilato_da, tecnici_ids, finalizzato_at")
    .eq("id", id)
    .maybeSingle();

  if (erroreLettura) return { errore: messaggioErrore(erroreLettura) };
  if (!esistente) return { errore: "Foglio non trovato." };
  if (esistente.finalizzato_at) {
    return { errore: "Questo foglio è già stato inviato definitivamente." };
  }
  if (!puoModificare(esistente, profilo)) {
    return { errore: "Non hai i permessi per inviare questo foglio." };
  }

  const { error } = await supabase
    .from("interventi")
    .update({ finalizzato_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { errore: messaggioErrore(error) };

  const esitoInvio = await inviaFoglioAlCliente(id);

  revalidatePath("/archivio");
  revalidatePath(`/archivio/${id}`);
  // Un trigger sul database chiude da solo l'eventuale incarico pianificato
  // corrispondente: la sua lista e la dashboard vanno rilette.
  revalidatePath("/incarichi");
  revalidatePath("/panoramica");
  return {
    successo: `Foglio inviato definitivamente: non è più modificabile. ${esitoInvio}`,
  };
}

/**
 * Recapita al cliente il PDF del foglio firmato. Restituisce sempre una frase
 * da accodare al messaggio di conferma: l'invio della copia è un servizio in
 * più e non deve far sembrare fallita la finalizzazione se la posta non parte
 * o se il cliente non ha un indirizzo in anagrafica.
 */
async function inviaFoglioAlCliente(id: string): Promise<string> {
  try {
    const pdf = await generaPdfFoglio(id);
    if (!pdf) return "Copia al cliente non inviata: foglio non rileggibile.";

    const supabase = await createClient();
    const { data: intervento } = await supabase
      .from("interventi")
      .select("client_id")
      .eq("id", id)
      .maybeSingle();

    const { data: cliente } = intervento
      ? await supabase
          .from("clients")
          .select("nome, email")
          .eq("id", intervento.client_id)
          .maybeSingle()
      : { data: null };

    if (!cliente?.email) {
      return "Nessuna email in anagrafica per questo cliente: la copia non è stata inviata.";
    }

    const esito = await inviaEmail({
      a: cliente.email,
      messaggio: templateFoglioCliente({
        cliente: cliente.nome,
        codice: pdf.codice,
        tipo: pdf.tipo,
        data: pdf.data,
        ore: pdf.ore,
        tecnici: pdf.tecnici,
      }),
      allegati: [{ filename: pdf.nomeFile, content: pdf.buffer }],
    });

    return esito.inviata
      ? `Copia inviata a ${cliente.email}.`
      : `Copia al cliente non inviata (${esito.errore}).`;
  } catch (errore) {
    return `Copia al cliente non inviata (${
      errore instanceof Error ? errore.message : "errore imprevisto"
    }).`;
  }
}

/*
 * Non esiste una riapertura: l'invio definitivo è definitivo per tutti,
 * ufficio compreso. Un foglio sbagliato si annulla con eliminaIntervento e
 * se ne compila uno nuovo.
 */
