create extension if not exists pgcrypto;

-- Tabela de empresas
create table if not exists public.companies (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    name text not null,
    logo_url text,
    is_active boolean not null default true,
    max_users integer not null default 5,
    enable_fila boolean not null default true,
    enable_ranking boolean not null default true,
    enable_historico boolean not null default true,
    enable_entregador_portal boolean not null default true,
    allowed_hotzones text[] not null default '{}',
    created_at timestamptz not null default now()
);

create index if not exists companies_slug_idx on public.companies (slug);
create index if not exists companies_is_active_idx on public.companies (is_active);

-- Tabela de usuários analistas por empresa
create table if not exists public.company_users (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    name text not null,
    initials text not null,
    password_hash text not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    unique (company_id, name)
);

create index if not exists company_users_company_id_idx on public.company_users (company_id);
create index if not exists company_users_is_active_idx on public.company_users (is_active);

-- Isolamento por empresa na fila_registros: coluna nullable para não quebrar ALX
alter table public.fila_registros
add column if not exists company_id uuid references public.companies(id) on delete set null;

create index if not exists fila_registros_company_id_idx
    on public.fila_registros (company_id);

grant select, insert, update on public.companies to anon, authenticated;
grant select, insert, update on public.company_users to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
