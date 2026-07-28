-- Un utente che si registra da solo NON deve ottenere subito accesso ai dati.
-- Il ruolo "fidato" viene letto da raw_app_meta_data, che solo la service_role
-- può scrivere: chi passa dal signUp pubblico può manipolare solo user_metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ruolo text;
  v_ruolo_fidato text;
  v_nome text;
  v_primo boolean;
  v_attivo boolean;
begin
  v_primo := not exists (select 1 from public.profiles);

  v_nome := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'nome'), ''),
    split_part(new.email, '@', 1)
  );

  v_ruolo_fidato := nullif(new.raw_app_meta_data ->> 'ruolo', '');
  v_ruolo := coalesce(v_ruolo_fidato, nullif(new.raw_user_meta_data ->> 'ruolo', ''), 'tecnico');
  if v_ruolo not in ('ufficio', 'tecnico') then
    v_ruolo := 'tecnico';
  end if;

  if v_primo then
    -- Bootstrap: il primissimo account dell'installazione è l'ufficio.
    v_ruolo := 'ufficio';
    v_attivo := true;
  else
    -- Attivo solo se creato dall'ufficio tramite service_role.
    v_attivo := v_ruolo_fidato is not null;
  end if;

  insert into public.profiles (id, nome, ruolo, email, attivo)
  values (new.id, v_nome, v_ruolo, new.email, v_attivo)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Un profilo disattivato non deve poter leggere né scrivere nulla.
create or replace function public.e_attivo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and attivo);
$$;

revoke all on function public.e_attivo() from public;
grant execute on function public.e_attivo() to authenticated;

drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (public.e_attivo() or id = auth.uid());

drop policy clients_select on public.clients;
create policy clients_select on public.clients
  for select to authenticated using (public.e_attivo());

drop policy interventi_select on public.interventi;
create policy interventi_select on public.interventi
  for select to authenticated
  using (
    public.e_attivo() and (
      public.e_ufficio()
      or compilato_da = auth.uid()
      or auth.uid() = any (tecnici_ids)
    )
  );

drop policy interventi_insert on public.interventi;
create policy interventi_insert on public.interventi
  for insert to authenticated
  with check (
    public.e_attivo() and (public.e_ufficio() or compilato_da = auth.uid())
  );

drop policy interventi_update on public.interventi;
create policy interventi_update on public.interventi
  for update to authenticated
  using (
    public.e_attivo() and (
      public.e_ufficio()
      or compilato_da = auth.uid()
      or auth.uid() = any (tecnici_ids)
    )
  )
  with check (
    public.e_attivo() and (
      public.e_ufficio()
      or compilato_da = auth.uid()
      or auth.uid() = any (tecnici_ids)
    )
  );

-- Consente alla pagina di registrazione (utente anonimo) di sapere se
-- l'installazione è ancora priva di account, senza esporre alcun dato.
create or replace function public.serve_bootstrap()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from public.profiles);
$$;

revoke all on function public.serve_bootstrap() from public;
grant execute on function public.serve_bootstrap() to anon, authenticated;
