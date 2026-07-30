import { AZIENDA } from "@/lib/dominio";

const ENDPOINT = "https://api.resend.com/emails";

/**
 * Mittente delle notifiche. Richiede che il dominio sia verificato su Resend;
 * finché non lo è, Resend accetta solo `onboarding@resend.dev` e consegna
 * unicamente all'indirizzo del titolare dell'account.
 */
function mittente() {
  return process.env.RESEND_FROM ?? `${AZIENDA.nome} <onboarding@resend.dev>`;
}

export type Allegato = { filename: string; content: Buffer };

type Esito = { inviata: boolean; errore?: string };

/**
 * Invia una email tramite Resend. Non solleva mai: le notifiche sono un di
 * più rispetto all'operazione che le ha generate (salvare un foglio,
 * assegnare un incarico), che non deve fallire se la posta non parte.
 */
export async function inviaEmail({
  a,
  oggetto,
  html,
  allegati,
}: {
  a: string;
  oggetto: string;
  html: string;
  allegati?: Allegato[];
}): Promise<Esito> {
  const chiave = process.env.RESEND_API_KEY;
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
        from: mittente(),
        to: [a],
        subject: oggetto,
        html,
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

/** Impaginazione comune: intestazione con il nome azienda e piè di pagina. */
export function corpoEmail(titolo: string, contenuto: string) {
  return `
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f1f5f9;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#086660;padding:16px 24px">
      <p style="margin:0;color:#ffffff;font-size:16px;font-weight:600">${AZIENDA.nome}</p>
      <p style="margin:2px 0 0;color:#a7f3d0;font-size:12px">Fogli di lavoro</p>
    </div>
    <div style="padding:24px">
      <h1 style="margin:0 0 12px;font-size:18px;color:#0f172a">${titolo}</h1>
      ${contenuto}
    </div>
  </div>
  <p style="max-width:560px;margin:16px auto 0;color:#94a3b8;font-size:11px;text-align:center">
    ${AZIENDA.nome} · ${AZIENDA.sito} — messaggio automatico, non rispondere a questa email.
  </p>
</div>`.trim();
}
