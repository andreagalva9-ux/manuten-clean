-- Lo spostamento in schema privato di e_ufficio() (migration
-- hardening_schema_privato) ha rotto due funzioni plpgsql che la richiamavano
-- con il vecchio percorso "public.e_ufficio()": a differenza delle policy RLS
-- (che referenziano la funzione per OID e restano valide dopo un
-- ALTER ... SET SCHEMA), il corpo di una funzione plpgsql è testo che viene
-- ri-risolto a ogni chiamata, quindi un nome pienamente qualificato verso lo
-- schema sbagliato va in errore.
create or replace function privato.blocca_cambio_ruolo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.ruolo is distinct from old.ruolo and not privato.e_ufficio() then
    raise exception 'Solo l''ufficio può modificare il ruolo di un utente';
  end if;
  if new.attivo is distinct from old.attivo and not privato.e_ufficio() then
    raise exception 'Solo l''ufficio può attivare o disattivare un utente';
  end if;
  return new;
end;
$$;

create or replace function privato.blocca_soft_delete_non_autorizzato()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is distinct from old.deleted_at
     and not (privato.e_ufficio() or old.compilato_da = auth.uid()) then
    raise exception 'Solo l''ufficio o chi ha compilato il foglio può eliminarlo';
  end if;
  return new;
end;
$$;
