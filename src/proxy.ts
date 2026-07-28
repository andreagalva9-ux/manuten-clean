import type { NextRequest } from "next/server";

import { aggiornaSessione } from "@/lib/supabase/sessione";

export async function proxy(request: NextRequest) {
  return aggiornaSessione(request);
}

export const config = {
  matcher: [
    /*
     * Tutte le rotte tranne asset statici e immagini.
     * Le route API restano incluse: anche loro devono avere la sessione fresca.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
