#!/bin/bash

# RESTORE FILIAIS - Migra dados antigos para nova estrutura com filiais
# Uso: ./restore_filiais.sh <arquivo_backup.sql>

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

BACKUP_FILE="${1:-brunocakes.sql}"
BRANCH_CODE="FIL001"
BRANCH_NAME="Filial Central"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  RESTORE COM MIGRACAO - Bruno Cakes${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# Validar arquivo
if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}Erro: Arquivo $BACKUP_FILE nao encontrado${NC}"
  echo ""
  echo "Uso: ./restore_filiais.sh <arquivo_backup.sql>"
  echo ""
  echo "Exemplo:"
  echo "  ./restore_filiais.sh brunocakes.sql"
  echo "  ./restore_filiais.sh ./backups/backup_20260307.sql"
  exit 1
fi

echo -e "${YELLOW}Aviso:${NC} Este script ira:"
echo "  1. Parar os containers"
echo "  2. Limpar banco de dados"
echo "  3. Restaurar dados do backup"
echo "  4. Migrar para estrutura com filiais"
echo "  5. Preencher dados faltantes"
echo ""
read -p "Deseja continuar? (s/N) " -n 1 -r
echo
if [[ ! \$REPLY =~ ^[Ss]\$ ]]; then
  echo "Operacao cancelada"
  exit 0
fi

echo ""
echo -e "${BLUE}ℹ Parando containers...${NC}"
docker compose stop 2>/dev/null || true
docker compose down 2>/dev/null || true
sleep 2

echo -e "${BLUE}ℹ Iniciando containers...${NC}"
docker compose up -d --quiet-pull

echo -e "${BLUE}ℹ Aguardando MySQL ficar disponivel...${NC}"
for i in {1..40}; do
  if docker compose exec -T db mysql -h db -u root -proot -e "SELECT 1" >/dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
    break
  fi
  sleep 2
  echo -n "."
done

echo ""
echo -e "${BLUE}ℹ Limpando banco antigo...${NC}"
docker compose exec -T db mysql -h db -u root -proot -e "DROP DATABASE IF EXISTS brunocakes;" 2>/dev/null || true

echo -e "${BLUE}ℹ Criando banco novo...${NC}"
docker compose exec -T db mysql -h db -u root -proot -e "CREATE DATABASE brunocakes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null

echo -e "${BLUE}ℹ Importando backup antigo...${NC}"
docker compose exec -T db mysql -h db -u root -proot brunocakes < "$BACKUP_FILE"

echo -e "${BLUE}ℹ Aguardando backend ficar pronto...${NC}"
for i in {1..30}; do
  if docker compose exec -T backend_filial curl -s http://localhost/api/branches >/dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
    break
  fi
  sleep 2
  echo -n "."
done

echo ""
echo -e "${BLUE}ℹ Executando migrations do Laravel...${NC}"
docker compose exec -T backend_filial php artisan migrate --force 2>&1 | grep -E "(Migrated|Nothing)" || true

echo -e "${BLUE}ℹ Migrando para estrutura com filiais...${NC}"
docker compose exec -T db mysql -h db -u root -proot brunocakes < /dev/stdin << 'SQL_EOF'
-- Criar Filial Central
INSERT INTO branches (name, code, email, phone, status, created_at, updated_at)
VALUES ('Filial Central', 'FIL001', 'central@brunocakes.com', '(84) 99999-9999', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

SET @branch_id = (SELECT id FROM branches WHERE code = 'FIL001' LIMIT 1);

-- Atualizar usuarios
UPDATE users SET role = 'user', branch_id = @branch_id WHERE role IS NULL;
UPDATE users SET role = 'admin', branch_id = @branch_id WHERE email LIKE '%admin%' OR email LIKE '%bruno%';

-- Atualizar produtos
UPDATE products SET branch_id = @branch_id WHERE branch_id IS NULL OR branch_id = 0;

-- Atualizar pedidos
UPDATE orders SET branch_id = @branch_id WHERE branch_id IS NULL OR branch_id = 0;

-- Atualizar enderecos
UPDATE addresses SET branch_id = @branch_id WHERE branch_id IS NULL OR branch_id = 0;

-- Criar estoques
INSERT INTO product_stocks (product_id, branch_id, quantity, reserved, created_at, updated_at)
SELECT id, @branch_id, COALESCE(stock, 0), 0, NOW(), NOW() FROM products
WHERE id NOT IN (SELECT DISTINCT product_id FROM product_stocks WHERE branch_id = @branch_id)
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- Status
SELECT CONCAT('OK - Usuarios: ', COUNT(*)) FROM users WHERE branch_id = @branch_id;
SELECT CONCAT('OK - Produtos: ', COUNT(*)) FROM products WHERE branch_id = @branch_id;
SELECT CONCAT('OK - Pedidos: ', COUNT(*)) FROM orders WHERE branch_id = @branch_id;
SQL_EOF

echo -e "${BLUE}ℹ Executando seeders...${NC}"
docker compose exec -T backend_filial php artisan db:seed --force 2>&1 | grep -E "(Seeding|Database)" || true

echo -e "${BLUE}ℹ Corrigindo permissoes...${NC}"
docker compose exec -T backend_filial chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}OK RESTORE CONCLUIDO COM SUCESSO!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "Filial Central criada:"
echo "  Codigo: $BRANCH_CODE"
echo "  Nome: $BRANCH_NAME"
echo ""
echo "Dados migrados e vinculados:"
echo "  • Usuarios"
echo "  • Produtos"
echo "  • Pedidos"
echo "  • Enderecos"
echo "  • Estoques"
echo ""
echo "Acesso:"
echo "  Frontend: https://localhost:8889"
echo "  Backend:  http://localhost:81/api"
echo ""
echo "Proximas vezes use: ./start.sh"
echo ""
