# romprofcont

Clone do sistema Skip **Controle de fiscal e contabil parceiros/profissionais**.

**Stack:** Next.js 16 + Neon (Postgres) + Drizzle

## Começar

1. Leia o guia completo: [`docs/SETUP.md`](docs/SETUP.md)
2. Copie `.env.example` → `.env.local`
3. Crie o banco no [Neon](https://console.neon.tech) e rode `db/001_schema.sql`
4. `npm run dev` → http://localhost:3000

## Estrutura

```
src/app/(dashboard)/   # telas do sistema
src/db/schema.ts       # schema Drizzle
src/lib/db.ts          # conexão Neon
db/001_schema.sql      # SQL para rodar no Neon
docs/SETUP.md          # passo a passo do clone
```

## Integração e-mail

Caixa Locaweb `impostoparceiro@romconcept.com.br` → cron Vercel `GET /api/cron/sync-email` (IMAP, a cada 10 min).

O sync lê as pastas das contabilidades (não só a INBOX), cria documentos em `/documentos` e move o e-mail processado para `INBOX.Resolvido`.

Detalhes na Fase 2 do [`docs/SETUP.md`](docs/SETUP.md).
