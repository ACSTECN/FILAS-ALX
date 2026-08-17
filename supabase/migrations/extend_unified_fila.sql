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
      and (
        pg_get_constraintdef(pc.oid) ilike '%status%'
        or pg_get_constraintdef(pc.oid) ilike '%origem%'
        or pg_get_constraintdef(pc.oid) ilike '%tipo%'
        or pg_get_constraintdef(pc.oid) ilike '%turno_desejado%'
      )
  loop
    execute format('alter table public.fila_registros drop constraint if exists %I', c.conname);
  end loop;
end $$;

alter table public.fila_registros
add column if not exists origem text not null default 'operacional';

alter table public.fila_registros
add column if not exists tipo text not null default 'FILA';

alter table public.fila_registros
add column if not exists cpf text;

alter table public.fila_registros
add column if not exists entregador_contato text;

alter table public.fila_registros
alter column codigo_pessoa drop not null;

update public.fila_registros
set origem = 'operacional'
where origem is null or origem not in ('operacional', 'entregador');

update public.fila_registros
set tipo = case
  when status ilike '%_tpr' then 'TPR'
  when status ilike '%_entregador' then 'ENTREGADOR'
  else 'FILA'
end
where tipo is null or tipo not in ('FILA', 'TPR', 'ENTREGADOR');

update public.fila_registros
set status = case
  when status = 'na_fila' then 'na_fila_fila'
  when status = 'atribuido' then 'atribuido_fila'
  when status = 'retirado' then 'retirado_fila'
  when status = 'na_fila_tpr' then 'na_fila_tpr'
  when status = 'atribuido_tpr' then 'atribuido_tpr'
  when status = 'retirado_tpr' then 'retirado_tpr'
  else status
end
where status not in (
  'na_fila_fila',
  'na_fila_tpr',
  'na_fila_entregador',
  'atribuido_fila',
  'atribuido_tpr',
  'atribuido_entregador',
  'retirado_fila',
  'retirado_tpr',
  'retirado_entregador'
);

update public.fila_registros
set turno_desejado = 'Ceia'
where turno_desejado = 'Madrugada';

alter table public.fila_registros
add constraint fila_registros_origem_check
check (origem in ('operacional', 'entregador'));

alter table public.fila_registros
add constraint fila_registros_tipo_check
check (tipo in ('FILA', 'TPR', 'ENTREGADOR'));

alter table public.fila_registros
add constraint fila_registros_status_check
check (
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
);

alter table public.fila_registros
add constraint fila_registros_turno_desejado_check
check (turno_desejado in ('Manhã', 'Tarde', 'Noite', 'Ceia', 'Flexível'));

create index if not exists fila_registros_origem_idx
on public.fila_registros (origem);

create index if not exists fila_registros_cpf_idx
on public.fila_registros (cpf);
