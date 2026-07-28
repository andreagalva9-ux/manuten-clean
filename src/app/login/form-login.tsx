"use client";

import { useActionState } from "react";

import { accedi, type StatoLogin } from "@/app/login/azioni";
import { Avviso, BottoneInvio } from "@/components/ui";

export function FormLogin({ destinazione }: { destinazione: string }) {
  const [stato, azione] = useActionState<StatoLogin, FormData>(accedi, {});

  return (
    <form action={azione} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="redirect" value={destinazione} />

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

      <div>
        <label className="etichetta" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="campo"
          placeholder="••••••••"
        />
      </div>

      <BottoneInvio className="mt-2 w-full" inCorso="Accesso in corso…">
        Accedi
      </BottoneInvio>
    </form>
  );
}
