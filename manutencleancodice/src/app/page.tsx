import { redirect } from "next/navigation";

import { homePerRuolo, profiloCorrente } from "@/lib/auth";

export default async function Home() {
  const profilo = await profiloCorrente();
  redirect(profilo ? homePerRuolo(profilo.ruolo) : "/login");
}
