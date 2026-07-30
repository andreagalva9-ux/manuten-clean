import { readFile } from "node:fs/promises";
import path from "node:path";

import { renderToBuffer } from "@react-pdf/renderer";

import { codiceCommessa } from "@/lib/dominio";
import { FoglioLavoroPDF, type DatiFoglio } from "@/lib/pdf/foglio-lavoro";
import { createClient } from "@/lib/supabase/server";

let logoDataUriCache: string | null = null;

/** Il logo è statico: lo si legge una sola volta per istanza della funzione. */
async function leggiLogoDataUri(): Promise<string> {
  if (logoDataUriCache) return logoDataUriCache;
  const buffer = await readFile(path.join(process.cwd(), "public", "logo.png"));
  logoDataUriCache = `data:image/png;base64,${buffer.toString("base64")}`;
  return logoDataUriCache;
}

export type PdfFoglio = {
  buffer: Buffer;
  nomeFile: string;
  codice: string;
  tipo: string;
  numero: number;
  cliente: { nome: string; indirizzo: string | null } | null;
};

/**
 * Genera il PDF di un foglio di lavoro. La visibilità resta governata dalle
 * policy RLS del client passato: restituisce null se il foglio non esiste o
 * non è accessibile a chi sta chiamando.
 */
export async function generaPdfFoglio(id: string): Promise<PdfFoglio | null> {
  const supabase = await createClient();

  const { data: intervento, error } = await supabase
    .from("interventi")
    .select(
      "*, cliente:clients(nome, indirizzo), compilatore:profiles!interventi_compilato_da_fkey(nome)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !intervento) return null;

  const [{ data: tecnici }, { count: numeroTotaleCliente }] = await Promise.all([
    intervento.tecnici_ids.length
      ? supabase
          .from("profiles")
          .select("nome")
          .in("id", intervento.tecnici_ids)
          .order("nome")
      : Promise.resolve({ data: [] as { nome: string }[] }),
    // Il totale include anche gli interventi eliminati: i numeri non vengono
    // mai riassegnati, quindi riflette correttamente "N. X di Y" del cartaceo.
    supabase
      .from("interventi")
      .select("id", { count: "exact", head: true })
      .eq("client_id", intervento.client_id)
      .eq("tipo", intervento.tipo),
  ]);

  const dati: DatiFoglio = {
    logoDataUri: await leggiLogoDataUri(),
    numero: intervento.numero,
    numeroTotaleCliente: numeroTotaleCliente ?? intervento.numero,
    tipo: intervento.tipo,
    data: intervento.data,
    ore: intervento.ore,
    lavoroSvolto: intervento.lavoro_svolto,
    note: intervento.note,
    personaContatto: intervento.persona_contatto,
    materialiInstallati: intervento.materiali_installati,
    areeIntervento: intervento.aree_intervento,
    cliente: intervento.cliente,
    compilatore: intervento.compilatore?.nome ?? "—",
    tecnici: (tecnici ?? []).map((t) => t.nome),
    firmaTecnico: intervento.firma_tecnico_svg,
    firmaCliente: intervento.firma_cliente_svg,
    eliminato: Boolean(intervento.deleted_at),
  };

  const buffer = await renderToBuffer(<FoglioLavoroPDF dati={dati} />);
  const codice = codiceCommessa(intervento.tipo, intervento.numero);

  return {
    buffer,
    nomeFile: `foglio-lavoro-${codice}.pdf`,
    codice,
    tipo: intervento.tipo,
    numero: intervento.numero,
    cliente: intervento.cliente,
  };
}
