-- Helper security definer: legge il ruolo senza innescare ricorsione nelle policy su profiles.
create or replace function public.e_ufficio()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and ruolo = 'ufficio' and attivo
  );
$$;

create or replace function public.ruolo_corrente()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select ruolo from public.profiles where id = auth.uid();
$$;

revoke all on function public.e_ufficio() from public;
revoke all on function public.ruolo_corrente() from public;
grant execute on function public.e_ufficio() to authenticated;
grant execute on function public.ruolo_corrente() to authenticated;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.interventi enable row level security;
alter table public.contatori_commessa enable row level security;

-- ---------- profiles ----------
-- Tutti gli utenti autenticati leggono l'elenco (serve per assegnare i tecnici
-- e per mostrare i nomi nei fogli). Solo l'ufficio crea/elimina.
create policy profiles_select on public.profiles
  for select to authenticated using (true);

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (public.e_ufficio() or id = auth.uid());

create policy profiles_update on public.profiles
  for update to authenticated
  using (public.e_ufficio() or id = auth.uid())
  with check (public.e_ufficio() or id = auth.uid());

create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.e_ufficio() and id <> auth.uid());

-- Un tecnico può aggiornare il proprio profilo ma non promuoversi a ufficio.
create or replace function public.blocca_cambio_ruolo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.ruolo is distinct from old.ruolo and not public.e_ufficio() then
    raise exception 'Solo l''ufficio può modificare il ruolo di un utente';
  end if;
  if new.attivo is distinct from old.attivo and not public.e_ufficio() then
    raise exception 'Solo l''ufficio può attivare o disattivare un utente';
  end if;
  return new;
end;
$$;

create trigger trg_blocca_cambio_ruolo
  before update on public.profiles
  for each row execute function public.blocca_cambio_ruolo();

-- ---------- clients ----------
create policy clients_select on public.clients
  for select to authenticated using (true);

create policy clients_insert on public.clients
  for insert to authenticated with check (public.e_ufficio());

create policy clients_update on public.clients
  for update to authenticated
  using (public.e_ufficio()) with check (public.e_ufficio());

create policy clients_delete on public.clients
  for delete to authenticated using (public.e_ufficio());

-- ---------- interventi ----------
-- L'ufficio vede tutto; il tecnico solo ciò che ha compilato o a cui è assegnato.
create policy interventi_select on public.interventi
  for select to authenticated
  using (
    public.e_ufficio()
    or compilato_da = auth.uid()
    or auth.uid() = any (tecnici_ids)
  );

create policy interventi_insert on public.interventi
  for insert to authenticated
  with check (public.e_ufficio() or compilato_da = auth.uid());

create policy interventi_update on public.interventi
  for update to authenticated
  using (
    public.e_ufficio()
    or compilato_da = auth.uid()
    or auth.uid() = any (tecnici_ids)
  )
  with check (
    public.e_ufficio()
    or compilato_da = auth.uid()
    or auth.uid() = any (tecnici_ids)
  );

-- Nessuna policy DELETE: la cancellazione è sempre logica (deleted_at).

-- Solo l'ufficio o il compilatore originale possono archiviare un foglio.
create or replace function public.blocca_soft_delete_non_autorizzato()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is distinct from old.deleted_at
     and not (public.e_ufficio() or old.compilato_da = auth.uid()) then
    raise exception 'Solo l''ufficio o chi ha compilato il foglio può eliminarlo';
  end if;
  return new;
end;
$$;

create trigger trg_soft_delete_autorizzato
  before update on public.interventi
  for each row execute function public.blocca_soft_delete_non_autorizzato();

-- ---------- contatori ----------
-- Nessuna policy: la tabella è raggiungibile solo dal trigger security definer.
revoke all on public.contatori_commessa from anon, authenticated;
