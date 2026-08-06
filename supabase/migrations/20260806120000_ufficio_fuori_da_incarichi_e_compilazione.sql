-- L'ufficio esce dalla pianificazione e dalla compilazione dei fogli.
-- Restano suoi: archivio, anagrafiche, utenti e l'annullamento dei fogli.
--
-- Da applicare quando il codice corrispondente è in produzione: prima di
-- allora l'app mostrerebbe voci e pulsanti che il database rifiuta.

-- Lettura incarichi: pianificatore e supervisore per intero, il tecnico solo
-- i propri. Corregge anche un'omissione precedente: il pianificatore non era
-- nell'elenco, quindi gestiva incarichi che non riusciva a leggere.
drop policy if exists incarichi_select on public.incarichi;
create policy incarichi_select on public.incarichi
  for select to authenticated
  using (
    privato.e_pianificatore()
    or privato.e_supervisore()
    or tecnico_id = auth.uid()
  );

-- Creazione fogli: solo il tecnico, e solo a proprio nome.
drop policy if exists interventi_insert on public.interventi;
create policy interventi_insert on public.interventi
  for insert to authenticated
  with check (
    compilato_da = auth.uid()
    and not privato.e_ufficio()
    and not privato.e_supervisore()
    and not privato.e_pianificatore()
  );
