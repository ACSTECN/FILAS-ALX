# Multitenant Admin & Portal por Empresa - Implementation Plan

## Task 1: Migrations SQL — Tabelas companies, company_users + company_id em fila_registros
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Criar migration `add_multitenant_tables.sql` com:
    1. Tabela `companies` (id uuid PK, slug text unique, name text, logo_url text, is_active boolean default true, max_users integer default 5, enable_fila bool default true, enable_ranking bool default true, enable_historico bool default true, enable_entregador_portal bool default true, allowed_hotzones text[] default '{}', created_at timestamptz default now())
    2. Tabela `company_users` (id uuid PK, company_id uuid FK companies.id cascade delete, name text, initials text, password_hash text, is_active bool default true, created_at default now(); unique(company_id, name))
    3. Adicionar coluna `company_id uuid NULL` em `fila_registros` + FK `companies.id` + índice `fila_registros_company_id_idx`; **DEFAULT NULL** para manter compatibilidade dos dados ALX.
    4. `pgcrypto` confirmado para hash de senha.
  - Criar migration `seed_defaults.sql`:
    - INSERT ... ON CONFLICT da empresa default "ALX" (slug='alx')
    - Cria usuário `platform_admin` (ou via approach separado ver nota)
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4, AC-7, AC-8
- **Test Requirements**:
  - `rule` TR-1.1: Roda migration, `supabase_get_tables(schema=public)` retorna `companies`, `company_users`; `fila_registros` possui coluna `company_id` nullable; nenhum dado existente é apagado
  - `rule` TR-1.2: Dados ALX existentes permanecem com `company_id IS NULL` após migration (contagem pré e pós idêntica)
- **Notes**: NÃO executar UPDATE em `fila_registros` existente. Mantém tudo NULL para sempre como ALX.

## Task 2: Novo usuário admin plataforma + role platform_admin
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Extender `UserRole` em types/auth.ts adicionando `"platform_admin"`
  - Extender tipo `AuthUser` em types/auth.ts para incluir role `platform_admin` (e `companyId?: string` opcional)
  - Criar mecanismo de login admin: credencial via seed + `.env` (VITE_PLATFORM_ADMIN_EMAIL e VITE_PLATFORM_ADMIN_PASSWORD_HASH, ou credencial direta em store com comparação segura temporária para MVP)
  - `authStore.ts` adicionar `loginPlatformAdmin` e `logout` continua valendo
  - Nova chave de storage separada para admin central (evitar colisão sessão ALX)
- **Acceptance Criteria Addressed**: AC-1, AC-7
- **Test Requirements**:
  - `rule` TR-2.1: `tsc` não erra com novas roles
  - `rule` TR-2.2: Credenciais admin corretas → store.user.role === "platform_admin"; credenciais erradas → erro + loginError

## Task 3: Store dedicado Admin (companies + company_users CRUD)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - Criar `src/store/adminStore.ts` (Zustand)
  - Ações: `loadCompanies`, `createCompany`, `updateCompany`, `toggleCompanyActive`, `loadCompanyUsers`, `createCompanyUser`, `updateCompanyUser`, `toggleCompanyUserActive`
  - `createCompany`: validar slug unique antes de enviar; `createCompanyUser`: checar `max_users` estourado (count + 1 <= max)
  - Usar `supabase` diretamente com tabelas novas; manter fallback de erro amigável
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-5
- **Test Requirements**:
  - `rule` TR-3.1: `createCompany({name:"Fox", slug:"fox", ...})` cria registro em `companies`; tentar slug="fox" novamente retorna erro e não duplica
  - `rule` TR-3.2: `createCompanyUser` em empresa max_users=5, 6º usuário retorna erro "Limite de usuários atingido." e não insere
  - `rule` TR-3.3: `toggleCompanyActive(false)` desativa a empresa (slug deixa de responder, ver Task 8)

## Task 4: Novas páginas `/admin-login` e `/admin` (shell/layout)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - Criar `src/pages/AdminLogin.tsx` (estilo igual Login.tsx, logo do sistema + credencial admin)
  - Criar `src/pages/AdminDashboard.tsx` com sidebar ou tabs: "Empresas", "Usuários da empresa selecionada", "Visão geral/KPIs"
  - Criar `src/components/Admin/CompanyForm.tsx` e `Admin/CompanyCard.tsx`
  - Criar `src/components/Admin/CompanyUserForm.tsx` e `Admin/CompanyUserList.tsx`
  - Registrar rotas novas em `App.tsx`: `/admin-login` e `/admin` protegido por role=platform_admin via novo guard
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-9
- **Test Requirements**:
  - `rule` TR-4.1: Acessar `/admin` sem sessão redireciona para `/admin-login`; após login redireciona de volta
  - `rule` TR-4.2: Admin consegue criar empresa Fox via UI, slug=fox; empresa aparece na lista
  - `rubric` TR-4.3: Clareza do dashboard admin; scale 1-5; anchors 1=bagunçado 3=funcional 5=limpo, cards/cabeçalhos e links copy-and-paste; threshold >= 4; evidence = screenshots/navegação

## Task 5: Atualizar types e hotzones para serem per-empresa (catálogo global + allowed list)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 2
- **Description**:
  - Manter `hotzonesByCity` global (fonte da verdade, pois já contém Méier/Madureira)
  - Em `QueueFilters`, `QueueForm`, `HotzoneGrid`, `CitySwitch`: sempre que receberem `allowedHotzones?: Hotzone[]`, filtram as opções
  - Modificar componentes para aceitar prop opcional `allowedHotzones` (default = todas)
  - `QueueStats` também respeita allowed apenas quando informado
- **Acceptance Criteria Addressed**: AC-5, AC-7
- **Test Requirements**:
  - `rule` TR-5.1: Componente `QueueForm` + allowedHotzones=[Mooca, Paulista] não exibe Méier no dropdown hotzone
  - `rule` TR-5.2: Sem allowedHotzones (undefined) todos os hotzones aparecem (ALX continua como antes)

## Task 6: Criação de store scoped por empresa (fila com company_id)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5
- **Description**:
  - Criar `src/store/companyQueueStore.ts` (ou parâmetro em useQueueStore, mas mais seguro factory separada) que filtra TUDO por `companyId`:
    - `loadQueue`: `.eq("company_id", companyId)` (exceto ALX se companyId for null → sem filtro)
    - `createRecord`: injeta `company_id: companyId` no payload (para ALX = null)
    - `assignRecord` e `removeRecord`: apenas em registros cujo company_id corresponda
    - `loadEntregadorQueue`: filtra por cpf E company_id
  - Ranking e Histórico (`AnalystRanking`, `AnalystHistory`) recebem prop opcional `companyId` e aplicam filtro nas queries Supabase
- **Acceptance Criteria Addressed**: AC-4, AC-8
- **Test Requirements**:
  - `rule` TR-6.1: Empresa Fox usa companyQueueStore com companyId=fox.id → `createRecord` grava `company_id = fox.id` em fila_registros; ALX (rotas raiz) continua gravando `company_id = NULL`
  - `rule` TR-6.2: Ranking de Fox contabiliza apenas registros com company_id=fox.id

## Task 7: Autenticação scoped por empresa (`/c/:slug/login`)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 6
- **Description**:
  - Criar `src/store/companyAuthStore.ts` (ou adicionar método em authStore) que:
    1. Dado slug, busca empresa ativa por slug e carrega `company`
    2. Login do analista busca em `company_users` por (company_id, name, password_hash correto via crypt())
    3. Salva sessão com chave `alx-auth-session-${slug}` separada por empresa
  - Criar página `src/pages/CompanyLogin.tsx` em `/c/:slug/login`: mostra logo/nome da empresa, dropdown select dos analistas dela, senha
  - Guard: Se empresa inativa ou não existe → página "Empresa indisponível"
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-7
- **Test Requirements**:
  - `rule` TR-7.1: `/c/empresa-nao-existe/login` renderiza tela de "Empresa não encontrada/indisponível"
  - `rule` TR-7.2: Usuário da Fox loga em `/c/fox/login` com sucesso; mesma senha tentando logar em `/c/outraempresa/login` falha
  - `rule` TR-7.3: Empresa desativada via toggle → login bloqueado com msg clara

## Task 8: Página Home Scoped `/c/:slug/` e Portal Entregador `/c/:slug/entregador`
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 7
- **Description**:
  - Criar `src/pages/CompanyHome.tsx`:
    - Mesmo layout da Home ALX, mas:
      - Usa `companyQueueStore` (filtrado por companyId)
      - Abas "Fila", "Ranking", "Histórico" só aparecem se respectivo `enable_*` for true na empresa
      - `allowedHotzones` injetado em todos os filtros/formulários
      - Saudação personalizada com dados da empresa
  - Criar `src/pages/CompanyEntregador.tsx` (reutiliza página `Entregador.tsx` base, mas filtrada por company_id e com branding da empresa)
  - Registrar rotas aninhadas em `App.tsx` com `/c/:slug/*`:
    - `/c/:slug/login`
    - `/c/:slug/` (protected, usuário analista da empresa logado)
    - `/c/:slug/entregador` (pública, como o entregador atual)
  - Guard de feature: direto acessar aba via URL sem feature habilitada → redireciona
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-6, AC-8, AC-9
- **Test Requirements**:
  - `rule` TR-8.1: Fox com `enable_ranking=false` → aba Ranking não aparece em `/c/fox/`; acessar `/c/fox/#ranking` ou forçar estado interno redireciona para Fila
  - `rule` TR-8.2: Entregador se cadastra em `/c/fox/entregador` → registro com `company_id=fox.id`; não aparece na fila da ALX
  - `rubric` TR-8.3: Clareza visual do branding da empresa; scale 1-5; anchors 1=igual ALX sem distição 3=diferenciado 5=logo/nome visível em toda página; threshold >= 4; evidence = navegação

## Task 9: Integração, rotas e regression ALX intacta
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 8
- **Description**:
  - Atualizar `App.tsx` com todas as rotas novas e guards apropriados
  - Garantir ordem de precedência rotas: `/admin-login`, `/admin`, `/login`, `/`, `/entregador`, `/c/:slug/...` — rotas legadas sempre batem primeiro antes do slug catch-all
  - Nova `ProtectedRoute` aceitando array de roles e/ou company scoped check
  - `ProtectedRoute` existente (rotas raiz) NÃO sofre alteração de comportamento para não quebrar ALX
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-6, AC-7
- **Test Requirements**:
  - `rule` TR-9.1: Todas as rotas existentes da ALX continuam retornando 200 e fluxo idêntico (login ALX, home ALX, entregador ALX) sem warnings/erros em console
  - `rule` TR-9.2: Todas as rotas slug são acessíveis (/c/fox/login, etc.) sem quebrar as raiz
  - `rule` TR-9.3: `npm run check` + `npm run lint` + `npm run test` todos passam

## Task 10: Cards de links úteis por empresa no Admin (facilitar envio para cliente)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 4
- **Description**:
  - Em `CompanyCard.tsx`/detalhe da empresa, exibir 3 botões "Copiar link":
    - Link equipe: `/c/:slug/login`
    - Link equipe direto (após logado): `/c/:slug/`
    - Link entregadores: `/c/:slug/entregador`
  - Botão "Abrir em nova aba" em cada
- **Acceptance Criteria Addressed**: AC-2, AC-9
- **Test Requirements**:
  - `rule` TR-10.1: Ao clicar "Copiar link" o link correto vai para clipboard com sucesso (navigator.clipboard disponível)
  - `rule` TR-10.2: Abrir em nova aba redireciona para a rota slug com sucesso

## Task 11: Seed inicial de empresa ALX no admin (visualização)
- **Status**: `pending`
- **Priority**: low
- **Depends On**: Task 1, Task 4
- **Description**:
  - Admin dashboard lista também a empresa "ALX" cadastrada no seed (slug=alx), apenas visualização
  - NÃO permite editar usuários ALX (bloqueado pois ainda são hardcoded) — card informativo "Fluxo legado hardcoded — 8 usuários"
- **Acceptance Criteria Addressed**: AC-7, AC-9
- **Test Requirements**:
  - `rule` TR-11.1: Card da ALX no lista do admin mostra Dados da Empresa + usuários hardcoded; botão de editar usuários desabilitado com tooltip explicativo
