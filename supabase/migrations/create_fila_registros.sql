create extension if not exists pgcrypto;

create table if not exists public.fila_registros (
    id uuid primary key default gen_random_uuid(),
    codigo_pessoa text not null,
    nome text not null,
    cidade text not null check (cidade in ('Rio de Janeiro', 'São Paulo')),
    hotzone text not null check (
        hotzone in (
            'Bangu',
            'Santa Cruz',
            'Tijuca',
            'Nilópolis',
            'Zona Sul',
            'Mooca',
            'Paulista',
            'Santo Amaro'
        )
    ),
    turno_desejado text not null check (
        turno_desejado in ('Manhã', 'Tarde', 'Noite', 'Madrugada', 'Flexível')
    ),
    criado_em timestamptz not null default now()
);

create index if not exists fila_registros_criado_em_idx
    on public.fila_registros (criado_em asc);

create index if not exists fila_registros_cidade_hotzone_idx
    on public.fila_registros (cidade, hotzone);

alter table public.fila_registros enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, delete on public.fila_registros to anon, authenticated;

drop policy if exists fila_select_public on public.fila_registros;
create policy fila_select_public
on public.fila_registros
for select
to anon, authenticated
using (true);

drop policy if exists fila_insert_public on public.fila_registros;
create policy fila_insert_public
on public.fila_registros
for insert
to anon, authenticated
with check (true);

drop policy if exists fila_delete_public on public.fila_registros;
create policy fila_delete_public
on public.fila_registros
for delete
to anon, authenticated
using (true);

alter publication supabase_realtime add table public.fila_registros;
