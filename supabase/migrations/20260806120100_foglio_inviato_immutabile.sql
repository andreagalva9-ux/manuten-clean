-- Un foglio inviato definitivamente non è più modificabile da nessuno,
-- ufficio compreso: è stato firmato dal cliente e vale come il modulo
-- cartaceo già consegnato.
--
-- L'unica via d'uscita per un foglio sbagliato è l'annullamento
-- (deleted_at), che resta all'ufficio e lascia traccia: il numero di
-- commessa non torna disponibile e il PDF riporta l'annullamento.
--
-- Il controllo sta qui e non solo nelle policy perché è una regola sul
-- *cosa* si può cambiare, non sul *chi*: l'ufficio deve poter continuare a
-- scrivere sulla riga per annullarla, ma non per riscriverne il contenuto.

create or replace function privato.blocca_modifica_foglio_inviato()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Finché il foglio è una bozza valgono le regole ordinarie.
  if old.finalizzato_at is null then
    return new;
  end if;

  if new.finalizzato_at is distinct from old.finalizzato_at then
    raise exception
      'Un foglio inviato definitivamente non può essere riaperto.';
  end if;

  if (
    new.client_id, new.tipo, new.numero, new.compilato_da, new.data, new.ore,
    new.lavoro_svolto, new.note, new.persona_contatto,
    new.materiali_installati, new.aree_intervento, new.tecnici_ids,
    new.firma_tecnico_svg, new.firma_cliente_svg
  ) is distinct from (
    old.client_id, old.tipo, old.numero, old.compilato_da, old.data, old.ore,
    old.lavoro_svolto, old.note, old.persona_contatto,
    old.materiali_installati, old.aree_intervento, old.tecnici_ids,
    old.firma_tecnico_svg, old.firma_cliente_svg
  ) then
    raise exception
      'Un foglio inviato definitivamente non è modificabile: annullalo e compilane uno nuovo.';
  end if;

  -- Resta consentito solo il cambio di deleted_at (annullamento e ripristino).
  return new;
end;
$$;

drop trigger if exists trg_foglio_inviato_immutabile on public.interventi;
create trigger trg_foglio_inviato_immutabile
  before update on public.interventi
  for each row
  execute function privato.blocca_modifica_foglio_inviato();
