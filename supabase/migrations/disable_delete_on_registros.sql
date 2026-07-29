revoke delete on public.fila_registros from anon, authenticated;

drop policy if exists fila_delete_public on public.fila_registros;
