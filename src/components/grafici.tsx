import Link from "next/link";

/*
 * Grafici della dashboard, disegnati in SVG e CSS senza librerie esterne:
 * restano leggeri, si renderizzano lato server e non richiedono JavaScript
 * nel browser. Le proporzioni sono sempre calcolate sul valore massimo della
 * serie, così una barra piena significa "il più alto", non un valore assoluto.
 */

export const COLORE_GRAFICI = {
  ritardo: "#b91c1c",
  oggi: "#c2410c",
  vicino: "#ca8a04",
  lontano: "#087972",
  neutro: "#cbd5e1",
} as const;

export function Scheda({
  titolo,
  sottotitolo,
  azione,
  children,
}: {
  titolo: string;
  sottotitolo?: string;
  azione?: { href: string; etichetta: string };
  children: React.ReactNode;
}) {
  return (
    <section className="scheda p-4">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-900">{titolo}</h2>
          {sottotitolo && (
            <p className="text-xs text-slate-500">{sottotitolo}</p>
          )}
        </div>
        {azione && (
          <Link
            href={azione.href}
            className="shrink-0 text-sm font-medium text-brand-700 hover:underline"
          >
            {azione.etichetta}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/**
 * Istogramma verticale delle scadenze. Ogni fascia ha un colore che ne
 * comunica l'urgenza, così il ritardo si nota prima ancora di leggere i
 * numeri.
 */
export function GraficoScadenze({
  fasce,
}: {
  fasce: { etichetta: string; valore: number; colore: string }[];
}) {
  const massimo = Math.max(...fasce.map((f) => f.valore), 1);
  const totale = fasce.reduce((somma, f) => somma + f.valore, 0);

  if (totale === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        Nessun incarico aperto: tutto in pari.
      </p>
    );
  }

  return (
    <div className="flex items-end justify-between gap-2 sm:gap-3">
      {fasce.map((fascia) => {
        // Altezza minima visibile anche per i valori a zero, così le colonne
        // restano allineate e la fascia resta leggibile.
        const altezza = fascia.valore === 0 ? 3 : (fascia.valore / massimo) * 100;
        return (
          <div
            key={fascia.etichetta}
            className="flex flex-1 flex-col items-center gap-1.5"
          >
            <span
              className="text-sm font-bold"
              style={{
                color: fascia.valore > 0 ? fascia.colore : COLORE_GRAFICI.neutro,
              }}
            >
              {fascia.valore}
            </span>
            <div className="flex h-24 w-full items-end">
              <div
                className="w-full rounded-t-md transition-all"
                style={{
                  height: `${altezza}%`,
                  background:
                    fascia.valore > 0 ? fascia.colore : COLORE_GRAFICI.neutro,
                  opacity: fascia.valore > 0 ? 1 : 0.4,
                }}
              />
            </div>
            <span className="text-center text-[11px] leading-tight font-medium text-slate-500">
              {fascia.etichetta}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Barre orizzontali: adatte a etichette lunghe come nomi e lavorazioni. */
export function GraficoBarre({
  voci,
  vuoto,
}: {
  voci: { etichetta: string; valore: number; evidenzia?: number }[];
  vuoto: string;
}) {
  const massimo = Math.max(...voci.map((v) => v.valore), 1);

  if (voci.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">{vuoto}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {voci.map((voce) => {
        const inRitardo = voce.evidenzia ?? 0;
        const larghezza = (voce.valore / massimo) * 100;
        // La quota in ritardo è disegnata dentro la barra, non accanto:
        // si legge subito quanta parte del carico è già scaduta.
        const quotaRitardo =
          voce.valore > 0 ? (inRitardo / voce.valore) * 100 : 0;

        return (
          <li key={voce.etichetta}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-medium text-slate-700">
                {voce.etichetta}
              </span>
              <span className="shrink-0 text-sm font-semibold text-slate-900">
                {voce.valore}
                {inRitardo > 0 && (
                  <span className="ml-1.5 text-xs font-medium text-red-700">
                    {inRitardo} in ritardo
                  </span>
                )}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="flex h-full overflow-hidden rounded-full"
                style={{ width: `${larghezza}%` }}
              >
                <div
                  style={{
                    width: `${quotaRitardo}%`,
                    background: COLORE_GRAFICI.ritardo,
                  }}
                />
                <div
                  className="flex-1"
                  style={{ background: COLORE_GRAFICI.lontano }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Anello di avanzamento: quota completata sul totale del mese. Disegnato con
 * un cerchio SVG e stroke-dasharray, così scala senza perdere nitidezza.
 */
export function Anello({
  completati,
  totali,
  etichetta,
}: {
  completati: number;
  totali: number;
  etichetta: string;
}) {
  const percentuale = totali === 0 ? 0 : Math.round((completati / totali) * 100);
  const raggio = 52;
  const circonferenza = 2 * Math.PI * raggio;
  const riempimento = (percentuale / 100) * circonferenza;

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="relative">
        <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
          <circle
            cx="70"
            cy="70"
            r={raggio}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="14"
          />
          {/* A zero l'arco non va disegnato: l'estremità arrotondata
              lascerebbe comunque un puntino, facendolo sembrare avviato. */}
          {percentuale > 0 && (
            <circle
              cx="70"
              cy="70"
              r={raggio}
              fill="none"
              stroke={COLORE_GRAFICI.lontano}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${riempimento} ${circonferenza}`}
              transform="rotate(-90 70 70)"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">
            {percentuale}%
          </span>
          <span className="text-[11px] font-medium text-slate-500">
            {completati} di {totali}
          </span>
        </div>
      </div>
      <p className="text-center text-xs font-medium text-slate-500">
        {etichetta}
      </p>
    </div>
  );
}
