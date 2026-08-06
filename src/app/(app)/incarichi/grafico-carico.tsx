"use client";

import { COLORE_GRAFICI } from "@/components/grafici";

/*
 * Carico dei tecnici a colpo d'occhio: una barra per tecnico, divisa nelle
 * tre urgenze. La lunghezza della barra è il carico totale rapportato al
 * tecnico più carico, così si vede subito chi è pieno e chi è scarico; i
 * colori dicono quanto è urgente quel carico.
 *
 * Le barre sono anche il filtro: cliccarne una restringe l'elenco sotto a
 * quel tecnico, perché "guardare" e "andare a vedere" sono lo stesso gesto.
 */

export type CaricoTecnico = {
  id: string;
  nome: string;
  inRitardo: number;
  inScadenza: number;
  piuAvanti: number;
  totale: number;
};

const FASCE = [
  { chiave: "inRitardo", etichetta: "In ritardo", colore: COLORE_GRAFICI.ritardo },
  { chiave: "inScadenza", etichetta: "Entro 7 giorni", colore: COLORE_GRAFICI.vicino },
  { chiave: "piuAvanti", etichetta: "Più avanti", colore: COLORE_GRAFICI.lontano },
] as const;

export function GraficoCaricoTecnici({
  carichi,
  selezionato,
  onSeleziona,
}: {
  carichi: CaricoTecnico[];
  selezionato: string | null;
  onSeleziona: (id: string | null) => void;
}) {
  const massimo = Math.max(...carichi.map((c) => c.totale), 1);

  if (carichi.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        Nessun incarico aperto: non c&apos;è carico da distribuire.
      </p>
    );
  }

  return (
    <section className="scheda p-4">
      <div className="mb-2">
        <h2 className="font-semibold text-slate-900">Carico dei tecnici</h2>
        <p className="text-xs text-slate-500">
          Incarichi aperti per tecnico. Tocca una barra per filtrare
          l&apos;elenco.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {FASCE.map((f) => (
            <li
              key={f.chiave}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: f.colore }}
                aria-hidden="true"
              />
              {f.etichetta}
            </li>
          ))}
        </ul>
        {selezionato && (
          <button
            type="button"
            onClick={() => onSeleziona(null)}
            className="rounded-full border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Mostra tutti
          </button>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {carichi.map((carico) => {
          const attivo = selezionato === carico.id;

          return (
            <li key={carico.id}>
              <button
                type="button"
                onClick={() => onSeleziona(attivo ? null : carico.id)}
                aria-pressed={attivo}
                className={`w-full rounded-lg px-2.5 py-2 text-left transition ${
                  attivo
                    ? "bg-brand-50 ring-1 ring-brand-200"
                    : "hover:bg-slate-50"
                }`}
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium text-slate-800">
                    {carico.nome}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2 text-xs">
                    {carico.inRitardo > 0 && (
                      <span className="font-semibold text-red-700">
                        {carico.inRitardo} in ritardo
                      </span>
                    )}
                    <span className="text-sm font-bold text-slate-900">
                      {carico.totale}
                    </span>
                  </span>
                </div>

                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="flex h-full overflow-hidden rounded-full"
                    style={{ width: `${(carico.totale / massimo) * 100}%` }}
                  >
                    {FASCE.map((f) => {
                      const valore = carico[f.chiave];
                      // Un segmento a zero non va disegnato: a larghezza nulla
                      // lascerebbe comunque una scheggia di colore.
                      if (valore === 0) return null;
                      return (
                        <div
                          key={f.chiave}
                          style={{
                            width: `${(valore / carico.totale) * 100}%`,
                            background: f.colore,
                          }}
                          title={`${f.etichetta}: ${valore}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
