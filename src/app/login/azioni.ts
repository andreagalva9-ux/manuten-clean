"use server";

import { redirect } from "next/navigation";

import { homePerRuolo } from "@/lib/auth";
import { messaggioErroreAuth } from "@/lib/errori";
import { createClient } from "@/lib/supabase/server";

export type StatoLogin = { errore?: string };

export async function accedi(
  _stato: StatoLogin,
  formData: FormData,
): Promise<StatoLogin> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const destinazione = String(formData.get("redirect") ?? "");

  if (!email || !password) {
    return { errore: "Inserisci email e password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { errore: messaggioErroreAuth(error) };
  }

  const { data: profilo, error: erroreProfilo } = await supabase
    .from("profiles")
    .select("ruolo, attivo")
    .eq("id", data.user.id)
    .maybeSingle();

  if (erroreProfilo) {
    await supabase.auth.signOut();
    return {
      errore:
        "Accesso riuscito ma non è stato possibile leggere il profilo. Riprova.",
    };
  }

  if (!profilo) {
    await supabase.auth.signOut();
    return {
      errore:
        "Nessun profilo associato a questo account. Contatta l'ufficio.",
    };
  }

  if (!profilo.attivo) {
    await supabase.auth.signOut();
    return {
      errore:
        "Account non ancora abilitato. L'ufficio deve attivarlo prima del primo accesso.",
    };
  }

  redirect(
    destinazione && destinazione.startsWith("/")
      ? destinazione
      : homePerRuolo(profilo.ruolo),
  );
}

export async function esci() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
