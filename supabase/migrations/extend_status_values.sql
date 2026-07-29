do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint pc
    join pg_class t on t.oid = pc.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'fila_registros'
      and pc.contype = 'c'
      and pg_get_constraintdef(pc.oid) ilike '%status%'
  loop
    execute format('alter table public.fila_registros drop constraint %I', c.conname);
  end loop;

  alter table public.fila_registros
  add constraint fila_registros_status_check
  check (status in ('na_fila', 'atribuido', 'retirado'));
end $$;
