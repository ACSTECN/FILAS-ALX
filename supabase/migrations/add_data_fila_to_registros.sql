alter table public.fila_registros
add column if not exists data_fila date not null default current_date;
