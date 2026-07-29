function urlBase() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined)
  );
}

/**
 * URL di destinazione per i link email di Supabase Auth (invito, recupero
 * password): passano dallo scambio del codice in /auth/callback, che
 * stabilisce la sessione prima di mandare l'utente su `next`.
 */
export function urlCallback(next: string) {
  const base = urlBase();
  return base
    ? `${base}/auth/callback?next=${encodeURIComponent(next)}`
    : undefined;
}
