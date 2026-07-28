"use client";

import { useActionState } from "react";

import {
  registraUfficio,
  type StatoRegistrazione,
} from "@/app/registrazione/azioni";
import { Avviso, BottoneInvio } from "@/components/ui";

export function FormRegistrazione() {
  const [stato, azione] = useActionState<StatoRegistrazione, FormData>(
    registraUfficio,
    {},
  );

  return (
    <form action={azione} className="flex flex-col gap-4" noValidate>
      {stato.errore && <Avviso>{stato.errore}</Avviso>}
      {stato.avviso && <Avviso tipo="successo">{stato.avviso}</Avviso>}

      <div>
        <label className="etichetta" htmlFor="nome">
          Nome e cognome
        </label>
        <input id="nome" name="nome" required className="campo" />
      </div>

      <div>
        <label className="etichetta" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoComplete="username"
          required
          className="campo"
        />
      </div>

      <div>
        <label className="etichetta" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="campo"
        />
        <p className="mt-1 text-xs text-slate-500">Almeno 8 caratteri.</p>
      </div>

      <div>
        <label className="etichetta" htmlFor="conferma">
          Conferma password
        </label>
        <input
          id="conferma"
          name="conferma"
          type="password"
          autoComplete="new-password"
          required
          className="campo"
        />
      </div>

      <BottoneInvio className="mt-2 w-full" inCorso="Creazione in corso…">
        Crea account
      </BottoneInvio>
    </form>
  );
}
