-- Assegna il progressivo lato server, dentro la transazione dell'INSERT.
-- L'UPSERT sul contatore prende un row-lock su (client_id, tipo): un secondo
-- inserimento concorrente resta in attesa del commit del primo e riparte dal
-- valore aggiornato, quindi due tecnici non possono mai ricevere lo stesso numero.
create or replace function public.assegna_numero_intervento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero integer;
begin
  insert into public.contatori_commessa as c (client_id, tipo, ultimo_numero)
  values (
    new.client_id,
    new.tipo,
    -- se il contatore non esiste ancora si allinea a eventuali interventi
    -- già presenti (inclusi i soft-deleted), così i numeri non vengono riusati
    coalesce((
      select max(i.numero)
      from public.interventi i
      where i.client_id = new.client_id and i.tipo = new.tipo
    ), 0) + 1
  )
  on conflict (client_id, tipo)
  do update set ultimo_numero = c.ultimo_numero + 1
  returning c.ultimo_numero into v_numero;

  new.numero := v_numero;
  return new;
end;
$$;

create trigger trg_assegna_numero
  before insert on public.interventi
  for each row execute function public.assegna_numero_intervento();

-- Il numero di commessa, il cliente e il tipo sono immutabili dopo la creazione:
-- cambiarli romperebbe la sequenza storica.
create or replace function public.blocca_campi_immutabili()
returns trigger
language plpgsql
as $$
begin
  if new.numero is distinct from old.numero then
    raise exception 'Il numero di commessa non può essere modificato';
  end if;
  if new.client_id is distinct from old.client_id then
    raise exception 'Il cliente di un intervento non può essere modificato';
  end if;
  if new.tipo is distinct from old.tipo then
    raise exception 'Il tipo di commessa non può essere modificato';
  end if;
  if new.compilato_da is distinct from old.compilato_da then
    raise exception 'Il compilatore di un intervento non può essere modificato';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_campi_immutabili
  before update on public.interventi
  for each row execute function public.blocca_campi_immutabili();

-- Profilo creato automaticamente alla registrazione.
-- Il primo profilo in assoluto diventa 'ufficio' (bootstrap iniziale).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ruolo text;
  v_nome text;
begin
  v_nome := coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1));
  v_ruolo := nullif(new.raw_user_meta_data ->> 'ruolo', '');

  if v_ruolo not in ('ufficio', 'tecnico') or v_ruolo is null then
    v_ruolo := 'tecnico';
  end if;

  if not exists (select 1 from public.profiles) then
    v_ruolo := 'ufficio';
  end if;

  insert into public.profiles (id, nome, ruolo, email)
  values (new.id, v_nome, v_ruolo, new.email)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
