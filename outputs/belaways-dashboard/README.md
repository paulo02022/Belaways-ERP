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
PORT=3000
NODE_ENV=development
```

A chave do Tiny entra em `TINY_API_KEY`. A URL base da API Tiny fica fixa em `backend/src/config/env.ts`.

## Rodar em desenvolvimento

```bash
npm run dev
```

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:3000`
- Health check: `http://127.0.0.1:3000/api/health`

Sem Supabase configurado, o frontend abre uma prévia local para validação visual. A API protegida continua exigindo autenticação.

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

## Produção

```bash
npm run build
npm run start --workspace backend
```

Sirva `frontend/dist` pelo provedor escolhido e aponte `/api` para o backend. Antes do deploy, ajuste os domínios permitidos de CORS em `backend/src/config/security.ts`.
