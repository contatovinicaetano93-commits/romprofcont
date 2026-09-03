# romprofcont — Guia de setup (clone do Skip)

Stack: **Next.js + Neon (Postgres)**

Este guia segue a ordem em que você precisa criar cada coisa. Não pule etapas.

---

## Visão geral do que vamos construir

| Módulo | Rota | Função |
|--------|------|--------|
| Login | `/login` | Acesso restrito |
| Dashboard | `/` | KPIs, gráficos, compliance por contabilidade |
| Documentos | `/documentos` | Notas recebidas, status, upload |
| Pendências | `/pendencias` | Obrigações em aberto |
| Contabilidades | `/contabilidades` | Escritórios parceiros |
| Base Mestre | `/base-mestre` | Profissionais + obrigações esperadas |
| Assistente | `/assistente` | Chat/análise (fase 2) |
| API e-mail | `GET /api/cron/sync-email` | Lê IMAP (pastas das contabilidades) e cria documentos |

---

## Fase 1 — Contas e infra (você cria agora)

### 1.1 Neon — banco de dados

1. Acesse [console.neon.tech](https://console.neon.tech)
2. **New Project** → nome: `romprofcont`
3. Região: escolha a mais próxima (ex.: `sa-east-1` se disponível)
4. Copie a **connection string** (modo *pooled* para produção)

Salve no `.env.local`:

```env
DATABASE_URL="postgresql://..."
```

### 1.2 Rodar o schema no Neon

No Neon Console → **SQL Editor** → cole e execute o arquivo:

```
db/001_schema.sql
```

Ou via CLI (depois de configurar `.env.local`):

```bash
npm run db:push
```

### 1.3 Vercel (deploy — pode fazer depois)

1. [vercel.com](https://vercel.com) → Import Git repo `romprofcont`
2. Adicione `DATABASE_URL` nas Environment Variables
3. Deploy automático a cada push

### 1.4 Variáveis de ambiente

Copie `.env.example` → `.env.local` e preencha:

| Variável | Onde obter |
|----------|------------|
| `DATABASE_URL` | Neon Console |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `CRON_SECRET` | Bearer do cron Vercel (`/api/cron/sync-email`) |
| `IMAP_HOST` | `email-ssl.com.br` |
| `IMAP_PORT` | `993` |
| `IMAP_USER` | `impostoparceiro@romconcept.com.br` |
| `IMAP_PASSWORD` | senha da caixa Locaweb |
| `IMAP_MAX_PER_RUN` | teto por execução (padrão 20; o cron tem 60s) |
| `IMAP_RESOLVED_MAILBOX` | pasta destino após processar (padrão `INBOX.Resolvido`) |

---

## Fase 2 — E-mail automático (IMAP Locaweb)

Caixa: **`impostoparceiro@romconcept.com.br`**

O app **não** usa Power Automate nem `POST /api/email/inbound`. O caminho real é IMAP:

1. Configure `IMAP_*` e `CRON_SECRET` na Vercel (Production + Preview)
2. O cron em `vercel.json` chama `GET /api/cron/sync-email` a cada 10 minutos
3. O sync percorre as pastas das contabilidades (`INBOX.Yamada`, `INBOX.Contbell`, …), ignora enviadas/lixo/rascunho/`Resolvido` e processa e-mails ainda não registrados em `email_logs` (lidos ou não)
4. Cada e-mail vira documento(s) em `/documentos`, com a contabilidade da pasta quando o CNPJ não casa na Base Mestre
5. Após sucesso (ou se o `message-id` já estava no banco), a mensagem vai para `INBOX.Resolvido`

Teste local:

```bash
IMAP_MAX_PER_RUN=3 npm run email:sync
```

---

## Fase 3 — Migrar dados do Skip (quando o app estiver rodando)

Com acesso ao Skip original:

1. Exporte **Base Mestre** (profissionais + obrigações) — CSV ou Excel
2. Exporte **Contabilidades**
3. Exporte **Documentos** existentes (se quiser histórico)

Importaremos via script `scripts/import-skip-export.ts` (a criar na Fase 4).

---

## Fase 4 — Desenvolvimento (ordem de implementação)

Marque conforme for concluindo:

- [ ] **4.1** Schema Neon + conexão (`db/`, `src/lib/db.ts`)
- [ ] **4.2** Auth login/sessão (`/login`)
- [ ] **4.3** Layout sidebar (igual Skip)
- [ ] **4.4** CRUD Contabilidades
- [ ] **4.5** CRUD Base Mestre (profissionais + obrigações)
- [ ] **4.6** Upload manual de documentos (XML + PDF)
- [x] **4.7** Organização automática (CNPJ/escritório); aprovação só humana
- [ ] **4.8** Dashboard com KPIs e gráficos
- [ ] **4.9** Pendências (obrigações não recebidas)
- [x] **4.10** Sync IMAP (`/api/cron/sync-email`) — pastas das contabilidades + Resolvido
- [ ] **4.11** Parser XML NF-e + extração PDF
- [ ] **4.12** Assistente IA (opcional, fase 2)
- [ ] **4.13** Conferir cron Vercel + IMAP em produção (pastas → `/documentos`)

---

## Fase 5 — Teste end-to-end

1. Cadastre 1 contabilidade + 1 profissional + 1 obrigação mensal na Base Mestre
2. Coloque um e-mail de teste (DAS/DARF) na pasta da contabilidade em `impostoparceiro@romconcept.com.br`
3. Confirme documento criado em `/documentos` como pendente de aprovação (não aprovado sozinho)
4. Verifique dashboard atualizado

---

## Comandos úteis

```bash
npm run dev          # app local http://localhost:3000
npm run db:push      # aplica schema no Neon
npm run db:studio    # visualizar tabelas (Drizzle Studio)
npm run email:sync   # puxa e-mails IMAP (usa .env.local)
```

---

## Próximo passo imediato

**Agora:** crie o projeto no Neon, copie `DATABASE_URL`, rode `db/001_schema.sql` e me avise quando estiver pronto — seguimos com auth + layout.
