"use server";

import { redirect } from "next/navigation";

import { homePerRuolo } from "@/lib/auth";
import { messaggioErroreAuth } from "@/lib/errori";
import { createClient } from "@/lib/supabase/server";

export type StatoImpostaPassword = { errore?: string };

export async function impostaPassword(
  _stato: StatoImpostaPassword,
  formData: FormData,
): Promise<StatoImpostaPassword> {
  const password = String(formData.get("password") ?? "");
  const conferma = String(formData.get("conferma") ?? "");

  if (password.length < 8) {
    return { errore: "La password deve avere almeno 8 caratteri." };
  }
  if (password !== conferma) {
    return { errore: "Le due password non coincidono." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      errore:
        "Il link di invito non è più valido. Chiedi all'ufficio di inviartene uno nuovo.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { errore: messaggioErroreAuth(error) };

  const { data: profilo } = await supabase
    .from("profiles")
    .select("ruolo")
    .eq("id", user.id)
    .maybeSingle();

  redirect(homePerRuolo(profilo?.ruolo ?? "tecnico"));
}
