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

Notas enviadas para `impostoparceiro@romconcept.com` → Power Automate → `POST /api/email/inbound`

Detalhes na Fase 2 do SETUP.md.
