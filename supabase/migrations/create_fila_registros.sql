create extension if not exists pgcrypto;

create table if not exists public.fila_registros (
    id uuid primary key default gen_random_uuid(),
    origem text not null default 'operacional' check (origem in ('operacional', 'entregador')),
    tipo text not null default 'FILA' check (tipo in ('FILA', 'TPR', 'ENTREGADOR')),
    codigo_pessoa text,
    cpf text,
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
        turno_desejado in ('Manhã', 'Tarde', 'Noite', 'Ceia', 'Flexível')
    ),
    data_fila date not null default current_date,
    status text not null default 'na_fila_fila' check (
        status in (
            'na_fila_fila',
            'na_fila_tpr',
            'na_fila_entregador',
            'atribuido_fila',
            'atribuido_tpr',
            'atribuido_entregador',
            'retirado_fila',
            'retirado_tpr',
            'retirado_entregador'
        )
    ),
    analista text,
    entregador_contato text,
    criado_em timestamptz not null default now()
);

create index if not exists fila_registros_criado_em_idx
    on public.fila_registros (criado_em asc);

create index if not exists fila_registros_cidade_hotzone_idx
    on public.fila_registros (cidade, hotzone);

create index if not exists fila_registros_status_idx
    on public.fila_registros (status);

create index if not exists fila_registros_origem_idx
    on public.fila_registros (origem);

create index if not exists fila_registros_cpf_idx
    on public.fila_registros (cpf);

alter table public.fila_registros enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.fila_registros to anon, authenticated;

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

drop policy if exists fila_update_public on public.fila_registros;
create policy fila_update_public
on public.fila_registros
for update
to anon, authenticated
using (true)
with check (true);

alter publication supabase_realtime add table public.fila_registros;
