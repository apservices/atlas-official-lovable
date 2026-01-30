# 📚 Guia de Rotas - ATLAS Platform v2.0

## 🎯 Novas Rotas Implementadas

### Model Portal (RBAC: model)
```
GET  /model                          - Portal completo do modelo
     ├── Perfil técnico
     ├── Capturas
     ├── Previews
     ├── Licenças
     ├── Contratos
     └── Auditoria pessoal
```

### Brand Portal (RBAC: brand)
```
GET  /brand                          - Portal completo da marca
     ├── Modelos vinculados
     ├── Previews liberados
     ├── Assets licenciados
     ├── Contratos
     └── Histórico financeiro
```

### Model Profile (Técnico)
```
GET  /dashboard/model/profile        - Perfil técnico com estatísticas
```

### Contratos (Admin/Operator)
```
GET  /dashboard/contracts/[id]       - Visualização de contrato
     ├── Detalhes modelo
     ├── Detalhes marca
     ├── Licença vinculada
     ├── Status assinatura
     ├── Botão marcar como assinado
     └── Histórico financeiro
```

### Auditoria (Admin)
```
GET  /dashboard/audit                - Visualizador de logs completo
     ├── Filtros: Ator, Ação, Tabela, Data
     ├── Busca full-text
     ├── Export CSV
     └── 1000 últimos registros
```

### Licenças (Enhanced)
```
GET  /dashboard/licenses             - Dashboard de licenças
     ├── Tab: All Licenses (existente)
     ├── Tab: Professional Licenses (NOVO)
     │   ├── Status visual
     │   ├── Datas válidas
     │   ├── Downloads tracking
     │   ├── View Contract
     │   ├── Released Assets
     │   └── Download History
     └── Tab: Create License (existente)
```

---

## 🔌 Novas APIs

### Public API (Protected by API Key)

```bash
# Get License Details
GET /api/public/licenses/[id]

Headers:
  x-api-key: sk_live_...

Response:
{
  "id": "uuid",
  "status": "active",
  "usage_type": "commercial",
  "valid_from": "2026-01-29T00:00:00Z",
  "valid_until": "2027-01-29T00:00:00Z",
  "territory": ["WORLDWIDE"],
  "max_downloads": 1000,
  "current_downloads": 50,
  "model": {
    "id": "uuid",
    "name": "John Mitchell",
    "email": "john@example.com"
  },
  "client": {
    "id": "uuid",
    "email": "brand@example.com"
  },
  "contract": {
    "id": "uuid",
    "status": "signed",
    "signed": true
  }
}
```

---

## 🧩 Componentes Criados

### CertificateHashGenerator
```tsx
<CertificateHashGenerator 
  modelId={modelId}
  onHashGenerated={(hash) => {
    // Fazer algo com o hash
  }}
/>

Features:
- Gera SHA256 de modelo
- Armazena em database
- Mostra hash gerado
- Botão para regenerar
- Copy to clipboard
```

### Alert (New Component)
```tsx
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertDescription>Erro ao carregar</AlertDescription>
</Alert>
```

---

## 🗄️ Mudanças no Banco de Dados

### Tabela: models
```sql
-- Nova coluna
ALTER TABLE models ADD COLUMN certificate_hash TEXT UNIQUE;

-- Nova função
CREATE FUNCTION generate_certificate_hash(model_id UUID) RETURNS TEXT
-- Gera SHA256 baseado em captures + previews + licenses
```

---

## 🔐 RBAC (Role-Based Access Control)

### Roles Implementados
```
admin       - Acesso completo
operator    - Gerenciar models, captures, licenses
model       - Acessar seu portal pessoal
brand       - Acessar seu portal de marca
viewer      - Acesso de leitura limitado
```

### Acesso por Role

| Route | Admin | Operator | Model | Brand | Viewer |
|-------|-------|----------|-------|-------|--------|
| `/model` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/brand` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/dashboard/model/profile` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/dashboard/contracts/[id]` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/dashboard/audit` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/dashboard/licenses` | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 📊 Dados Utilizados

### Tabelas Lidas
- `profiles` - Usuários
- `models` - Dados de modelos
- `brands` - Dados de marcas
- `brand_models` - Vinculações
- `captures` - Capturas de assets
- `previews` - Previews gerados
- `licenses` - Licenças comerciais
- `contracts` - Contratos
- `audit_logs` - Registros de auditoria
- `financeiro_transacoes` - Transações financeiras

### Tabelas Escritas
- `models` (certificate_hash)
- `contracts` (signed, signed_at, status)

---

## 🧪 Exemplos de Uso

### 1. Acessar Portal como Modelo
```
1. Login como user com role='model'
2. Acesse http://localhost:3000/model
3. Veja seu perfil, capturas, previews, licenças
4. Na aba Auditoria, veja seus logs pessoais
```

### 2. Acessar Portal como Marca
```
1. Login como user com role='brand'
2. Acesse http://localhost:3000/brand
3. Veja modelos vinculados, previews, assets, financeiro
```

### 3. Gerar Certificate Hash
```
1. Login como model
2. Acesse /dashboard/model/profile
3. Scroll para "Certification Hash"
4. Clique "Generate Certification Hash"
5. Hash será salvo em database e exibido
6. Copie hash com "Copy Hash"
```

### 4. Visualizar Contrato
```
1. Login como admin
2. Acesse /dashboard/contracts/[id]
3. Veja modelo, marca, licença
4. Clique "Mark as Signed" para assinar
```

### 5. Filtrar Auditoria
```
1. Login como admin
2. Acesse /dashboard/audit
3. Filtro por: Ator, Ação, Tabela, Data
4. Busque no campo "Search"
5. Clique "Export CSV" para download
```

---

## 🚀 Deployment Checklist

- [x] Código escrito
- [x] Componentes criados
- [x] Rotas implementadas
- [x] Banco preparado (scripts SQL)
- [x] Testes locais (`pnpm dev` ✅)
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy no Vercel
- [ ] Testes em produção
- [ ] Monitoramento ativo

---

## 📞 Contato & Suporte

**Documentação**:
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)
- [Routes Documentation](./ROUTES.md) ← Você está aqui

**Status**: ✅ Pronto para Deploy

---

**Última atualização**: 29 de Janeiro de 2026
**Versão**: 2.0.0 - Commercial Expansion
