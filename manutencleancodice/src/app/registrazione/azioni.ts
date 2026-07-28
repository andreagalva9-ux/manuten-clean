"use server";

import { redirect } from "next/navigation";

import { messaggioErroreAuth } from "@/lib/errori";
import { createClient } from "@/lib/supabase/server";

export type StatoRegistrazione = { errore?: string; avviso?: string };

/**
 * Crea il primissimo account dell'installazione. Il trigger `handle_new_user`
 * assegna automaticamente il ruolo `ufficio` al primo profilo creato; la
 * funzione `serve_bootstrap` chiude questa porta appena esiste un profilo.
 */
export async function registraUfficio(
  _stato: StatoRegistrazione,
  formData: FormData,
): Promise<StatoRegistrazione> {
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const conferma = String(formData.get("conferma") ?? "");

  if (!nome || !email || !password) {
    return { errore: "Compila tutti i campi." };
  }
  if (password.length < 8) {
    return { errore: "La password deve avere almeno 8 caratteri." };
  }
  if (password !== conferma) {
    return { errore: "Le due password non coincidono." };
  }

  const supabase = await createClient();

  const { data: serveBootstrap, error: erroreCheck } =
    await supabase.rpc("serve_bootstrap");

  if (erroreCheck) {
    return {
      errore:
        "Impossibile verificare lo stato dell'installazione. Riprova tra poco.",
    };
  }
  if (!serveBootstrap) {
    return {
      errore:
        "Esistono già degli account: i nuovi utenti vanno creati dalla pagina Tecnici.",
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nome, ruolo: "ufficio" } },
  });

  if (error) {
    return { errore: messaggioErroreAuth(error) };
  }

  if (!data.session) {
    return {
      avviso:
        "Account creato. Conferma l'indirizzo email dal messaggio che hai ricevuto, poi accedi.",
    };
  }

  redirect("/archivio");
}
