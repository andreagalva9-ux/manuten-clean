-- Le funzioni di supporto non devono comparire come endpoint /rest/v1/rpc.
-- PostgREST espone solo gli schemi configurati (public): spostandole in uno
-- schema privato restano richiamabili dalle policy ma non dall'esterno.
create schema if not exists privato;

revoke all on schema privato from public;
grant usage on schema privato to authenticated;

alter function public.e_ufficio() set schema privato;
alter function public.e_attivo() set schema privato;
alter function public.ruolo_corrente() set schema privato;
alter function public.assegna_numero_intervento() set schema privato;
alter function public.blocca_campi_immutabili() set schema privato;
alter function public.blocca_cambio_ruolo() set schema privato;
alter function public.blocca_soft_delete_non_autorizzato() set schema privato;
alter function public.handle_new_user() set schema privato;

-- Mancava il search_path fisso: senza, un search_path ostile potrebbe
-- dirottare i riferimenti risolti dentro la funzione.
alter function privato.blocca_campi_immutabili() set search_path = public;

-- Le policy hanno bisogno di eseguirle, gli utenti anonimi no.
revoke all on function privato.e_ufficio() from public;
revoke all on function privato.e_attivo() from public;
revoke all on function privato.ruolo_corrente() from public;
grant execute on function privato.e_ufficio() to authenticated;
grant execute on function privato.e_attivo() to authenticated;
grant execute on function privato.ruolo_corrente() to authenticated;

-- L'anteprima del progressivo resta in public (la chiama il browser) ma non
-- deve essere raggiungibile senza sessione.
revoke all on function public.anteprima_numero(uuid, text) from public, anon;
grant execute on function public.anteprima_numero(uuid, text) to authenticated;

-- serve_bootstrap resta accessibile ad anon: la pagina di login deve poter
-- sapere se l'installazione è vuota. Restituisce solo un booleano.

comment on table public.contatori_commessa is
  'Progressivi per (cliente, tipo). RLS attiva senza policy: deliberatamente irraggiungibile via API, ci accede solo il trigger privato.assegna_numero_intervento().';
