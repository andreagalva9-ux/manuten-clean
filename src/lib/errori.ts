import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Traduce gli errori Postgres/Supabase in messaggi comprensibili all'utente.
 * Nessuna chiamata deve fallire in silenzio: ogni percorso di errore passa da qui.
 */
export function messaggioErrore(
  errore: PostgrestError | Error | null | undefined,
  fallback = "Si è verificato un errore imprevisto. Riprova.",
): string {
  if (!errore) return fallback;

  const codice = "code" in errore ? errore.code : undefined;
  const testo = errore.message ?? "";

  switch (codice) {
    case "23505":
      return "Esiste già un foglio con questo numero di commessa. Riprova: il numero verrà riassegnato.";
    case "23503":
      return "Riferimento non valido: il cliente o l'utente indicato non esiste più.";
    case "23514":
      return "Alcuni dati non rispettano i vincoli previsti. Controlla i campi inseriti.";
    case "42501":
    case "PGRST301":
      return "Non hai i permessi necessari per questa operazione.";
    case "PGRST116":
      return "Elemento non trovato o non accessibile con il tuo ruolo.";
  }

  // I RAISE EXCEPTION delle guardie SQL sono già in italiano: mostrali così come sono.
  if (testo.includes("non può essere modificat") || testo.includes("Solo l'ufficio")) {
    return testo;
  }

  if (testo.toLowerCase().includes("failed to fetch") || testo.includes("NetworkError")) {
    return "Connessione assente. Controlla la rete e riprova.";
  }

  // Un messaggio d'errore leggibile ha spazi e lettere; qualunque cosa più
  // opaca (JSON grezzo, codici interni) non va mai mostrata così com'è.
  const sembraLeggibile = /[a-zA-ZàèéìòùÀÈÉÌÒÙ]/.test(testo) && testo.length < 300;
  return sembraLeggibile ? testo : fallback;
}

export function messaggioErroreAuth(errore: Error | null | undefined): string {
  const testo = errore?.message ?? "";
  if (testo.includes("Invalid login credentials")) {
    return "Email o password non corretti.";
  }
  if (testo.includes("Email not confirmed")) {
    return "Email non ancora confermata. Controlla la casella di posta.";
  }
  if (testo.includes("User already registered")) {
    return "Esiste già un utente con questa email.";
  }
  if (testo.includes("Password should be")) {
    return "La password deve avere almeno 6 caratteri.";
  }
  if (testo.toLowerCase().includes("rate limit") || testo.includes("429")) {
    return "Troppi tentativi. Attendi qualche minuto e riprova.";
  }
  return messaggioErrore(errore, "Accesso non riuscito. Riprova.");
}
