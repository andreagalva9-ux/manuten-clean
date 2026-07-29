"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { richiediUfficio } from "@/lib/auth";
import type { Database } from "@/lib/database.types";
import { isRuolo } from "@/lib/dominio";
import { messaggioErrore, messaggioErroreAuth } from "@/lib/errori";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { urlCallback } from "@/lib/url";

export type StatoTecnico = {
  errore?: string;
  successo?: string;
  passwordTemporanea?: string;
};

function passwordCasuale() {
  // 24 caratteri esadecimali: sufficiente come credenziale usa-e-getta.
  return `MC-${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
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
  const ruoloGrezzo = String(formData.get("ruolo") ?? "tecnico");
  const modalita = String(formData.get("modalita") ?? "invito");

  if (!nome) return { errore: "Il nome è obbligatorio." };
  if (!email) return { errore: "L'email è obbligatoria." };
  if (!isRuolo(ruoloGrezzo)) {
    return { errore: "Ruolo non valido." };
  }
  const ruolo = ruoloGrezzo;

  const supabase = await createClient();
  const admin = createAdminClient();

  let idUtente: string | null = null;
  let passwordTemporanea: string | undefined;
  let messaggio = "";

  if (admin && modalita === "invito") {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nome, ruolo },
      redirectTo: urlCallback("/imposta-password"),
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
      options: {
        data: { nome, ruolo },
        emailRedirectTo: urlCallback("/imposta-password"),
      },
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

/**
 * Elimina l'account su Supabase Auth (non solo il profilo locale): serve a
 * liberare l'email, per esempio quando un invito non è mai stato usato e va
 * rimandato. Rifiutata se l'utente ha già fogli di lavoro associati, per non
 * lasciare riferimenti orfani nell'archivio.
 */
export async function eliminaUtente(
  _stato: StatoTecnico,
  formData: FormData,
): Promise<StatoTecnico> {
  const ufficio = await richiediUfficio();
  const id = String(formData.get("id") ?? "");

  if (!id) return { errore: "Utente non identificato." };
  if (id === ufficio.id) return { errore: "Non puoi eliminare te stesso." };

  const admin = createAdminClient();
  if (!admin) {
    return {
      errore:
        "Eliminazione non disponibile: manca la chiave service_role nelle variabili d'ambiente.",
    };
  }

  const supabase = await createClient();
  const [{ count: compilati, error: erroreCompilati }, { count: assegnati, error: erroreAssegnati }] =
    await Promise.all([
      supabase
        .from("interventi")
        .select("id", { count: "exact", head: true })
        .eq("compilato_da", id),
      supabase
        .from("interventi")
        .select("id", { count: "exact", head: true })
        .contains("tecnici_ids", [id]),
    ]);

  if (erroreCompilati || erroreAssegnati) {
    return { errore: messaggioErrore(erroreCompilati ?? erroreAssegnati) };
  }
  if ((compilati ?? 0) + (assegnati ?? 0) > 0) {
    return {
      errore:
        'Questo utente ha già fogli di lavoro associati: non può essere eliminato definitivamente. Usa "Disattiva" per revocargli l\'accesso.',
    };
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { errore: messaggioErroreAuth(error) };

  revalidatePath("/tecnici");
  revalidatePath("/nuovo");
  return {
    successo: "Utente eliminato: puoi invitarlo di nuovo con la stessa email.",
  };
}

/**
 * Reimposta la password di un utente esistente a una nuova password
 * temporanea, da consegnare a mano: non dipende dall'invio di email, quindi
 * funziona anche quando il servizio email non è configurato o ha raggiunto
 * il limite di invii.
 */
export async function reimpostaPassword(
  _stato: StatoTecnico,
  formData: FormData,
): Promise<StatoTecnico> {
  await richiediUfficio();
  const id = String(formData.get("id") ?? "");
  if (!id) return { errore: "Utente non identificato." };

  const admin = createAdminClient();
  if (!admin) {
    return {
      errore:
        "Reimpostazione non disponibile: manca la chiave service_role nelle variabili d'ambiente.",
    };
  }

  const passwordTemporanea = passwordCasuale();
  const { error } = await admin.auth.admin.updateUserById(id, {
    password: passwordTemporanea,
  });

  if (error) return { errore: messaggioErroreAuth(error) };

  return {
    successo:
      "Password reimpostata. Consegna la nuova password temporanea al destinatario: dovrà cambiarla al primo accesso.",
    passwordTemporanea,
  };
}

export async function cambiaRuolo(
  _stato: StatoTecnico,
  formData: FormData,
): Promise<StatoTecnico> {
  const ufficio = await richiediUfficio();
  const id = String(formData.get("id") ?? "");
  const ruoloGrezzo = String(formData.get("ruolo") ?? "");

  if (!id) return { errore: "Utente non identificato." };
  if (!isRuolo(ruoloGrezzo)) {
    return { errore: "Ruolo non valido." };
  }
  const ruolo = ruoloGrezzo;
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
