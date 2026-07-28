"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { richiediUfficio } from "@/lib/auth";
import type { Database } from "@/lib/database.types";
import { messaggioErrore, messaggioErroreAuth } from "@/lib/errori";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export type StatoTecnico = {
  errore?: string;
  successo?: string;
  passwordTemporanea?: string;
};

function passwordCasuale() {
  // 24 caratteri esadecimali: sufficiente come credenziale usa-e-getta.
  return `MC-${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
}

function urlRedirect() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined);
  return base ? `${base}/login` : undefined;
}

/**
 * Crea l'utente su Supabase Auth (non solo l'anagrafica locale) e ne abilita
 * subito il profilo usando la sessione dell'ufficio, che è l'unica autorizzata
 * dalle policy a impostare ruolo e stato di attivazione.
 */
export async function invitaUtente(
  _stato: StatoTecnico,
  formData: FormData,
): Promise<StatoTecnico> {
  await richiediUfficio();

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const ruolo = String(formData.get("ruolo") ?? "tecnico");
  const modalita = String(formData.get("modalita") ?? "invito");

  if (!nome) return { errore: "Il nome è obbligatorio." };
  if (!email) return { errore: "L'email è obbligatoria." };
  if (ruolo !== "tecnico" && ruolo !== "ufficio") {
    return { errore: "Ruolo non valido." };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  let idUtente: string | null = null;
  let passwordTemporanea: string | undefined;
  let messaggio = "";

  if (admin && modalita === "invito") {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nome, ruolo },
      redirectTo: urlRedirect(),
    });

    if (error) {
      return {
        errore: `Invito non inviato: ${messaggioErroreAuth(error)} Se il progetto Supabase non ha ancora un SMTP configurato, usa la creazione con password temporanea.`,
      };
    }
    idUtente = data.user.id;
    messaggio = `Invito inviato a ${email}.`;
  } else if (admin) {
    passwordTemporanea = passwordCasuale();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: passwordTemporanea,
      email_confirm: true,
      user_metadata: { nome, ruolo },
    });

    if (error) return { errore: messaggioErroreAuth(error) };
    idUtente = data.user.id;
    messaggio = `Account creato per ${email}.`;
  } else {
    // Nessuna service_role key: si usa la registrazione pubblica da un client
    // separato, così la sessione dell'ufficio nei cookie resta intatta.
    passwordTemporanea = passwordCasuale();
    const anonimo = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data, error } = await anonimo.auth.signUp({
      email,
      password: passwordTemporanea,
      options: { data: { nome, ruolo }, emailRedirectTo: urlRedirect() },
    });

    if (error) return { errore: messaggioErroreAuth(error) };
    if (!data.user) {
      return { errore: "Creazione utente non riuscita. Riprova." };
    }
    idUtente = data.user.id;
    messaggio = `Account creato per ${email}.`;
  }

  // Il trigger crea il profilo disattivato: è l'ufficio ad abilitarlo.
  const { error: erroreProfilo } = await supabase
    .from("profiles")
    .update({ nome, ruolo, email, attivo: true })
    .eq("id", idUtente);

  if (erroreProfilo) {
    return {
      errore: `Utente creato su Supabase Auth, ma il profilo non è stato abilitato: ${messaggioErrore(erroreProfilo)} Attivalo manualmente dall'elenco.`,
    };
  }

  revalidatePath("/tecnici");
  revalidatePath("/nuovo");

  return {
    successo: passwordTemporanea
      ? `${messaggio} Consegna la password temporanea al destinatario: dovrà cambiarla al primo accesso.`
      : messaggio,
    passwordTemporanea,
  };
}

export async function impostaAttivo(
  _stato: StatoTecnico,
  formData: FormData,
): Promise<StatoTecnico> {
  const ufficio = await richiediUfficio();
  const id = String(formData.get("id") ?? "");
  const attivo = String(formData.get("attivo") ?? "") === "true";

  if (!id) return { errore: "Utente non identificato." };
  if (id === ufficio.id && !attivo) {
    return { errore: "Non puoi disattivare il tuo stesso account." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ attivo })
    .eq("id", id);

  if (error) return { errore: messaggioErrore(error) };

  revalidatePath("/tecnici");
  return { successo: attivo ? "Utente attivato." : "Utente disattivato." };
}

export async function cambiaRuolo(
  _stato: StatoTecnico,
  formData: FormData,
): Promise<StatoTecnico> {
  const ufficio = await richiediUfficio();
  const id = String(formData.get("id") ?? "");
  const ruolo = String(formData.get("ruolo") ?? "");

  if (!id) return { errore: "Utente non identificato." };
  if (ruolo !== "tecnico" && ruolo !== "ufficio") {
    return { errore: "Ruolo non valido." };
  }
  if (id === ufficio.id && ruolo !== "ufficio") {
    return {
      errore:
        "Non puoi togliere a te stesso il ruolo ufficio: perderesti l'accesso alla gestione.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ ruolo }).eq("id", id);

  if (error) return { errore: messaggioErrore(error) };

  revalidatePath("/tecnici");
  return { successo: "Ruolo aggiornato." };
}
