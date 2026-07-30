import { NextResponse } from "next/server";

import { generaPdfFoglio } from "@/lib/pdf/genera";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  try {
    // La visibilità è governata dalle policy RLS: un tecnico ottiene 404 sui
    // fogli che non gli appartengono, esattamente come nell'interfaccia.
    const pdf = await generaPdfFoglio(id);

    if (!pdf) {
      return NextResponse.json(
        { errore: "Foglio non trovato o non accessibile." },
        { status: 404 },
      );
    }

    return new NextResponse(new Uint8Array(pdf.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${pdf.nomeFile}"`,
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
