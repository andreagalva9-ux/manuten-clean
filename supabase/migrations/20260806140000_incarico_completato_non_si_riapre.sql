-- Un incarico completato non torna indietro, per nessuno.
--
-- La chiusura arriva quasi sempre da sola, quando il tecnico invia
-- definitivamente il foglio di lavoro; per i lavori senza foglio la mette
-- il tecnico con la spunta. In entrambi i casi è un fatto avvenuto, non
-- uno stato da correggere: se l'incarico era sbagliato, il pianificatore
-- lo elimina e ne crea uno nuovo.
--
-- Volutamente non c'è eccezione per profondità di trigger: nessuna
-- automazione ha motivo di riaprire un incarico.

create or replace function privato.blocca_riapertura_incarico()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.completato_at is not null and new.completato_at is null then
    raise exception
      'Un incarico completato non può essere riaperto: eliminalo e ricrealo.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_blocca_riapertura_incarico on public.incarichi;
create trigger trg_blocca_riapertura_incarico
  before update on public.incarichi
  for each row
  execute function privato.blocca_riapertura_incarico();
