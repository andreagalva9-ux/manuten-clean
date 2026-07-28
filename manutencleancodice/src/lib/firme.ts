/** Limite prudenziale: una firma su canvas sta ampiamente entro 1 MB. */
const DIMENSIONE_MASSIMA = 1_000_000;

/**
 * Valida il data URL prodotto dal canvas di firma prima di scriverlo a
 * database. Un valore vuoto o non riconosciuto diventa `null`: la firma è
 * facoltativa e non deve mai bloccare il salvataggio del foglio.
 */
export function leggiFirma(valore: FormDataEntryValue | null): string | null {
  if (typeof valore !== "string") return null;

  const pulito = valore.trim();
  if (!pulito) return null;
  if (!pulito.startsWith("data:image/png;base64,")) return null;
  if (pulito.length > DIMENSIONE_MASSIMA) return null;

  return pulito;
}
