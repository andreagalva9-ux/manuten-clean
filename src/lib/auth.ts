import { redirect } from "next/navigation";

import { puoPianificare, puoVedereTutto, type Profilo } from "@/lib/dominio";
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

/** Rotte riservate all'ufficio: qui si scrive (creare, modificare, eliminare). */
export async function richiediUfficio(): Promise<Profilo> {
  const profilo = await richiediProfilo();
  if (profilo.ruolo !== "ufficio") redirect("/archivio");
  return profilo;
}

/**
 * Rotte di sola visibilità (Clienti, Tecnici, Assegnazioni): ufficio e
 * supervisore vi accedono entrambi, ma solo l'ufficio vede i pulsanti di
 * modifica nella pagina (i relativi Server Action restano protetti da
 * richiediUfficio, quindi il supervisore non può scrivere in ogni caso).
 */
export async function richiediVisibilitaCompleta(): Promise<Profilo> {
  const profilo = await richiediProfilo();
  if (!puoVedereTutto(profilo)) redirect("/nuovo");
  return profilo;
}

/** Azioni di pianificazione (incarichi): ufficio o pianificatore. */
export async function richiediPianificazione(): Promise<Profilo> {
  const profilo = await richiediProfilo();
  if (!puoPianificare(profilo)) redirect("/incarichi");
  return profilo;
}

/** Home di destinazione dopo il login, in base al ruolo. */
export function homePerRuolo(ruolo: string) {
  if (ruolo === "tecnico") return "/nuovo";
  if (ruolo === "pianificatore") return "/incarichi";
  return "/archivio";
}
