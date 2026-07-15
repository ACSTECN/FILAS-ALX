# ALX Entregas

Aplicacao web para fila de espera por hotzone com foco operacional. O projeto foi preparado para funcionar de duas formas:

- com Supabase, usando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- em modo local, usando `localStorage`, para continuar testando sem backend conectado

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- Zustand
- Supabase JS
- Vercel

## Rodando localmente

1. Instale as dependencias:

```bash
npm install
```

2. Crie um `.env` a partir do `.env.example`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

3. Rode o projeto:

```bash
npm run dev
```

## Banco no Supabase

A migration principal esta em:

- `supabase/migrations/create_fila_registros.sql`

Ela cria a tabela `fila_registros`, indices, RLS e libera `select`, `insert` e `delete` para `anon` e `authenticated`.

## Scripts

```bash
npm run dev
npm run check
npm run test
npm run build
```

## Deploy

1. Faça push para o GitHub
2. Importe o repositório na Vercel
3. Configure as variaveis:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy
