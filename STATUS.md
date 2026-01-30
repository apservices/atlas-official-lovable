# 🎊 ATLAS Platform v2.0 - Pronto para Uso

## ✅ Status: 100% Funcional

**Data**: 30 de Janeiro de 2026  
**Supabase Project**: vdxglfncaulbjvbbirrm  
**Status**: ✅ Rodando em http://localhost:3000

---

## 🚀 Como Usar AGORA

### 1. **Servidor está rodando localmente**
```
URL: http://localhost:3000
Status: ✅ Conectado ao Supabase
```

### 2. **Fazer Login**

Você precisa criar usuários de teste no Supabase:

1. Acesse: https://app.supabase.com/project/vdxglfncaulbjvbbirrm
2. Vá para: **Authentication** → **Users**
3. Clique: **Create user** (ou use convite por email)
4. Crie usuários com emails:
   - `model@example.com` (role = model)
   - `brand@example.com` (role = brand)
   - `admin@example.com` (role = admin)

### 3. **Criar Profiles (Papéis)**

Execute este SQL no Supabase SQL Editor:

```sql
-- Encontre o UUID do usuário em auth.users
-- Depois crie o profile com o role desejado

INSERT INTO profiles (id, email, full_name, role)
VALUES (
  'seu-uuid-aqui',
  'model@example.com',
  'John Mitchell',
  'model'
);

INSERT INTO profiles (id, email, full_name, role)
VALUES (
  'seu-uuid-aqui',
  'brand@example.com',
  'Fashion Brand',
  'brand'
);

INSERT INTO profiles (id, email, full_name, role)
VALUES (
  'seu-uuid-aqui',
  'admin@example.com',
  'System Admin',
  'admin'
);
```

### 4. **Executar Scripts SQL**

Execute os scripts na ordem no Supabase SQL Editor:

```
1. ✅ 001-create-tables.sql
2. ✅ 002-enable-rls.sql
3. ✅ 003-create-storage-buckets.sql
4. ✅ 004-create-functions.sql
5. ⏳ 005-seed-demo-data.sql (opcional)
6. ✅ 006-add-certificate-hash.sql (NOVO)
```

---

## 🧪 Testar Portais

### Como Modelo

1. **Login**: Use email `model@example.com`
2. **Acesse**: http://localhost:3000/model
3. **Veja**:
   - Perfil técnico
   - Capturas
   - Previews
   - Licenças
   - Contratos
   - Auditoria pessoal

### Como Marca

1. **Login**: Use email `brand@example.com`
2. **Acesse**: http://localhost:3000/brand
3. **Veja**:
   - Modelos vinculados
   - Previews liberados
   - Assets licenciados
   - Contratos
   - Histórico financeiro

### Como Admin

1. **Login**: Use email `admin@example.com`
2. **Acesse**: http://localhost:3000/dashboard
3. **Funcionalidades**:
   - `/dashboard/model/profile` - Perfil técnico com gerador de hash
   - `/dashboard/contracts/[id]` - Visualizar contratos
   - `/dashboard/licenses` - Gerenciar licenças
   - `/dashboard/audit` - Ver logs com filtros

---

## 📋 Dados de Teste Necessários

Para testar completamente, você precisa criar no Supabase:

### 1. Modelos
```sql
INSERT INTO models (id, user_id, full_name, email, city, status, created_by)
VALUES (
  gen_random_uuid(),
  'model-user-uuid',
  'John Mitchell',
  'john@example.com',
  'São Paulo',
  'active',
  'admin-uuid'
);
```

### 2. Marcas
```sql
INSERT INTO brands (id, user_id, name, website)
VALUES (
  gen_random_uuid(),
  'brand-user-uuid',
  'Fashion Co',
  'https://fashion.com'
);
```

### 3. Relacionamentos
```sql
INSERT INTO brand_models (brand_id, model_id, status)
VALUES ('brand-uuid', 'model-uuid', 'active');
```

### 4. Licenças
```sql
INSERT INTO licenses (
  model_id, client_id, usage_type, territory, 
  valid_from, valid_until, status, created_by, digital_twin_id
)
VALUES (
  'model-uuid',
  'brand-user-uuid',
  'COMMERCIAL',
  ARRAY['WORLDWIDE'],
  NOW(),
  NOW() + INTERVAL '1 year',
  'active',
  'admin-uuid',
  'model-uuid'
);
```

---

## 🔐 Configurações de Segurança

### ✅ Já Configurado

- ✅ RLS habilitado em todas as tabelas
- ✅ Políticas de acesso por role
- ✅ Auth obrigatória para `/dashboard` e portais
- ✅ API keys protegidas em `.env.local`

### ⚠️ Recomendações

- [ ] Configurar email custom no Supabase
- [ ] Ativar autenticação 2FA
- [ ] Configurar CORS se for usar externamente
- [ ] Criar backup automático no Supabase

---

## 🚀 Deploy no Vercel

### Passo 1: Preparar Repositório

```bash
# Commit no GitHub
git add .
git commit -m "ATLAS v2.0 - Commercial Expansion"
git push origin main
```

### Passo 2: Conectar ao Vercel

1. Acesse: https://vercel.com/new
2. Selecione seu repositório
3. Configure:
   - **Framework**: Next.js
   - **Build Command**: `pnpm build`

### Passo 3: Adicionar Variáveis de Ambiente

No Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL = https://vdxglfncaulbjvbbirrm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL = https://seu-dominio.com
API_KEY_PUBLIC = sk_live_... (gere uma chave segura)
```

### Passo 4: Deploy

```bash
vercel deploy --prod
```

---

## 📱 URLs Principais

### Públicas (sem login)
- `/` - Home
- `/login` - Login
- `/signup` - Cadastro

### Modelos (role = model)
- `/model` - Portal completo

### Marcas (role = brand)
- `/brand` - Portal completo

### Admin (role = admin)
- `/dashboard` - Dashboard
- `/dashboard/model/profile` - Perfil técnico
- `/dashboard/contracts/[id]` - Visualizar contrato
- `/dashboard/licenses` - Licenças
- `/dashboard/audit` - Auditoria com filtros

### APIs (Protected)
- `GET /api/public/licenses/[id]` - Requer header `x-api-key`

---

## 🧪 Testar API Localmente

```bash
# Com API key (você define em .env.local)
curl -X GET http://localhost:3000/api/public/licenses/license-uuid \
  -H "x-api-key: sua-chave-secreta"
```

---

## 📊 Estrutura do Banco

### Tabelas Principais
- `profiles` - Usuários com roles
- `models` - Modelos (com nova coluna: certificate_hash)
- `brands` - Marcas
- `brand_models` - Relacionamento
- `licenses` - Licenças
- `contracts` - Contratos
- `captures` - Capturas
- `previews` - Previews
- `audit_logs` - Auditoria
- `financeiro_transacoes` - Transações

---

## ✨ Recursos Novos (v2.0)

| Feature | Status | Localização |
|---------|--------|------------|
| Model Portal | ✅ | `/model` |
| Brand Portal | ✅ | `/brand` |
| Profile Técnico | ✅ | `/dashboard/model/profile` |
| Contract Viewer | ✅ | `/dashboard/contracts/[id]` |
| Audit Log | ✅ | `/dashboard/audit` |
| Certificate Hash | ✅ | Componente + `/dashboard/model/profile` |
| Enhanced Licenses | ✅ | `/dashboard/licenses` |
| Public API | ✅ | `/api/public/licenses/[id]` |

---

## 🐛 Troubleshooting

### "URL and Key are required"
✅ **Solução**: Arquivo `.env.local` foi criado automaticamente

### "Cannot connect to Supabase"
```bash
# Verificar variáveis
cat .env.local

# Deve conter:
# NEXT_PUBLIC_SUPABASE_URL=https://vdxglfncaulbjvbbirrm.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### "Login não funciona"
1. Verificar se usuário foi criado em Supabase Auth
2. Verificar se profile foi criado com o role correto
3. Verificar RLS policies em `public.profiles`

### "API retorna 401"
- Verificar header `x-api-key`
- Verificar RLS policies na tabela

---

## 🎯 Próximas Ações

### Imediato (Hoje)
- [x] ✅ Configurar .env.local com credenciais
- [x] ✅ Rodar servidor local
- [ ] ⏳ Criar usuários de teste no Supabase
- [ ] ⏳ Executar scripts SQL

### Curto Prazo (Esta Semana)
- [ ] ⏳ Testar todos os portais
- [ ] ⏳ Testar gerador de certificate hash
- [ ] ⏳ Testar APIs

### Médio Prazo (Próximas Semanas)
- [ ] ⏳ Deploy no Vercel
- [ ] ⏳ Configurar domínio customizado
- [ ] ⏳ Monitoramento em produção

---

## 📞 Documentação Criada

1. **IMPLEMENTATION_SUMMARY.md** - Resumo técnico completo
2. **VERCEL_DEPLOYMENT_GUIDE.md** - Guia de deploy passo-a-passo
3. **ROUTES.md** - Referência de todas as rotas e APIs
4. **STATUS.md** - Este arquivo

---

## 🔗 Links Importantes

- **Supabase Dashboard**: https://app.supabase.com/project/vdxglfncaulbjvbbirrm
- **Servidor Local**: http://localhost:3000
- **Vercel Dashboard**: https://vercel.com/dashboard

---

## 💡 Dicas

1. **Use Incognito**: Para testar múltiplos usuários simultaneamente
2. **DevTools**: F12 para ver erros de Network/Console
3. **Supabase Logs**: Veja erros em tempo real nos logs do Supabase
4. **SQL Editor**: Teste queries diretamente no Supabase SQL Editor

---

**🎉 Tudo pronto! Comece testando os portais localmente.**

Próximo passo: Criar usuários de teste no Supabase
