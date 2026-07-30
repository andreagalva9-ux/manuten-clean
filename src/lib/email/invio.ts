import { AZIENDA } from "@/lib/dominio";
import { createAdminClient } from "@/lib/supabase/server";

const ENDPOINT = "https://api.resend.com/emails";

/** Evita di interrogare il database a ogni email inviata. */
const cacheImpostazioni = new Map<string, string | null>();

/**
 * Le impostazioni di invio stanno nelle variabili d'ambiente; in mancanza si
 * leggono dalla tabella riservata `impostazioni` su Supabase, raggiungibile
 * solo con la chiave service_role. Serve a poter configurare le notifiche
 * senza accesso al pannello di hosting.
 */
export async function impostazione(nome: string): Promise<string | null> {
  const daAmbiente = process.env[nome];
  if (daAmbiente) return daAmbiente;

  if (cacheImpostazioni.has(nome)) return cacheImpostazioni.get(nome) ?? null;

  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("impostazioni")
    .select("valore")
    .eq("chiave", nome)
    .maybeSingle();

  const valore = data?.valore ?? null;
  cacheImpostazioni.set(nome, valore);
  return valore;
}

export type Allegato = { filename: string; content: Buffer };

export type Messaggio = {
  oggetto: string;
  html: string;
  /** Versione solo testo: migliora la recapitabilità e copre i client che non mostrano HTML. */
  testo: string;
};

type Esito = { inviata: boolean; errore?: string };

/**
 * Invia una email tramite Resend. Non solleva mai: le notifiche sono un di
 * più rispetto all'operazione che le ha generate (salvare un foglio,
 * assegnare un incarico), che non deve fallire se la posta non parte.
 */
export async function inviaEmail({
  a,
  messaggio,
  allegati,
}: {
  a: string;
  messaggio: Messaggio;
  allegati?: Allegato[];
}): Promise<Esito> {
  const chiave = await impostazione("RESEND_API_KEY");
  if (!chiave) {
    return { inviata: false, errore: "RESEND_API_KEY non configurata." };
  }

  try {
    const risposta = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chiave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: await mittente(),
        to: [a],
        subject: messaggio.oggetto,
        html: messaggio.html,
        text: messaggio.testo,
        ...(allegati?.length
          ? {
              attachments: allegati.map((allegato) => ({
                filename: allegato.filename,
                content: allegato.content.toString("base64"),
              })),
            }
          : {}),
      }),
    });

    if (!risposta.ok) {
      const dettaglio = await risposta.text();
      return {
        inviata: false,
        errore: `Resend ha risposto ${risposta.status}: ${dettaglio.slice(0, 200)}`,
      };
    }

    return { inviata: true };
  } catch (errore) {
    return {
      inviata: false,
      errore: errore instanceof Error ? errore.message : "Invio non riuscito.",
    };
  }
}

/**
 * Mittente delle notifiche. Richiede che il dominio sia verificato su Resend;
 * finché non lo è, Resend accetta solo `onboarding@resend.dev` e consegna
 * unicamente all'indirizzo del titolare dell'account.
 */
async function mittente() {
  return (
    (await impostazione("RESEND_FROM")) ??
    `${AZIENDA.nome} <onboarding@resend.dev>`
  );
}
