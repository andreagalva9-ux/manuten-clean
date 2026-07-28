-- Solo anteprima per il form: non prende lock e non consuma il progressivo.
-- Il numero definitivo resta quello assegnato dal trigger in fase di INSERT.
create or replace function public.anteprima_numero(p_client_id uuid, p_tipo text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    coalesce((
      select c.ultimo_numero
      from public.contatori_commessa c
      where c.client_id = p_client_id and c.tipo = p_tipo
    ), 0),
    coalesce((
      select max(i.numero)
      from public.interventi i
      where i.client_id = p_client_id and i.tipo = p_tipo
    ), 0)
  ) + 1;
$$;

revoke all on function public.anteprima_numero(uuid, text) from public;
grant execute on function public.anteprima_numero(uuid, text) to authenticated;
