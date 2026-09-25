# Multitenant Admin & Portal por Empresa - Product Requirements Document

## Overview
- **Summary**: Transformar o sistema atual (single-tenant ALX) em uma plataforma multi-tenant SaaS, com:
  1. Painel administrador central (dono da plataforma) em rota nova `/admin`
  2. Cadastro de empresas clientes (ex: Fox, ALX) com plano/configuração individual
  3. Portal isolado por empresa via rotas slug `/c/:slug/*`
  4. Portal do entregador também por empresa `/c/:slug/entregador`
  5. NENHUMA quebra no ambiente atual da ALX — rotas raiz `/login`, `/`, `/entregador` continuam funcionando 100% para a equipe ALX como estão hoje.
- **Purpose**: Permitir vender e terceirizar o sistema para outras empresas com total isolamento de dados e configurações.
- **Target Users**:
  - **Plataforma Admin (dono)** — gerencia empresas, usuários, permissões, planos.
  - **Empresa (ex: ALX, Fox)** — usuários operacionais (analistas), entregadores.

## Goals
- Criar acesso administrativo exclusivo do dono da plataforma em `/admin`
- Cadastrar empresas: nome, slug único, logo, status (ativo/inativo), limite de usuários, hotzones permitidas, features habilitadas
- Cadastrar funcionários/analistas por empresa no banco (empresas novas)
- Garantir isolamento de dados: cada empresa só vê seus próprios `fila_registros`, ranking e histórico
- Links diferenciados por empresa: ex `https://site/c/fox/login`, `https://site/c/fox/`, `https://site/c/fox/entregador`
- ALX continua com fluxo legado intocado: login e usuários via `ANALYST_USERS` hardcoded, dados legado com `company_id = NULL`
- Portal do entregador também por empresa, para cada cliente ter seu link próprio

## Non-Goals
- **Não** migrar a equipe ALX para banco (permanecem no `ANALYST_USERS` hardcoded)
- **Não** alterar registros existentes nem a estrutura legada de login
- **Não** criar subdomínios dinâmicos nem wildcard DNS nesta fase
- **Não** implementar billing/cobrança automática nesta fase
- **Não** reestilizar a UI da ALX ou das empresas no primeiro momento (reutilizar componentes existentes)

## Background & Context
- Sistema atual em React + TypeScript + Supabase, com autenticação local (Zustand + localStorage)
- Usuários analistas atualmente hardcoded em `ANALYST_USERS` (types/auth.ts)
- Tabela `fila_registros` em `public` sem isolamento de empresa
- Produção ativa: ALX usa diariamente — mudanças devem ser backward compatible
- Usuário explicitou: "Não posso quebrar, não posso perder"
- Praças recém adicionadas Méier/Madureira, migração `extend_hotzone_values.sql` no repo

## Functional Requirements

### Painel Administrador (`/admin`)
- **FR-1**: Login do admin central com credenciais fixas (e-mail/senha) em `/admin`, role `platform_admin`
- **FR-2**: CRUD de empresas (Cadastrar / Editar / Listar / Ativar-Inativar)
  - Campos: Nome, Slug (único, URL friendly), Logo (URL opcional), Status ativo/inativo
  - Configurações do plano: Limite de usuários
  - Features toggleáveis por empresa (boolean): `enable_fila`, `enable_ranking`, `enable_historico`, `enable_entregador_portal`
  - Hotzones permitidas por empresa (multi-select do catálogo global de hotzones)
- **FR-3**: CRUD de usuários analistas por empresa (só empresas NÃO-ALX, que não usam hardcoded)
  - Nome, Iniciais, Senha (hash), Empresa vinculada, Status ativo/inativo
  - Respeita limite de usuários da empresa
- **FR-4**: Detalhe da empresa: mostra contagem de usuários, plano, features, hotzones, links diretos do portal da empresa (`/c/:slug/login`, `/c/:slug/entregador`)
- **FR-5**: Logout do admin

### Portal por Empresa (`/c/:slug/*`)
- **FR-6**: Tela de login `/c/:slug/login` com identidade visual da empresa (logo, nome)
- **FR-7**: Painel home `/c/:slug/` protegido — usuário logado só vê sua empresa
- **FR-8**: Abas (Fila / Ranking / Histórico) respeitam as features desativadas na empresa (aba some se desligada)
- **FR-9**: Filtros de hotzone só mostram as hotzones PERMITIDAS da empresa
- **FR-10**: Isolamento de dados: todas as queries (fila, ranking, histórico, create/update/remove) filtram por `company_id`
- **FR-11**: Portal do entregador `/c/:slug/entregador` com identidade da empresa, registros vinculados ao `company_id`

### Compatibilidade Legado (ALX)
- **FR-12**: Rotas raiz `/login`, `/`, `/entregador` permanecem idênticas e sem slug
- **FR-13**: `ANALYST_USERS` continua fonte de login para a ALX (fluxo legado intocado)
- **FR-14**: Dados existentes da ALX permanecem com `company_id = NULL`; queries legados continuam funcionando sem filtro
- **FR-15**: Nova coluna `company_id` em `fila_registros` é **nullable + default NULL** para manter compatibilidade

### Geral
- **FR-16**: Slug é único, validado no cadastro e em todas as rotas `/c/:slug` (empresa inativa retorna página de indisponibilidade)
- **FR-17**: Sessões são separadas por empresa por chave de storage baseada no slug
- **FR-18**: Empresa ALX registrada como empresa default no banco (via seed SQL, sem afetar dados legado)

## Non-Functional Requirements
- **NFR-1**: Backward Compatibilidade — nenhum comportamento anterior quebrado; rollout zero-downtime
- **NFR-2**: Isolamento de dados — nenhuma consulta retorna dados de outra empresa
- **NFR-3**: Segurança — senhas de admin plataformas e de usuários de empresas armazenadas com hash (bcrypt via Supabase Auth ou crypt manual via extension pgcrypto)
- **NFR-4**: Desempenho — índices em `company_id` nas tabelas envolvidas; queries com filtro de empresa sempre usam índice
- **NFR-5**: Observabilidade — erros das rotas slug mantém o mesmo feedback visual da ALX sem expor detalhes internos
- **NFR-6**: Paridade visual — todas as páginas de empresa reaproveitam 100% dos componentes existentes (mesmo design)

## Constraints
- **Technical**:
  - Mesmo Supabase, mesmo deploy Vercel, mesmo repositório
  - React Router com rotas aninhadas `/c/:slug`
  - Zustand stores existentes devem receber contexto de empresa (ou criar stores dedicadas para empresas novas)
- **Business**:
  - ALX NUNCA pode parar de funcionar
  - Dados históricos da ALX permanecem preservados, sem perda e sem duplicação

## Dependencies
- `pgcrypto` extension no Supabase (já existe — usado para `gen_random_uuid`)
- Supabase migrations novas para criação das tabelas `companies`, `company_users`, coluna `company_id` em `fila_registros`
- Seeds SQL: registrar empresa "ALX" default, usuário admin plataforma

## Assumptions
- Admin central tem credencial única, gerenciada via seed SQL e/ou variável de ambiente (não há tela de primeiro acesso)
- Empresas não se auto-cadastram; tudo é feito pelo admin central
- "Limite de usuários" conta apenas usuários criados no banco por empresa, não a equipe ALX hardcoded
- Hotzones globais permanecem centralizadas em `hotzones.ts`; por empresa só definimos permissão (quais são visíveis)
- Portal entregador continua com CPF auto-cadastro sem senha; a distinção é a empresa via contexto da URL `/c/:slug/entregador`

## Acceptance Criteria

### AC-1: Rota `/admin` acessível somente com credencial platform_admin
- **Type**: `rule`
- **Given**: URL do app `/admin`
- **When**: Usuário não logado como platform_admin acessa `/admin`
- **Then**: É redirecionado para `/admin-login` (tela de login admin)
- **Pass Condition**: `ProtectedRoute` admin bloqueia acesso sem role=platform_admin; login correto leva ao dashboard admin
- **Evidence**: Navegador visitando `/admin` antes e depois do login admin

### AC-2: CRUD de empresas cria slug único e disponibiliza links `/c/:slug/*`
- **Type**: `rule`
- **Given**: Painel admin logado, tela "Nova Empresa"
- **When**: Cadastra empresa "Fox" com slug "fox", ativa, habilita fila + entregador, define hotzones SP e limite 5 usuários
- **Then**: URLs `/c/fox/login`, `/c/fox/`, `/c/fox/entregador` retornam páginas corretas; tentar slug duplicado retorna erro de validação
- **Pass Condition**: Tabela `companies` contém o registro; rotas slug respondem; duplicata bloqueada
- **Evidence**: Supabase table editor + rotas slug no browser

### AC-3: Usuário analista criado para empresa Fox só acessa portal Fox
- **Type**: `rule`
- **Given**: Usuário "Ana" cadastrada no banco em company_users, vinculada à Fox (slug=fox)
- **When**: Ana faz login em `/c/fox/login` com suas credenciais e, em seguida, tenta acessar `/c/alx/home`
- **Then**: Ana acessa `/c/fox/home` com sucesso; acesso a outra slug é negado e deslogado
- **Pass Condition**: Autenticação slug-scoped; auth só valida usuários da empresa correta; cross-empresa bloqueado
- **Evidence**: Dois testes em navegador separado (sessão Fox e tentativa ALX)

### AC-4: Isolamento de dados por empresa em fila_registros
- **Type**: `rule`
- **Given**: Fox cria registro na fila; ALX continua usando rotas raiz
- **When**: Fox consulta a fila em `/c/fox/`; ALX consulta a fila em `/`
- **Then**: Fox só vê registros de `company_id = fox.id`; ALX continua vendo seus `company_id = NULL` sem problemas
- **Pass Condition**: `loadQueue`, `createRecord`, ranking e histórico filtram por `company_id` para fluxos slug; queries legados permanecem sem filtro
- **Evidence**: Duas sessões lado-a-lado + tabela fila_registros SQL com filtro company_id

### AC-5: Limite de usuários e hotzones permitidas são respeitados
- **Type**: `rule`
- **Given**: Fox com limite 5 usuários e hotzones permitidas = {Mooca, Paulista}
- **When**: Tenta cadastrar 6º usuário em Fox; tenta selecionar "Méier" (fora da lista) no formulário de fila
- **Then**: 6º usuário é bloqueado com mensagem de limite excedido; formulário de fila não exibe Méier como opção
- **Pass Condition**: Validação no create do company_user; dropdown hotzones só exibe permitidas
- **Evidence**: Tela admin + tela de formulário fila da empresa

### AC-6: Features desativadas somem do portal da empresa
- **Type**: `rule`
- **Given**: Fox com `enable_ranking = false`, `enable_historico = false`
- **When**: Usuário Fox loga em `/c/fox/`
- **Then**: Abas Ranking e Histórico não aparecem; acessar manualmente via URL é bloqueado por redirecionamento
- **Pass Condition**: Abas condicionais + guard de rota no carregamento de `/c/:slug/`
- **Evidence**: Navegação na UI e tentativa direta por URL

### AC-7: ALX em produção NÃO é impactada
- **Type**: `rule`
- **Given**: Equipe ALX já usando o sistema em produção, com login em `/login` e rotas `/` e `/entregador`
- **When**: Deploy da nova versão é feito
- **Then**: Tudo funciona exatamente como antes: analistas logam via ANALYST_USERS, a fila carrega, ranking, histórico e portal entregador sem mudanças visíveis; nenhum registro existente some ou é reatribuído
- **Pass Condition**: Nenhum comportamento visual ou funcional diferente do atual para a ALX; todos os testes existentes do projeto passam
- **Evidence**: `npm run check`, `npm run lint`, `npm run test` + navegação nas rotas raiz

### AC-8: Portal do entregador por empresa registra no company_id correto
- **Type**: `rule`
- **Given**: Entregador acessa `/c/fox/entregador` e outro entrega `/c/alx/entregador`
- **When**: Ambos se cadastram na fila
- **Then**: Cada registro tem `company_id` da sua respectiva empresa (ou NULL para ALX caso permaneça compat legado); fila de Fox não mostra entregador ALX e vice-versa
- **Pass Condition**: createRecord em `/c/:slug/entregador` injeta company_id do slug; ALX continua NULL
- **Evidence**: Tabela fila_registros no SQL Editor

### AC-9: Qualidade de isolamento e clareza do admin
- **Type**: `rubric`
- **Dimension**: Organização e clareza do painel admin + portal por empresa
- **Scale**: 1-5
- **Anchors**:
  - 1 = Tudo confuso, sem separação clara, links quebrados
  - 3 = Funciona, mas separação visual e campos faltam clareza
  - 5 = Layout limpo, cards separados, links da empresa são copia-e-cola fáceis, abas desativadas somem naturalmente, cada tela deixa claro a que empresa pertence
- **Pass Threshold**: >= 4
- **Evidence**: Inspeção visual no navegador das páginas `/admin`, `/c/fox/login`, `/c/fox/`

## Open Questions
- [ ] Senha do admin central: qual credencial deseja usar? (Ex: email+senha, ou vamos deixar via `VITE_PLATFORM_ADMIN_EMAIL` + hash no `.env`?) — default será uma credencial via seed SQL ajustável depois.
- [ ] Empresa ALX deve ser criada no banco com slug="alx" e seus dados históricos migrados de `company_id=NULL` para `company_id=alx`? Ou manter `company_id=NULL` para sempre como compat? — default sugerido: MANTER NULL e rotas raiz sempre mapearem NULL = ALX (zero risco)
