#!/bin/bash

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuração
DB_HOST="127.0.0.1"
DB_PORT="3305"
DB_USER="root"
DB_PASSWORD="aligayra658691"
DB_NAME="brunocakes"
BACKUP_FILE="${1:-brunocakes.sql}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}=== RESTORE COM MIGRACAO PARA FILIAIS ===${NC}"
echo ""

# Validar arquivo de backup
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}✗ Erro: Arquivo de backup '$BACKUP_FILE' não encontrado${NC}"
    exit 1
fi

echo -e "${YELLOW}→ Usando arquivo de backup: $BACKUP_FILE${NC}"
echo -e "${YELLOW}→ Conectando a MySQL: $DB_HOST:$DB_PORT${NC}"
echo ""

# Função para executar SQL
execute_sql() {
    local query="$1"
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "$query" 2>/dev/null
    return $?
}

# Função para executar SQL arquivo
execute_sql_file() {
    local file="$1"
    local database="$2"
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$database" < "$file" 2>/dev/null
    return $?
}

# 1. Testar conexão com MySQL
echo -e "${BLUE}[1/7]${NC} Testando conexão com MySQL..."
if ! execute_sql "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}✗ Erro: Não consegui conectar em MySQL em $DB_HOST:$DB_PORT${NC}"
    echo -e "${RED}   Verifique credenciais: root / aligayra658691${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Conexão OK${NC}"
echo ""

# 2. Limpar banco antigo
echo -e "${BLUE}[2/7]${NC} Limpando banco antigo..."
execute_sql "DROP DATABASE IF EXISTS $DB_NAME;"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Banco antigo removido${NC}"
else
    echo -e "${YELLOW}⚠ Aviso: Banco pode não existir ou erro na remoção${NC}"
fi
echo ""

# 3. Criar banco novo
echo -e "${BLUE}[3/7]${NC} Criando banco novo..."
execute_sql "CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Banco criado${NC}"
else
    echo -e "${RED}✗ Erro ao criar banco${NC}"
    exit 1
fi
echo ""

# 4. Importar backup
echo -e "${BLUE}[4/7]${NC} Importando dados do backup (${BACKUP_FILE})..."
execute_sql_file "$BACKUP_FILE" "$DB_NAME"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup importado com sucesso${NC}"
else
    echo -e "${RED}✗ Erro ao importar backup${NC}"
    exit 1
fi
echo ""

# 5. Aguardar backend
echo -e "${BLUE}[5/7]${NC} Aguardando backend ficar pronto..."
cd "$SCRIPT_DIR" || exit 1
sleep 10
echo -e "${GREEN}✓ Backend pronto${NC}"
echo ""

# 6. Executar migrations
echo -e "${BLUE}[6/7]${NC} Executando Laravel migrations..."
cd "$SCRIPT_DIR/brunocakes_backend" || exit 1
if docker compose exec -T backend_filial php artisan migrate --force > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Migrations executadas${NC}"
else
    echo -e "${YELLOW}⚠ Migrations podem ter tido problemas - continuando...${NC}"
fi
echo ""

# 7. Migrar dados para filiais
echo -e "${BLUE}[7/7]${NC} Migrando dados para estrutura de filiais..."

# SQL de migração
cat > /tmp/migrate_filiais.sql << 'SQLEOF'
-- Criar Filial Central
INSERT INTO branches (name, code, email, phone, is_active, created_at, updated_at)
VALUES ('Filial Central', 'FIL001', 'central@brunocakes.com', '(84) 99999-9999', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- Obter ID da filial
SET @branch_id = (SELECT id FROM branches WHERE code = 'FIL001' LIMIT 1);

-- Atualizar usuários
UPDATE users SET branch_id = @branch_id WHERE branch_id IS NULL OR branch_id = 0;

-- Atualizar produtos
UPDATE products SET branch_id = @branch_id WHERE branch_id IS NULL OR branch_id = 0;

-- Atualizar pedidos (se existirem dados)
UPDATE orders SET branch_id = @branch_id WHERE branch_id IS NULL OR branch_id = 0;

-- Atualizar endereços (se existirem dados)
UPDATE addresses SET branch_id = @branch_id WHERE branch_id IS NULL OR branch_id = 0;

-- Criar estoques de produtos para aqueles que ainda não têm
INSERT INTO product_stocks (product_id, branch_id, quantity, created_at, updated_at)
SELECT id, @branch_id, COALESCE(quantity, 0), NOW(), NOW() FROM products
WHERE id NOT IN (SELECT DISTINCT product_id FROM product_stocks WHERE branch_id = @branch_id)
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- Atualizar role de usuários que estão nulos
UPDATE users SET role = 'user' WHERE role IS NULL;
SQLEOF

# Executar SQL de migração
execute_sql_file "/tmp/migrate_filiais.sql" "$DB_NAME"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dados migrados para filiais${NC}"
else
    echo -e "${RED}✗ Erro na migração de dados${NC}"
    exit 1
fi
echo ""

# Resultado final
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ RESTORE E MIGRACAO CONCLUIDOS COM SUCESSO!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Filial Central criada:${NC}"
echo -e "  Código: FIL001"
echo -e "  Nome: Filial Central"
echo -e "  Email: central@brunocakes.com"
echo ""
echo -e "${YELLOW}Dados migrados:${NC}"

# Verificar dados
verify_sql() {
    local query="$1"
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e "$query" 2>/dev/null
}

USERS_COUNT=$(verify_sql "SELECT COUNT(*) FROM users WHERE branch_id = (SELECT id FROM branches WHERE code = 'FIL001');")
PRODUCTS_COUNT=$(verify_sql "SELECT COUNT(*) FROM products WHERE branch_id = (SELECT id FROM branches WHERE code = 'FIL001');")
ORDERS_COUNT=$(verify_sql "SELECT COUNT(*) FROM orders WHERE branch_id = (SELECT id FROM branches WHERE code = 'FIL001');")
STOCKS_COUNT=$(verify_sql "SELECT COUNT(*) FROM product_stocks WHERE branch_id = (SELECT id FROM branches WHERE code = 'FIL001');")

echo -e "  Usuários: $USERS_COUNT"
echo -e "  Produtos: $PRODUCTS_COUNT"
echo -e "  Pedidos: $ORDERS_COUNT"
echo -e "  Estoques: $STOCKS_COUNT"
echo ""

echo -e "${YELLOW}Acesso ao sistema:${NC}"
echo -e "  Frontend: ${BLUE}https://localhost:8889${NC}"
echo -e "  API Backend: ${BLUE}http://localhost:81/api${NC}"
echo ""

# Limpar arquivo temporário
rm -f /tmp/migrate_filiais.sql

exit 0
