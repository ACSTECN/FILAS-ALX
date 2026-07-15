import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("migration cria a tabela de fila", async () => {
  const sql = await readFile("supabase/migrations/create_fila_registros.sql", "utf8");

  assert.match(sql, /create table if not exists public\.fila_registros/i);
  assert.match(sql, /create policy fila_insert_public/i);
  assert.match(sql, /alter publication supabase_realtime add table public\.fila_registros/i);
});

test("README documenta variaveis da Vercel e do Supabase", async () => {
  const readme = await readFile("README.md", "utf8");

  assert.match(readme, /VITE_SUPABASE_URL/);
  assert.match(readme, /VITE_SUPABASE_ANON_KEY/);
  assert.match(readme, /Vercel/);
});

test("pagina principal possui identidade da ALX Entregas", async () => {
  const homePage = await readFile("src/pages/Home.tsx", "utf8");

  assert.match(homePage, /ALX Entregas ao vivo/);
  assert.match(homePage, /Fila operacional por hotzone/);
  assert.match(homePage, /Modo local ativo/);
});
