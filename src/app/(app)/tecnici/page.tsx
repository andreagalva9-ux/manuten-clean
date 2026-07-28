import { GestioneTecnici } from "@/app/(app)/tecnici/gestione-tecnici";
import { Avviso } from "@/components/ui";
import { richiediUfficio } from "@/lib/auth";
import { messaggioErrore } from "@/lib/errori";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Tecnici · Manuten & Clean" };

export default async function PaginaTecnici() {
  const profilo = await richiediUfficio();
  const supabase = await createClient();

  const [{ data: utenti, error }, { data: interventi }] = await Promise.all([
    supabase.from("profiles").select("*").order("nome"),
    supabase.from("interventi").select("compilato_da").is("deleted_at", null),
  ]);

  if (error) {
    return (
      <Avviso>
        Impossibile caricare gli utenti. {messaggioErrore(error)}
      </Avviso>
    );
  }

  const conteggi = new Map<string, number>();
  for (const riga of interventi ?? []) {
    conteggi.set(riga.compilato_da, (conteggi.get(riga.compilato_da) ?? 0) + 1);
  }

  return (
    <GestioneTecnici
      idCorrente={profilo.id}
      invitoEmailDisponibile={Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)}
      utenti={(utenti ?? []).map((u) => ({
        ...u,
        fogli: conteggi.get(u.id) ?? 0,
      }))}
    />
  );
}
