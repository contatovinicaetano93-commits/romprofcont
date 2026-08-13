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
| API e-mail | `POST /api/email/inbound` | Recebe notas de `impostoparceiro@romconcept.com` |

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
| `INBOUND_EMAIL_SECRET` | string longa que você inventa (Power Automate usa isso) |

---

## Fase 2 — E-mail automático (Microsoft 365)

Caixa: **`impostoparceiro@romconcept.com`**

### Opção recomendada: Power Automate

1. [make.powerautomate.com](https://make.powerautomate.com)
2. **Create** → **Automated cloud flow**
3. Trigger: **When a new email arrives (V3)** — Outlook
   - Folder: Inbox
   - Mailbox: `impostoparceiro@romconcept.com`
   - Include Attachments: **Yes**
4. Condição (opcional): anexo presente OU assunto contém "NF" / "nota"
5. Ação: **HTTP** → POST

```
URL:     https://SEU-DOMINIO/api/email/inbound
Method:  POST
Headers: Authorization: Bearer SEU_INBOUND_EMAIL_SECRET
         Content-Type: application/json
Body:
{
  "from": "@{triggerOutputs()?['body/from']}",
  "subject": "@{triggerOutputs()?['body/subject']}",
  "body": "@{triggerOutputs()?['body/body']}",
  "receivedAt": "@{triggerOutputs()?['body/receivedDateTime']}",
  "attachments": [...]
}
```

> Enquanto não tiver deploy, teste local com [ngrok](https://ngrok.com) apontando para `localhost:3000`.

### Alternativa: encaminhamento + webhook

Encaminhar e-mails para serviço tipo Mailgun Inbound Parse → webhook na mesma URL.

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
- [ ] **4.7** Validação automática (nota vs Base Mestre)
- [ ] **4.8** Dashboard com KPIs e gráficos
- [ ] **4.9** Pendências (obrigações não recebidas)
- [ ] **4.10** API inbound e-mail (`/api/email/inbound`)
- [ ] **4.11** Parser XML NF-e + extração PDF
- [ ] **4.12** Assistente IA (opcional, fase 2)
- [ ] **4.13** Deploy Vercel + Power Automate apontando para produção

---

## Fase 5 — Teste end-to-end

1. Cadastre 1 contabilidade + 1 profissional + 1 obrigação mensal na Base Mestre
2. Envie e-mail de teste com XML de NF-e para `impostoparceiro@romconcept.com`
3. Confirme documento criado em `/documentos` com status correto
4. Verifique dashboard atualizado

---

## Comandos úteis

```bash
npm run dev          # app local http://localhost:3000
npm run db:push      # aplica schema no Neon
npm run db:studio    # visualizar tabelas (Drizzle Studio)
```

---

## Próximo passo imediato

**Agora:** crie o projeto no Neon, copie `DATABASE_URL`, rode `db/001_schema.sql` e me avise quando estiver pronto — seguimos com auth + layout.
