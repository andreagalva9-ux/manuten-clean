"use server";

import { revalidatePath } from "next/cache";

import { richiediPianificazione, richiediProfilo } from "@/lib/auth";
import { corpoEmail, inviaEmail } from "@/lib/email";
import { formattaData, isTipoCommessa } from "@/lib/dominio";
import { messaggioErrore } from "@/lib/errori";
import { createClient } from "@/lib/supabase/server";
import { urlBase } from "@/lib/url";

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
 * da mostrare all'ufficio solo quando la notifica NON è partita: l'incarico
 * è comunque salvato, va solo avvisato a voce.
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

  const base = urlBase();
  const contenuto = `
    <p style="margin:0 0 16px;font-size:14px;color:#334155">
      Ciao ${tecnico.nome.split(" ")[0]}, ti è stato assegnato un nuovo intervento.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#0f172a">
      <tr><td style="padding:6px 0;color:#64748b;width:120px">Cliente</td><td style="padding:6px 0;font-weight:600">${cliente?.nome ?? "—"}</td></tr>
      ${cliente?.indirizzo ? `<tr><td style="padding:6px 0;color:#64748b">Indirizzo</td><td style="padding:6px 0">${cliente.indirizzo}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#64748b">Lavorazione</td><td style="padding:6px 0">${tipo}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Da fare entro</td><td style="padding:6px 0;font-weight:600">${formattaData(scadenza)}</td></tr>
      ${note ? `<tr><td style="padding:6px 0;color:#64748b">Note</td><td style="padding:6px 0">${note}</td></tr>` : ""}
    </table>
    ${
      base
        ? `<p style="margin:24px 0 0"><a href="${base}/incarichi" style="display:inline-block;background:#086660;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600">Apri i tuoi incarichi</a></p>`
        : ""
    }`;

  const esito = await inviaEmail({
    a: tecnico.email,
    oggetto: `Nuovo incarico: ${cliente?.nome ?? "cliente"} · ${tipo}`,
    html: corpoEmail("Nuovo incarico assegnato", contenuto),
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
  revalidatePath("/panoramica");
  return { successo: completato ? "Segnato come fatto." : "Riaperto." };
}
