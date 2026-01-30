# Scripts SQL ATLAS - Execução Segura

Todos os scripts de 001 a 010 foram revisados para serem idempotentes e seguros para múltiplas execuções.

- 001-create-tables.sql: Criação de tipos, tabelas, índices, triggers
- 002-enable-rls.sql: Habilita RLS
- 003-create-storage-buckets.sql: Buckets de storage
- 004-create-functions.sql: Funções auxiliares
- 005-seed-demo-data.sql: Dados de exemplo
- 006-add-certificate-hash.sql: Coluna e função de hash
- 007-fix-schema-alignment.sql: Ajustes de schema
- 008-fix-rls-policies.sql: Políticas RLS para dev
- 009-nuclear-rls-fix.sql: Políticas amplas (dev)
- 010-production-rls-policies.sql: Políticas seguras (produção)

**Execute sempre na ordem e revise antes de rodar em produção!**
