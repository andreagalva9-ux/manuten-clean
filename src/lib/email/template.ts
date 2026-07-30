import { AZIENDA, formattaData, formattaOre } from "@/lib/dominio";
import type { Messaggio } from "@/lib/email/invio";
import { urlBase } from "@/lib/url";

/*
 * Template delle email transazionali.
 *
 * Impaginazione a tabelle con stili inline: è l'unico approccio che regge su
 * tutti i client di posta (Outlook incluso), dove flexbox, grid e i fogli di
 * stile esterni non sono affidabili. Ogni template restituisce sia la
 * versione HTML sia quella testuale.
 */

const COLORE = {
  brand: "#086660",
  brandChiaro: "#a7f3d0",
  testo: "#0f172a",
  testoTenue: "#64748b",
  bordo: "#e2e8f0",
  sfondo: "#f1f5f9",
  allarme: "#b91c1c",
  allarmeSfondo: "#fef2f2",
};

/**
 * Neutralizza i caratteri speciali nei dati inseriti dagli utenti (nomi
 * clienti, note): senza questo passaggio una virgoletta o un `<` romperebbe
 * l'impaginazione dell'email.
 */
export function esc(valore: string | null | undefined): string {
  if (!valore) return "";
  return valore
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Manda a capo il testo libero preservando le righe inserite dall'utente. */
function multiriga(valore: string) {
  return esc(valore).replace(/\n/g, "<br />");
}

type Riga = { etichetta: string; valore: string | null; forte?: boolean };

/** Tabella etichetta/valore usata per i riepiloghi. Salta le righe vuote. */
function tabellaDettagli(righe: Riga[]) {
  const celle = righe
    .filter((r) => r.valore)
    .map(
      (r) => `
      <tr>
        <td style="padding:8px 0;color:${COLORE.testoTenue};font-size:14px;vertical-align:top;width:140px">${esc(r.etichetta)}</td>
        <td style="padding:8px 0;color:${COLORE.testo};font-size:14px;${r.forte ? "font-weight:600;" : ""}">${multiriga(r.valore!)}</td>
      </tr>`,
    )
    .join("");

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin:8px 0 0">${celle}</table>`;
}

/** Pulsante "a prova di client": tabella con sfondo, non un <a> stilizzato. */
function pulsante(testo: string, href: string) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0">
    <tr>
      <td style="background:${COLORE.brand};border-radius:8px">
        <a href="${href}" style="display:inline-block;padding:13px 24px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">${esc(testo)}</a>
      </td>
    </tr>
  </table>`;
}

function riquadroEvidenza(testo: string) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0 0;border-collapse:separate">
    <tr>
      <td style="background:${COLORE.allarmeSfondo};border-left:3px solid ${COLORE.allarme};padding:12px 16px;border-radius:0 6px 6px 0">
        <p style="margin:0;font-size:13px;color:${COLORE.allarme};font-weight:600">${esc(testo)}</p>
      </td>
    </tr>
  </table>`;
}

/**
 * Struttura comune: intestazione con logo, corpo, firma aziendale.
 * `anteprima` è il testo che i client mostrano in lista accanto all'oggetto.
 */
function impagina({
  titolo,
  anteprima,
  corpo,
}: {
  titolo: string;
  anteprima: string;
  corpo: string;
}) {
  const base = urlBase();
  const logo = base ? `${base}/icon-192.png` : null;

  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${esc(titolo)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORE.sfondo}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(anteprima)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${COLORE.sfondo};padding:24px 12px">
  <tr>
    <td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border:1px solid ${COLORE.bordo};border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
        <tr>
          <td style="background:${COLORE.brand};padding:20px 24px">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${
                  logo
                    ? `<td style="padding-right:12px" valign="middle"><img src="${logo}" width="36" height="36" alt="" style="display:block;border-radius:6px" /></td>`
                    : ""
                }
                <td valign="middle">
                  <p style="margin:0;color:#ffffff;font-size:16px;font-weight:600">${esc(AZIENDA.nome)}</p>
                  <p style="margin:2px 0 0;color:${COLORE.brandChiaro};font-size:12px">Fogli di lavoro</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px">
            <h1 style="margin:0 0 4px;font-size:19px;line-height:1.3;color:${COLORE.testo}">${esc(titolo)}</h1>
            ${corpo}
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid ${COLORE.bordo};padding:18px 24px;background:#fbfcfd">
            <p style="margin:0;font-size:12px;line-height:1.6;color:${COLORE.testoTenue}">
              <strong style="color:${COLORE.testo}">${esc(AZIENDA.nome)}</strong><br />
              ${esc(AZIENDA.indirizzo)}<br />
              Tel. ${esc(AZIENDA.telefono)} · ${esc(AZIENDA.email)}<br />
              P.IVA ${esc(AZIENDA.piva)}
            </p>
          </td>
        </tr>
      </table>
      <p style="max-width:560px;margin:16px auto 0;color:#94a3b8;font-size:11px;line-height:1.5;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
        Messaggio automatico inviato da ${esc(AZIENDA.sito)} — si prega di non rispondere a questo indirizzo.
      </p>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Piè di pagina della versione testuale, coerente con quello HTML. */
function firmaTesto() {
  return [
    "",
    "—",
    AZIENDA.nome,
    AZIENDA.indirizzo,
    `Tel. ${AZIENDA.telefono} · ${AZIENDA.email}`,
    `P.IVA ${AZIENDA.piva}`,
    "",
    "Messaggio automatico: si prega di non rispondere a questo indirizzo.",
  ].join("\n");
}

function primoNome(nome: string) {
  return nome.split(" ")[0] || nome;
}

/* ------------------------------------------------------------------ *
 * 1. Nuovo incarico assegnato → al tecnico
 * ------------------------------------------------------------------ */

export function templateNuovoIncarico({
  tecnico,
  cliente,
  indirizzo,
  tipo,
  scadenza,
  note,
  inRitardo = false,
}: {
  tecnico: string;
  cliente: string;
  indirizzo: string | null;
  tipo: string;
  scadenza: string;
  note: string | null;
  inRitardo?: boolean;
}): Messaggio {
  const base = urlBase();
  const scadenzaLeggibile = formattaData(scadenza);

  const corpo = `
    <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#334155">
      Ciao ${esc(primoNome(tecnico))}, ti è stato assegnato un nuovo intervento da eseguire.
    </p>
    ${tabellaDettagli([
      { etichetta: "Cliente", valore: cliente, forte: true },
      { etichetta: "Indirizzo", valore: indirizzo },
      { etichetta: "Lavorazione", valore: tipo },
      { etichetta: "Da fare entro", valore: scadenzaLeggibile, forte: true },
      { etichetta: "Note", valore: note },
    ])}
    ${inRitardo ? riquadroEvidenza("Attenzione: la scadenza indicata è già passata.") : ""}
    ${base ? pulsante("Apri i tuoi incarichi", `${base}/incarichi`) : ""}
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${COLORE.testoTenue}">
      Al termine del lavoro compila il foglio dall'app: l'incarico si chiuderà
      da solo quando lo invii definitivamente.
    </p>`;

  const testo = [
    `Ciao ${primoNome(tecnico)}, ti è stato assegnato un nuovo intervento.`,
    "",
    `Cliente: ${cliente}`,
    indirizzo ? `Indirizzo: ${indirizzo}` : null,
    `Lavorazione: ${tipo}`,
    `Da fare entro: ${scadenzaLeggibile}`,
    note ? `Note: ${note}` : null,
    inRitardo ? "ATTENZIONE: la scadenza indicata è già passata." : null,
    base ? `\nI tuoi incarichi: ${base}/incarichi` : null,
    "",
    "Al termine compila il foglio dall'app: l'incarico si chiude da solo quando lo invii definitivamente.",
    firmaTesto(),
  ]
    .filter((r) => r !== null)
    .join("\n");

  return {
    oggetto: `Nuovo incarico: ${cliente} · ${tipo}`,
    html: impagina({
      titolo: "Nuovo incarico assegnato",
      anteprima: `${cliente} · ${tipo} · entro il ${scadenzaLeggibile}`,
      corpo,
    }),
    testo,
  };
}

/* ------------------------------------------------------------------ *
 * 2. Foglio di lavoro firmato → al cliente
 * ------------------------------------------------------------------ */

export function templateFoglioCliente({
  cliente,
  codice,
  tipo,
  data,
  ore,
  tecnici,
}: {
  cliente: string;
  codice: string;
  tipo: string;
  data: string;
  ore: number | null;
  tecnici: string[];
}): Messaggio {
  const dataLeggibile = formattaData(data);

  const corpo = `
    <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#334155">
      Gentile ${esc(cliente)},<br />
      in allegato trova il foglio di lavoro firmato relativo all'intervento
      appena eseguito presso di voi.
    </p>
    ${tabellaDettagli([
      { etichetta: "N. commessa", valore: codice, forte: true },
      { etichetta: "Lavorazione", valore: tipo },
      { etichetta: "Data intervento", valore: dataLeggibile },
      { etichetta: "Ore impiegate", valore: ore === null ? null : formattaOre(ore) },
      { etichetta: "Eseguito da", valore: tecnici.length ? tecnici.join(", ") : null },
    ])}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0 0">
      <tr>
        <td style="background:#f8fafc;border:1px solid ${COLORE.bordo};border-radius:8px;padding:14px 16px">
          <p style="margin:0;font-size:13px;line-height:1.6;color:${COLORE.testoTenue}">
            📎 Il documento firmato è allegato a questa email in formato PDF.
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#334155">
      Restiamo a disposizione per qualsiasi chiarimento.<br />
      Cordiali saluti.
    </p>`;

  const testo = [
    `Gentile ${cliente},`,
    "",
    "in allegato trova il foglio di lavoro firmato relativo all'intervento appena eseguito presso di voi.",
    "",
    `N. commessa: ${codice}`,
    `Lavorazione: ${tipo}`,
    `Data intervento: ${dataLeggibile}`,
    ore === null ? null : `Ore impiegate: ${formattaOre(ore)}`,
    tecnici.length ? `Eseguito da: ${tecnici.join(", ")}` : null,
    "",
    "Il documento firmato è allegato in formato PDF.",
    "",
    "Restiamo a disposizione per qualsiasi chiarimento.",
    "Cordiali saluti.",
    firmaTesto(),
  ]
    .filter((r) => r !== null)
    .join("\n");

  return {
    oggetto: `Foglio di lavoro ${codice} · ${AZIENDA.nome}`,
    html: impagina({
      titolo: "Il suo foglio di lavoro",
      anteprima: `Commessa ${codice} · ${tipo} · ${dataLeggibile}`,
      corpo,
    }),
    testo,
  };
}
