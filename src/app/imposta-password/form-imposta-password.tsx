"use client";

import { useActionState } from "react";

import {
  impostaPassword,
  type StatoImpostaPassword,
} from "@/app/imposta-password/azioni";
import { Avviso, BottoneInvio } from "@/components/ui";

export function FormImpostaPassword() {
  const [stato, azione] = useActionState<StatoImpostaPassword, FormData>(
    impostaPassword,
    {},
  );

  return (
    <form action={azione} className="flex flex-col gap-4" noValidate>
      {stato.errore && <Avviso>{stato.errore}</Avviso>}

      <div>
        <label className="etichetta" htmlFor="password">
          Nuova password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="campo"
          placeholder="Almeno 8 caratteri"
        />
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
          minLength={8}
          className="campo"
          placeholder="Ripeti la password"
        />
      </div>

      <BottoneInvio className="mt-2 w-full" inCorso="Salvataggio…">
        Imposta password e accedi
      </BottoneInvio>
    </form>
  );
}
