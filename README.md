# Fogli di lavoro — Manuten & Clean Srl

Sostituisce i fogli di lavoro cartacei di [Manuten & Clean Srl](https://manutenclean.com)
con un gestionale web: i tecnici compilano dal telefono in cantiere, l'ufficio
consulta l'archivio, filtra ed esporta i PDF.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth + RLS) · Vercel

---

## Avvio in locale

```bash
npm install
cp .env.example .env.local   # inserisci URL e chiave del progetto Supabase
npm run dev
```

### Variabili d'ambiente

| Variabile | Obbligatoria | A cosa serve |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | sì | Endpoint del progetto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sì | Chiave publishable/anon |
| `SUPABASE_SERVICE_ROLE_KEY` | no | Abilita l'invito via email dei tecnici da `/tecnici`. Senza, l'utente viene comunque creato su Supabase Auth ma con una password temporanea da consegnare a mano |
| `NEXT_PUBLIC_SITE_URL` | no | Base URL usata nei link degli inviti (su Vercel viene dedotta da `VERCEL_PROJECT_PRODUCTION_URL`) |

### Primo accesso

Su un'installazione senza utenti, `/login` propone la creazione dell'account
ufficio: il **primo profilo creato riceve automaticamente il ruolo `ufficio`**
e quella porta si chiude subito dopo. Da lì si popolano Clienti e Tecnici.

---

## Ruoli

| | Ufficio | Tecnico |
| --- | --- | --- |
| Nuovo foglio | ✅ | ✅ |
| Archivio | tutti i fogli | solo i propri o quelli in cui è assegnato |
| Modifica foglio | tutti | solo i propri o quelli assegnati |
| Elimina foglio (logica) | ✅ | solo quelli che ha compilato |
| Clienti (CRUD) | ✅ | sola lettura |
| Tecnici (invito, ruoli, attivazione) | ✅ | — |

I permessi non sono solo nell'interfaccia: sono **Row Level Security su Postgres**,
quindi valgono anche per chiamate dirette all'API con la chiave pubblica.

---

## Numerazione delle commesse

Ogni foglio ha un progressivo per la coppia **cliente + tipo di commessa**
(`PU-001`, `PU-002`, `SAN-001`, …). Il numero:

- **non arriva mai dal client.** Il form mostra un'anteprima non vincolante
  (`public.anteprima_numero`), ma il valore reale lo assegna un trigger
  `BEFORE INSERT` dentro la stessa transazione dell'INSERT;
- **non può collidere.** Il trigger incrementa una riga della tabella
  `contatori_commessa` con `INSERT … ON CONFLICT DO UPDATE … RETURNING`: la riga
  resta bloccata fino al commit, quindi un secondo inserimento concorrente
  attende e riparte dal valore aggiornato;
- **non viene mai riciclato.** L'eliminazione è sempre logica (`deleted_at`) e il
  contatore non torna indietro: un numero emesso resta bruciato per sempre;
- **non è modificabile.** Un trigger blocca le UPDATE su `numero`, `client_id`,
  `tipo` e `compilato_da`.

Verificato con 15 connessioni Postgres realmente simultanee (via `dblink` in modalità
asincrona) sullo stesso cliente e tipo: 15 numeri distinti, sequenza 1–15 senza buchi
né duplicati. Dopo il soft delete di 13/14/15, i cinque inserimenti successivi hanno
ripreso da 16.

---

## Struttura

```
src/
  app/
    login/                 accesso + bootstrap primo utente
    registrazione/         creazione account ufficio (solo installazione vuota)
    (app)/                 area autenticata con shell e navigazione per ruolo
      nuovo/               compilazione foglio + anteprima progressivo
      archivio/            elenco filtrabile, ricerca, paginazione
      archivio/[id]/       dettaglio, modifica, firme, eliminazione logica
      clienti/             anagrafica clienti (solo ufficio)
      tecnici/             utenti e inviti (solo ufficio)
    api/interventi/[id]/pdf  generazione PDF lato server
  components/              UI, navigazione, canvas firma
  lib/
    supabase/              client browser, client server, refresh sessione
    dominio.ts             tipi commessa, codici, formattazioni
    errori.ts              traduzione degli errori Postgres/Auth in italiano
    pdf/                   layout del foglio di lavoro in PDF
supabase/migrations/       schema, trigger e policy versionati
```

## Export PDF

`GET /api/interventi/<id>/pdf` genera il documento con `@react-pdf/renderer`
lato Node. La rotta passa dallo stesso client Supabase autenticato dell'utente,
quindi **le policy RLS valgono anche per il PDF**: su un foglio non proprio un
tecnico riceve 404, non il documento. Il layout riprende il foglio cartaceo:
intestazione aziendale, numero di commessa in evidenza, sezioni etichettate e
righe firma in fondo.

## Firme

Canvas HTML con eventi pointer (dito o mouse), salvate come PNG in data URL nelle
colonne `firma_tecnico_svg` / `firma_cliente_svg` e ristampate nel PDF. Sono
facoltative: si possono raccogliere alla compilazione o aggiungere in seguito dal
dettaglio in archivio.

---

## Note operative

- **Protezione password compromesse.** Non è attiva di default. Si consiglia di
  abilitarla in Supabase → Authentication → Passwords
  ([documentazione](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)).
- **SMTP.** L'invito via email dei tecnici usa il servizio email di Supabase, che
  senza SMTP proprio è pesantemente limitato. Per un uso reale conviene
  configurare un SMTP nel progetto; in alternativa si usa la modalità "password
  temporanea", che non dipende dall'invio di email.
- **Registrazione pubblica.** Un utente che si registrasse da solo ottiene un
  profilo **disattivato** e non vede alcun dato finché l'ufficio non lo abilita.
