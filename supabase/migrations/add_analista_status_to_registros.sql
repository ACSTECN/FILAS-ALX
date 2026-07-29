alter table public.fila_registros
add column if not exists status text not null default 'na_fila' check (status in ('na_fila', 'atribuido'));

alter table public.fila_registros
add column if not exists analista text;

create index if not exists fila_registros_status_idx
on public.fila_registros (status);
