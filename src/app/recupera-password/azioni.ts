"use server";

import { messaggioErroreAuth } from "@/lib/errori";
import { createClient } from "@/lib/supabase/server";
import { urlCallback } from "@/lib/url";

export type StatoRecupero = { errore?: string; successo?: string };

/**
 * Supabase non segnala mai se l'email esiste o no (per non permettere di
 * scoprire quali indirizzi sono registrati): un errore qui riflette un
 * problema reale (formato non valido, troppi tentativi, SMTP non
 * configurato), non l'assenza dell'account.
 */
export async function richiediRecuperoPassword(
  _stato: StatoRecupero,
  formData: FormData,
): Promise<StatoRecupero> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) return { errore: "Indica la tua email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: urlCallback("/imposta-password"),
  });

  if (error) return { errore: messaggioErroreAuth(error) };

  return {
    successo:
      "Se l'indirizzo è registrato, riceverai a breve un'email con il link per impostare una nuova password.",
  };
}
