grant update on public.fila_registros to anon, authenticated;

drop policy if exists fila_update_public on public.fila_registros;
create policy fila_update_public
on public.fila_registros
for update
to anon, authenticated
using (true)
with check (true);
