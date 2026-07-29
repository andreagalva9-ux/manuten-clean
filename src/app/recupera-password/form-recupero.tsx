"use client";

import { useActionState } from "react";

import {
  richiediRecuperoPassword,
  type StatoRecupero,
} from "@/app/recupera-password/azioni";
import { Avviso, BottoneInvio } from "@/components/ui";

export function FormRecupero() {
  const [stato, azione] = useActionState<StatoRecupero, FormData>(
    richiediRecuperoPassword,
    {},
  );

  if (stato.successo) {
    return <Avviso tipo="successo">{stato.successo}</Avviso>;
  }

  return (
    <form action={azione} className="flex flex-col gap-4" noValidate>
      {stato.errore && <Avviso>{stato.errore}</Avviso>}

      <div>
        <label className="etichetta" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          required
          className="campo"
          placeholder="nome@manutenclean.com"
        />
      </div>

      <BottoneInvio className="w-full" inCorso="Invio in corso…">
        Invia link di recupero
      </BottoneInvio>
    </form>
  );
}
