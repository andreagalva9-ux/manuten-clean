-- Campi presenti nel modulo cartaceo attualmente in uso, generici a tutti i
-- tipi di commessa (non solo derattizzazione): facoltativi, non incidono sulla
-- numerazione né sulle policy esistenti.
alter table public.interventi
  add column persona_contatto text,
  add column materiali_installati text,
  add column aree_intervento text;
