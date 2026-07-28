import { readFile } from "node:fs/promises";
import path from "node:path";

import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { codiceCommessa } from "@/lib/dominio";
import { FoglioLavoroPDF, type DatiFoglio } from "@/lib/pdf/foglio-lavoro";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let logoDataUriCache: string | null = null;

/** Il logo è statico: lo si legge una sola volta per istanza della funzione. */
async function leggiLogoDataUri(): Promise<string> {
  if (logoDataUriCache) return logoDataUriCache;
  const buffer = await readFile(path.join(process.cwd(), "public", "logo.png"));
  logoDataUriCache = `data:image/png;base64,${buffer.toString("base64")}`;
  return logoDataUriCache;
}

export async function GET(
  _richiesta: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ errore: "Non autenticato." }, { status: 401 });
  }

  // La visibilità è governata dalle policy RLS: un tecnico ottiene 404 sui
  // fogli che non gli appartengono, esattamente come nell'interfaccia.
  const { data: intervento, error } = await supabase
    .from("interventi")
    .select(
      "*, cliente:clients(nome, indirizzo), compilatore:profiles!interventi_compilato_da_fkey(nome)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { errore: "Errore nel recupero del foglio di lavoro." },
      { status: 500 },
    );
  }

  if (!intervento) {
    return NextResponse.json(
      { errore: "Foglio non trovato o non accessibile." },
      { status: 404 },
    );
  }

  const [{ data: tecnici }, { count: numeroTotaleCliente }] = await Promise.all([
    intervento.tecnici_ids.length
      ? supabase
          .from("profiles")
          .select("nome")
          .in("id", intervento.tecnici_ids)
          .order("nome")
      : Promise.resolve({ data: [] as { nome: string }[] }),
    // Il totale include anche gli interventi eliminati: i numeri non vengono
    // mai riassegnati, quindi riflette correttamente "N. X di Y" del modulo cartaceo.
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

  try {
    const buffer = await renderToBuffer(<FoglioLavoroPDF dati={dati} />);
    const nomeFile = `foglio-lavoro-${codiceCommessa(
      intervento.tipo,
      intervento.numero,
    )}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${nomeFile}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { errore: "Generazione del PDF non riuscita." },
      { status: 500 },
    );
  }
}
