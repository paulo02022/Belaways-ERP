# Belaways Intelligence

Sistema web interno para gestão operacional da Belaways Cosméticos. Ele não é loja, vitrine ou checkout: é uma camada administrativa para centralizar indicadores, estoque, pedidos, alertas, auditoria, logística, usuários e preferências sem substituir Tray, Tiny ou Supabase.

## Stack

- Frontend: React, TypeScript, Vite, TailwindCSS, TanStack Query, React Router, Framer Motion, Recharts e Lucide Icons.
- Backend: Node.js, Express, TypeScript, Helmet, CORS, Rate Limit, Zod, Pino, Supabase e camada isolada para Tiny.
- Banco/Auth: Supabase Database e Supabase Auth.

## Instalação

```bash
npm install
```

## Variáveis de ambiente

Copie `.env.example` para `.env` na raiz do projeto e preencha:

```env
TINY_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
CORS_ORIGINS=
PORT=3000
NODE_ENV=development
```

A chave do Tiny entra em `TINY_API_KEY`. A URL base da API Tiny fica fixa em `backend/src/config/env.ts`.

Use `SUPABASE_URL` como URL base do projeto, por exemplo `https://xxxx.supabase.co`. Se colar com `/rest/v1/`, o projeto normaliza automaticamente.

## Rodar em desenvolvimento

```bash
npm run dev
```

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:3000`
- Health check: `http://127.0.0.1:3000/api/health`

O painel usa autenticacao real via Supabase. Sem Supabase configurado, as rotas protegidas nao carregam dados reais.

## Supabase

1. Crie um projeto no Supabase.
2. Ative Supabase Auth.
3. Execute a migration em `backend/src/database/migrations/001_initial_schema.sql`.
4. Crie perfis na tabela `profiles` para os usuários autenticados.
5. Preencha `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.

## Scripts

```bash
npm run typecheck
npm run lint
npm run build
npm run format
```

## Estrutura

```text
frontend/
  src/api
  src/assets
  src/components
  src/constants
  src/hooks
  src/layouts
  src/lib
  src/pages
  src/services
  src/types

backend/
  src/api
  src/config
  src/constants
  src/controllers
  src/database
  src/lib
  src/middlewares
  src/routes
  src/services
  src/types
  src/utils
```

## Segurança

- Helmet, rate limit, CORS restritivo e `x-powered-by` desativado.
- Entradas sanitizadas e validadas com Zod.
- Endpoints internos protegidos por bearer token/Supabase Auth.
- Autorização por papéis: `admin`, `manager`, `operator`, `viewer`.
- Logs com redaction de tokens, API keys e segredos.
- Respostas de API padronizadas e handler global de exceções.
- Service Role Key nunca é exposta ao frontend.

## Fluxo

1. Usuário autentica pelo Supabase Auth.
2. Frontend envia o token para o backend.
3. Backend valida sessão, perfil e permissão.
4. Controllers chamam services internos.
5. Tiny é consultado apenas pela camada `backend/src/services/tiny`.
6. Supabase armazena perfis, preferências, configurações e auditoria.

## Catálogo rápido e atualização contínua

- A tela de produtos usa paginação no servidor (40 itens por página), busca com debounce e filtros persistidos na URL.
- O navegador recebe somente as colunas necessárias para a página atual; payloads brutos do Tiny ficam no backend.
- Usuários `owner`, `admin` e `manager` consultam atualizações incrementais a cada minuto enquanto o sistema está aberto.
- Alterações salvas no `product_cache` são refletidas pelo Supabase Realtime e há uma releitura leve a cada 30 segundos como contingência.
- O botão **Recarregar catálogo completo** refaz o índice de resumos quando for necessário recuperar uma base muito antiga.

Para habilitar as filas de produto e estoque alterados, instale no Olist Tiny a extensão **API para estoque em tempo real**. Execute também a migration `backend/src/database/migrations/002_catalog_performance_realtime.sql` no Supabase para ativar índices de busca e publicar `product_cache` no Realtime.

## Produção

```bash
npm run build
npm run start --workspace backend
```

Sirva `frontend/dist` pelo provedor escolhido e aponte `/api` para o backend. Antes do deploy, ajuste os domínios permitidos de CORS em `backend/src/config/security.ts`.

## Deploy na Vercel

O projeto ja esta preparado para Vercel com frontend Vite em `frontend/dist` e API Express em `api/index.ts`.

As chamadas `/api/:path*` sao encaminhadas para a funcao unica `api/index.ts`, que restaura o caminho original antes de entregar a requisicao ao Express. Isso inclui rotas aninhadas como `/api/sync/products`, `/api/products/:id` e `/api/orders/:id`.

O frontend usa a chave local de sessao `belaways-erp-auth-v2`. No primeiro acesso depois desta atualizacao, usuarios que ainda possuam um refresh token legado precisam entrar novamente. Imagens de produtos sao carregadas somente por HTTPS a partir de CDNs conhecidas; origens inseguras ou que bloqueiam hotlink usam os fallbacks locais de Cabelo, Perfume e Skincare.

Configuracao do projeto na Vercel:

- Root Directory: raiz do repositorio
- Install Command: `npm install`
- Build Command: `npm run vercel:build`
- Output Directory: `frontend/dist`

Variaveis obrigatorias em Production:

```env
TINY_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
NODE_ENV=production
```

Variavel opcional para dominios extras:

```env
CORS_ORIGINS=https://seu-dominio.com,https://seu-projeto.vercel.app
```

A Vercel injeta `VERCEL_URL` automaticamente, e o backend aceita esse dominio em producao. Para dominio proprio, adicione-o em `CORS_ORIGINS`.
