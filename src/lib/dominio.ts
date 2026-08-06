import type { Tables } from "@/lib/database.types";

/** Elenco fisso dei tipi di commessa. Deve restare allineato al CHECK su interventi.tipo. */
export const TIPI_COMMESSA = [
  "Pulizie uffici",
  "Sanificazioni e disinfezioni",
  "Sanificazione asili nido",
  "Manutenzione aree verdi",
  "Derattizzazione e disinfestazione",
  "Pulizie industriali",
  "Pulizie vetri",
  "Pulizie condomini",
  "Pulizia pannelli fotovoltaici",
  "Pulizie negozi e attività commerciali",
  "Pulizie ambienti alimentari (HACCP)",
  "Pulizie di fine cantiere",
  "Posa prato sintetico",
  "Altro",
] as const;

export type TipoCommessa = (typeof TIPI_COMMESSA)[number];

export function isTipoCommessa(valore: unknown): valore is TipoCommessa {
  return (
    typeof valore === "string" &&
    (TIPI_COMMESSA as readonly string[]).includes(valore)
  );
}

/** Sigle brevi usate per comporre il codice commessa mostrato in testata. */
const SIGLE: Record<TipoCommessa, string> = {
  "Pulizie uffici": "PU",
  "Sanificazioni e disinfezioni": "SD",
  "Sanificazione asili nido": "SAN",
  "Manutenzione aree verdi": "MAV",
  "Derattizzazione e disinfestazione": "DD",
  "Pulizie industriali": "PI",
  "Pulizie vetri": "PV",
  "Pulizie condomini": "PC",
  "Pulizia pannelli fotovoltaici": "PPF",
  "Pulizie negozi e attività commerciali": "PN",
  "Pulizie ambienti alimentari (HACCP)": "HACCP",
  "Pulizie di fine cantiere": "PFC",
  "Posa prato sintetico": "PPS",
  Altro: "ALT",
};

export function siglaTipo(tipo: string): string {
  return isTipoCommessa(tipo) ? SIGLE[tipo] : "ALT";
}

/** Codice commessa leggibile, es. "PU-004". */
export function codiceCommessa(tipo: string, numero: number): string {
  return `${siglaTipo(tipo)}-${String(numero).padStart(3, "0")}`;
}

export const AZIENDA = {
  nome: "Manuten & Clean 2 S.r.l.",
  descrizione: "Pulizie civili e industriali · Manutenzioni",
  sito: "manutenclean.com",
  indirizzo: "Via Pastonchi, 4 · 22100 Como (CO)",
  telefono: "0315378020",
  fax: "0318120293",
  rea: "CO 331437",
  piva: "03756330134",
  email: "pestcontrol@manutenclean.com",
  pec: "manutenclean2srl@sicurezzapostale.it",
} as const;

export const RUOLI = [
  "ufficio",
  "tecnico",
  "supervisore",
  "pianificatore",
] as const;
export type Ruolo = (typeof RUOLI)[number];

export function isRuolo(valore: unknown): valore is Ruolo {
  return (
    typeof valore === "string" && (RUOLI as readonly string[]).includes(valore)
  );
}
export type Profilo = Tables<"profiles">;
export type Cliente = Tables<"clients">;
export type Intervento = Tables<"interventi">;
export type Incarico = Tables<"incarichi">;

export type InterventoCompleto = Intervento & {
  cliente: Pick<Cliente, "id" | "nome" | "indirizzo"> | null;
  compilatore: Pick<Profilo, "id" | "nome"> | null;
};

export function isUfficio(profilo: Pick<Profilo, "ruolo"> | null | undefined) {
  return profilo?.ruolo === "ufficio";
}

/** Sola lettura di tutto (titolare o suo backup): nessun diritto di scrittura. */
export function isSupervisore(
  profilo: Pick<Profilo, "ruolo"> | null | undefined,
) {
  return profilo?.ruolo === "supervisore";
}

/** Gestisce solo la pianificazione (incarichi dei tecnici), il resto in lettura. */
export function isPianificatore(
  profilo: Pick<Profilo, "ruolo"> | null | undefined,
) {
  return profilo?.ruolo === "pianificatore";
}

/** Chi vede l'intero archivio e le pagine di gestione, in scrittura o sola lettura. */
export function puoVedereTutto(
  profilo: Pick<Profilo, "ruolo"> | null | undefined,
) {
  return isUfficio(profilo) || isSupervisore(profilo) || isPianificatore(profilo);
}

/**
 * Chi compila fogli di lavoro: solo il tecnico, che è l'unico presente
 * sul posto. L'ufficio non ne crea di nuovi — può però correggere e
 * riaprire quelli esistenti, vedi puoModificare.
 */
export function puoCompilare(
  profilo: Pick<Profilo, "ruolo"> | null | undefined,
) {
  return profilo?.ruolo === "tecnico";
}

/**
 * Chi crea/modifica/elimina gli incarichi pianificati: solo il pianificatore.
 * Se serve spostare la pianificazione, l'ufficio assegna il ruolo a un altro
 * utente dalla pagina Utenti.
 */
export function puoPianificare(
  profilo: Pick<Profilo, "ruolo"> | null | undefined,
) {
  return isPianificatore(profilo);
}

/**
 * Chi accede alla pianificazione. L'ufficio ne resta fuori: gli incarichi
 * sono materia del pianificatore, il supervisore li osserva e il tecnico
 * vede soltanto i propri.
 */
export function puoVedereIncarichi(
  profilo: Pick<Profilo, "ruolo"> | null | undefined,
) {
  return (
    isPianificatore(profilo) ||
    isSupervisore(profilo) ||
    profilo?.ruolo === "tecnico"
  );
}

/** Chi vede l'intera pianificazione e non solo gli incarichi propri. */
export function puoVedereTuttiGliIncarichi(
  profilo: Pick<Profilo, "ruolo"> | null | undefined,
) {
  return isPianificatore(profilo) || isSupervisore(profilo);
}

/**
 * Il compilatore o l'ufficio possono archiviare il foglio. È l'unica via
 * di uscita da un foglio già inviato che contiene un errore: si annulla e
 * se ne emette uno nuovo, mentre il numero di commessa resta bruciato.
 * Chi è passato a supervisore o pianificatore resta in sola lettura anche
 * sui fogli che aveva compilato quando era tecnico.
 */
export function puoEliminare(
  intervento: Pick<Intervento, "compilato_da">,
  profilo: Pick<Profilo, "id" | "ruolo"> | null | undefined,
) {
  if (!profilo) return false;
  if (isUfficio(profilo)) return true;
  if (isSupervisore(profilo) || isPianificatore(profilo)) return false;
  return intervento.compilato_da === profilo.id;
}

/**
 * L'invio definitivo chiude il documento per chiunque, ufficio compreso:
 * un foglio firmato dal cliente non si tocca più, come un modulo cartaceo
 * già consegnato. Se contiene un errore va annullato (puoEliminare) e
 * rifatto, così l'archivio non mente mai su cosa è stato firmato.
 *
 * Prima dell'invio modificano l'ufficio e i tecnici del foglio; supervisore
 * e pianificatore restano in sola lettura anche se figurano tra gli
 * assegnati.
 */
export function puoModificare(
  intervento: Pick<
    Intervento,
    "compilato_da" | "tecnici_ids" | "finalizzato_at"
  >,
  profilo: Pick<Profilo, "id" | "ruolo"> | null | undefined,
) {
  if (!profilo) return false;
  if (intervento.finalizzato_at) return false;
  if (isUfficio(profilo)) return true;
  if (isSupervisore(profilo) || isPianificatore(profilo)) return false;
  return (
    intervento.compilato_da === profilo.id ||
    intervento.tecnici_ids.includes(profilo.id)
  );
}

export function formattaData(data: string) {
  const [anno, mese, giorno] = data.split("-");
  return `${giorno}/${mese}/${anno}`;
}

export function formattaOre(ore: number | null) {
  if (ore === null || ore === undefined) return "—";
  const n = Number(ore);
  return Number.isInteger(n) ? `${n} h` : `${n.toFixed(2).replace(".", ",")} h`;
}

export function oggiISO() {
  const ora = new Date();
  const offset = ora.getTimezoneOffset();
  return new Date(ora.getTime() - offset * 60_000).toISOString().slice(0, 10);
}
