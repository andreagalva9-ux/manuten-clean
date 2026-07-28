import { redirect } from "next/navigation";

import type { Profilo } from "@/lib/dominio";
import { createClient } from "@/lib/supabase/server";

/** Profilo dell'utente loggato, o null se la sessione non è valida. */
export async function profiloCorrente(): Promise<Profilo | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data ?? null;
}

/** Come sopra, ma rimanda al login se manca la sessione. */
export async function richiediProfilo(): Promise<Profilo> {
  const profilo = await profiloCorrente();
  if (!profilo) redirect("/login");
  return profilo;
}

/** Rotte riservate all'ufficio (Clienti, Tecnici). */
export async function richiediUfficio(): Promise<Profilo> {
  const profilo = await richiediProfilo();
  if (profilo.ruolo !== "ufficio") redirect("/archivio");
  return profilo;
}

/** Home di destinazione dopo il login, in base al ruolo. */
export function homePerRuolo(ruolo: string) {
  return ruolo === "ufficio" ? "/archivio" : "/nuovo";
}
