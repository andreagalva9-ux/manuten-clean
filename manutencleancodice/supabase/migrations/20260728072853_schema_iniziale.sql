create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ============ profiles ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  ruolo text not null check (ruolo in ('ufficio', 'tecnico')),
  email text,
  attivo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ clients ============
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  indirizzo text,
  note text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index clients_nome_idx on public.clients using gin (nome gin_trgm_ops);
create index clients_attivi_idx on public.clients (nome) where deleted_at is null;

-- ============ interventi ============
create table public.interventi (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  tipo text not null check (tipo in (
    'Pulizie uffici',
    'Sanificazioni e disinfezioni',
    'Sanificazione asili nido',
    'Manutenzione aree verdi',
    'Derattizzazione e disinfestazione',
    'Pulizie industriali',
    'Pulizie vetri',
    'Pulizie condomini',
    'Pulizia pannelli fotovoltaici',
    'Pulizie negozi e attività commerciali',
    'Pulizie ambienti alimentari (HACCP)',
    'Pulizie di fine cantiere',
    'Posa prato sintetico',
    'Altro'
  )),
  numero integer not null,
  data date not null,
  ore numeric(6,2) check (ore is null or ore >= 0),
  lavoro_svolto text not null,
  note text,
  tecnici_ids uuid[] not null default '{}',
  compilato_da uuid not null references public.profiles(id),
  firma_tecnico_svg text,
  firma_cliente_svg text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, tipo, numero)
);
create index interventi_client_idx on public.interventi (client_id);
create index interventi_tipo_idx on public.interventi (tipo);
create index interventi_data_idx on public.interventi (data desc, created_at desc);
create index interventi_compilato_da_idx on public.interventi (compilato_da);
create index interventi_tecnici_idx on public.interventi using gin (tecnici_ids);
create index interventi_lavoro_idx on public.interventi using gin (lavoro_svolto gin_trgm_ops);

-- ============ contatori progressivi ============
-- Una riga per (client_id, tipo). L'incremento avviene sotto row-lock:
-- due insert concorrenti si serializzano e non possono mai ottenere lo stesso numero.
-- Il contatore non viene mai decrementato: i numeri assegnati restano storicamente unici
-- anche dopo un soft delete.
create table public.contatori_commessa (
  client_id uuid not null references public.clients(id) on delete cascade,
  tipo text not null,
  ultimo_numero integer not null default 0,
  primary key (client_id, tipo)
);
