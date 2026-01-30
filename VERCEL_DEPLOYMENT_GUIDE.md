# 🚀 Guia Rápido - Deploy ATLAS no Vercel

## ✅ Pré-requisitos

- [ ] Código commitado no GitHub/GitLab
- [ ] Variáveis de ambiente preparadas
- [ ] Scripts SQL executados no Supabase
- [ ] Testes locais passando (`pnpm dev`)

---

## 📋 Passo 1: Preparar Variáveis de Ambiente

Copie e configure no seu `.env.local` (nunca commitar):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG... (para admin tasks)

# App
NEXT_PUBLIC_APP_URL=https://seu-dominio.com

# API
API_KEY_PUBLIC=sk_live_... (gere uma chave segura)
```

---

## 📋 Passo 2: Executar Scripts SQL no Supabase

Acesse https://app.supabase.com → seu projeto → SQL Editor

Execute na ordem:
1. **001-create-tables.sql** - Criar tabelas base
2. **002-enable-rls.sql** - Habilitar RLS
3. **003-create-storage-buckets.sql** - Criar storage
4. **004-create-functions.sql** - Funções helper
5. **005-seed-demo-data.sql** - Dados demo (opcional)
6. **006-add-certificate-hash.sql** - NOVA: Certificação

✅ **Status**: Todos executados com sucesso

---

## 📋 Passo 3: Deploy no Vercel

### Opção A: Deploy via Interface (Recomendado)

1. Acesse https://vercel.com/dashboard
2. Clique "Add New..." → "Project"
3. Selecione seu repositório
4. Configure:
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`
   - **Install Command**: `pnpm install`

5. Adicione variáveis de ambiente:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   NEXT_PUBLIC_APP_URL
   API_KEY_PUBLIC
   ```

6. Clique "Deploy"

### Opção B: Deploy via CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Deploy
vercel --prod
```

---

## ✅ Passo 4: Verificações Pós-Deploy

### 1. Testar Endpoints
```bash
# GET Model Portal
curl https://seu-dominio.com/model

# GET Brand Portal
curl https://seu-dominio.com/brand

# GET Profile Técnico
curl https://seu-dominio.com/dashboard/model/profile

# GET API (com key)
curl -H "x-api-key: sua-chave" \
  https://seu-dominio.com/api/public/licenses/[license-id]
```

### 2. Verificar Logs
- Vercel Dashboard → Deployments → View Logs
- Supabase → Logs para erros de banco

### 3. Testar Funcionalidades
- [ ] Login funciona
- [ ] Model portal carrega
- [ ] Brand portal carrega
- [ ] Contracts carregam
- [ ] Audit log filtra
- [ ] Generate certificate hash funciona

---

## 🔗 Configuração de Domínio Customizado

### No Vercel
1. Acesse seu projeto
2. Settings → Domains
3. Adicione seu domínio
4. Configure DNS:

```
CNAME: seu-dominio.com → cname.vercel-dns.com
```

### No seu registrador de domínio
1. Adicione record CNAME apontando para Vercel
2. Aguarde propagação (5-30 minutos)
3. Vercel validará automaticamente

---

## ⚠️ Troubleshooting

### Build falha
```bash
# Verificar logs locais
pnpm build

# Comum: TypeScript errors
# Solução: Corrigir imports, tipos
```

### Supabase desconectado
```bash
# Verificar variáveis
echo $NEXT_PUBLIC_SUPABASE_URL

# Testar conexão
curl -H "Authorization: Bearer token" \
  https://seu-projeto.supabase.co/rest/v1/models?limit=1
```

### API key inválida
```bash
# Gerar nova chave
# Settings → API → Gerar novo API_KEY_PUBLIC
```

### RLS bloqueando
```sql
-- Verificar policies
SELECT * FROM pg_policies WHERE tablename = 'models';

-- Testar policy
SELECT * FROM models LIMIT 1;  -- Deve retornar seus dados
```

---

## 🎯 Próximas Otimizações (Futuro)

- [ ] Adicionar rate limiting (Vercel Edge)
- [ ] Implementar caching (Redis/Upstash)
- [ ] Configurar CDN para assets
- [ ] Adicionar monitoring (Sentry)
- [ ] Configurar backups automáticos
- [ ] Integrar blockchain (Phase 9)

---

## 📊 Monitoramento

### Vercel Analytics
- Dashboard → Analytics
- Métricas: Performance, Errors, Requests

### Supabase
- Logs → Ver queries lentas
- Database → Replication lag
- Storage → Usage

---

## 🔐 Checklist de Segurança Pós-Deploy

- [ ] .env.local não está commitado
- [ ] Variáveis sensíveis em Vercel (não em código)
- [ ] RLS habilitado em todas as tabelas
- [ ] CORS configurado corretamente
- [ ] API keys rotacionadas periodicamente
- [ ] Logs sendo monitorados

---

## 📞 Status

- ✅ Código pronto
- ✅ Testes passando
- ✅ Variáveis preparadas
- ✅ DB pronto
- ⏳ Aguardando deploy

**Próximo passo**: Clique "Deploy" no Vercel ✨

---

**Data**: 29 de Janeiro de 2026
**Versão**: Ready for Production
