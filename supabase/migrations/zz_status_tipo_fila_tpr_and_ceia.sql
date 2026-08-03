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

  update public.fila_registros
  set status =
    case status
      when 'na_fila' then 'na_fila_fila'
      when 'atribuido' then 'atribuido_fila'
      when 'retirado' then 'retirado_fila'
      else status
    end;

  alter table public.fila_registros
    alter column status set default 'na_fila_fila';

  alter table public.fila_registros
  add constraint fila_registros_status_check
  check (
    status in (
      'na_fila_fila',
      'na_fila_tpr',
      'atribuido_fila',
      'atribuido_tpr',
      'retirado_fila',
      'retirado_tpr'
    )
  );

  for c in
    select conname
    from pg_constraint pc
    join pg_class t on t.oid = pc.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'fila_registros'
      and pc.contype = 'c'
      and pg_get_constraintdef(pc.oid) ilike '%turno_desejado%'
  loop
    execute format('alter table public.fila_registros drop constraint %I', c.conname);
  end loop;

  update public.fila_registros
  set turno_desejado = 'Ceia'
  where turno_desejado = 'Madrugada';

  alter table public.fila_registros
  add constraint fila_registros_turno_desejado_check
  check (turno_desejado in ('Manhã', 'Tarde', 'Noite', 'Ceia', 'Flexível'));
end $$;
