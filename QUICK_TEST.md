# 🧪 Quick Test Guide - ATLAS v2.0

## ⚡ 5 Minutos de Teste Rápido

### Setup (Se ainda não fez)

```bash
# 1. Terminal aberto na pasta do projeto
cd c:\Users\thiag\Downloads\atlas_vscode\atlas-official-lovable

# 2. Servidor dev já está rodando
# Se não estiver, execute:
npx next dev

# 3. Acessar: http://localhost:3000
```

---

## 🔐 Criar Usuários de Teste (2 min)

### No Supabase Dashboard

1. **Acesse**: https://app.supabase.com/project/vdxglfncaulbjvbbirrm
2. **Vá para**: Authentication → Users
3. **Clique**: "Create user" (botão no topo)
4. **Crie 3 usuários**:

```
Email: model@test.com         Password: Test@1234
Email: brand@test.com         Password: Test@1234
Email: admin@test.com         Password: Test@1234
```

### Criar Profiles (1 min)

No **SQL Editor** do Supabase, execute:

```sql
-- Substitua os UUIDs pelos IDs reais dos usuários criados acima
-- (vá em Authentication → Users para copiar o ID)

INSERT INTO profiles (id, email, full_name, role) VALUES
('UUID-DO-MODEL', 'model@test.com', 'Test Model', 'model'),
('UUID-DO-BRAND', 'brand@test.com', 'Test Brand', 'brand'),
('UUID-DO-ADMIN', 'admin@test.com', 'Test Admin', 'admin');
```

---

## 🧪 Testar Rotas (3 min)

### 1️⃣ Login Page (Public)
```
URL: http://localhost:3000
Status: ✅ Deve mostrar login/signup
```

### 2️⃣ Model Portal (role = model)
```
1. Login com: model@test.com / Test@1234
2. Acesse: http://localhost:3000/model
3. Veja: Perfil, Capturas, Previews, Licenças, Contratos, Auditoria

Status esperado: 6 abas carregando (mesmo sem dados)
```

### 3️⃣ Brand Portal (role = brand)
```
1. Logout (menu superior direito)
2. Login com: brand@test.com / Test@1234
3. Acesse: http://localhost:3000/brand
4. Veja: Modelos, Previews, Assets, Contratos, Financeiro

Status esperado: 5 abas carregando
```

### 4️⃣ Model Profile (role = admin/model)
```
1. Logout → Login com admin@test.com / Test@1234
2. Acesse: http://localhost:3000/dashboard/model/profile
3. Veja: Perfil técnico + Gerador de certificate hash

Status esperado: Cards de estatísticas + seção de hash
```

### 5️⃣ Certificate Hash Generator
```
Na página /dashboard/model/profile:
1. Scroll para "Certification Hash"
2. Clique: "Generate Certification Hash"
3. Veja: SHA256 gerado
4. Clique: "Copy Hash" (deve copiar para clipboard)

Status esperado: Hash exibido em caixa cinza
```

### 6️⃣ Audit Dashboard (role = admin)
```
1. Login com admin@test.com
2. Acesse: http://localhost:3000/dashboard/audit
3. Veja: Tabela de logs com filtros

Status esperado: Tabela carregando (mesmo vazia inicialmente)
```

### 7️⃣ Licenses Dashboard
```
1. Login com admin@test.com
2. Acesse: http://localhost:3000/dashboard/licenses
3. Veja: Tabs "All Licenses" e "Professional Licenses"

Status esperado: Ambas abas funcionando
```

---

## ✅ Checklist Visual

| Feature | URL | Status |
|---------|-----|--------|
| Login | / | ✅ Renderiza |
| Model Portal | /model | ✅ Renderiza (dados vazios OK) |
| Brand Portal | /brand | ✅ Renderiza (dados vazios OK) |
| Profile | /dashboard/model/profile | ✅ Renderiza + Hash |
| Contracts | /dashboard/contracts/[id] | ✅ Renderiza |
| Audit | /dashboard/audit | ✅ Renderiza + Filtros |
| Licenses | /dashboard/licenses | ✅ Renderiza + Tabs |

---

## 🐛 Troubleshooting Rápido

### Erro: "Não consigo fazer login"
```
Solução:
1. Verificar se usuário foi criado em Supabase Auth
2. Verificar se profile foi criado com INSERT
3. Verificar senha
```

### Erro: "Página em branco"
```
Solução:
1. Abrir DevTools (F12)
2. Ver se há erros em Console
3. Ver se há erros em Network
```

### Erro: "Cannot find [object]"
```
Solução:
1. Dados não existem no Supabase
2. É esperado - portal vai mostrar "no data"
3. Criar dados de teste (SQL insert)
```

### Servidor não responde
```
Solução:
1. Verificar se está rodando: npx next dev
2. Verificar se porta 3000 está livre
3. Reiniciar: Ctrl+C e npx next dev
```

---

## 🎯 Dados de Teste para Adicionar (Opcional)

### Criar um Modelo
```sql
INSERT INTO models (
  id, user_id, full_name, email, city, 
  status, created_by, internal_id
) VALUES (
  gen_random_uuid(),
  'UUID-DO-MODEL',
  'Test Model',
  'model@test.com',
  'São Paulo',
  'active',
  'UUID-DO-ADMIN',
  'TEST-001'
);
```

### Criar uma Marca
```sql
INSERT INTO brands (id, user_id, name)
VALUES (
  gen_random_uuid(),
  'UUID-DO-BRAND',
  'Test Brand'
);
```

### Vincar Modelo à Marca
```sql
INSERT INTO brand_models (brand_id, model_id, status)
SELECT 
  (SELECT id FROM brands LIMIT 1),
  (SELECT id FROM models LIMIT 1),
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM brand_models 
  WHERE brand_id = (SELECT id FROM brands LIMIT 1)
);
```

---

## ⚡ Atalhos Úteis

```bash
# Parar servidor
Ctrl+C

# Reiniciar
npx next dev

# Limpar cache
rm -r .next
npx next dev

# Ver logs do Supabase
https://app.supabase.com/project/vdxglfncaulbjvbbirrm → Logs

# SQL Editor do Supabase
https://app.supabase.com/project/vdxglfncaulbjvbbirrm → SQL Editor
```

---

## 📊 Esperado vs Realidade

### ✅ Esperado (Sem dados de teste)
```
- Páginas carregam normalmente
- Componentes renderizam
- Filtros funcionam (mesmo sem dados)
- Botões funcionam (podem dar erro se dados faltam)
- Estilo/layout correto
```

### ✅ Esperado (Com dados de teste)
```
- Dados aparecem nas tabelas
- Stats calculadas corretamente
- Filtros filtram realmente
- Links funcionam
- Tudo funcional
```

---

## 🚀 Próximo Passo

1. **Criar usuários** (2 min)
2. **Criar profiles** (1 min)
3. **Testar portais** (3 min)
4. **Criar dados** (5 min - opcional)
5. **Deploy** (30 min)

**Total**: ~10 minutos para tudo pronto!

---

**Última atualização**: 30 de Janeiro de 2026  
**Status**: ✅ Pronto para Testar
