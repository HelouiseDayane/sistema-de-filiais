#!/bin/bash

# Script para restaurar brunocakes.sql e associar dados à Filial Central
# Este script:
# 1. Restaura o SQL do arquivo brunocakes.sql
# 2. Associa todos os usuários à Filial Central (branch_id = 1)
# 3. Associa todos os produtos à Filial Central
# 4. Cria entradas de stock para produtos

set -e

# Configurações de conexão ao banco
DB_HOST="127.0.0.1"
DB_PORT="3305"
DB_USER="root"
DB_PASS="aligayra658691"
DB_NAME="brunocakes"

echo "=========================================="
echo "🔄 Iniciando restauração com Filial Central"
echo "=========================================="

# 1. Restaurar o arquivo SQL
echo "📥 Restaurando arquivo SQL..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < /srv/Bruno_Cakes_filial/brunocakes.sql

echo "✅ SQL restaurado com sucesso"

# 2. Associar usuários à Filial Central
echo "👤 Associando usuários à Filial Central..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" << EOF
-- Adicionar coluna branch_id se não existir
ALTER TABLE users ADD COLUMN branch_id BIGINT UNSIGNED DEFAULT 1;

-- Adicionar coluna role se não existir
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';

-- Adicionar coluna is_admin se não existir
ALTER TABLE users ADD COLUMN is_admin TINYINT DEFAULT 0;

-- Associar todos os usuários à Filial Central (id=1)
UPDATE users SET branch_id = 1 WHERE branch_id IS NULL OR branch_id = 0;

-- Promover usuários principais a master
UPDATE users 
SET role = 'master', is_admin = 1 
WHERE email IN ('admin@admin.com', 'brunocakes@zapsrv.com', 'helouise@zapsrv.com');

SELECT 'Usuários atualizados:' as status;
SELECT id, name, email, branch_id, role, is_admin FROM users;
EOF

echo "✅ Usuários associados à Filial Central"

# 3. Associar produtos à Filial Central
echo "📦 Associando produtos à Filial Central..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" << EOF
-- Adicionar coluna branch_id aos produtos se não existir
ALTER TABLE products ADD COLUMN branch_id BIGINT UNSIGNED DEFAULT 1;

-- Associar todos os produtos à Filial Central
UPDATE products SET branch_id = 1 WHERE branch_id IS NULL OR branch_id = 0;

SELECT 'Produtos atualizados:' as status;
SELECT COUNT(*) as total_products FROM products WHERE branch_id = 1;
EOF

echo "✅ Produtos associados à Filial Central"

# 4. Criar entradas de stock para produtos
echo "📊 Criando entradas de stock para produtos..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" << EOF
-- Adicionar coluna branch_id à tabela product_stocks se não existir
ALTER TABLE product_stocks ADD COLUMN branch_id BIGINT UNSIGNED DEFAULT 1;

-- Deletar stocks antigos se existirem
DELETE FROM product_stocks WHERE branch_id != 1 OR branch_id IS NULL;

-- Criar stocks para produtos que não possuem (definindo quantidade padrão = 0)
INSERT INTO product_stocks (product_id, branch_id, quantity, created_at, updated_at)
SELECT 
    p.id,
    1 as branch_id,
    0 as quantity,
    NOW() as created_at,
    NOW() as updated_at
FROM products p
WHERE NOT EXISTS (
    SELECT 1 FROM product_stocks ps 
    WHERE ps.product_id = p.id AND ps.branch_id = 1
)
AND p.branch_id = 1;

SELECT 'Stocks criados:' as status;
SELECT COUNT(*) as total_stocks FROM product_stocks WHERE branch_id = 1;
EOF

echo "✅ Stocks criados para produtos"

# 5. Associar endereços à Filial Central
echo "🏠 Associando endereços à Filial Central..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" << EOF
-- Adicionar coluna branch_id aos endereços se não existir
ALTER TABLE addresses ADD COLUMN branch_id BIGINT UNSIGNED DEFAULT 1;

-- Associar todos os endereços à Filial Central
UPDATE addresses SET branch_id = 1 WHERE branch_id IS NULL OR branch_id = 0;

SELECT 'Endereços atualizados:' as status;
SELECT COUNT(*) as total_addresses FROM addresses WHERE branch_id = 1;
EOF

echo "✅ Endereços associados à Filial Central"

# 6. Associar pedidos à Filial Central
echo "📋 Associando pedidos à Filial Central..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" << EOF
-- Adicionar coluna branch_id aos orders se não existir
ALTER TABLE orders ADD COLUMN branch_id BIGINT UNSIGNED DEFAULT 1;

-- Associar todos os pedidos à Filial Central
UPDATE orders SET branch_id = 1 WHERE branch_id IS NULL OR branch_id = 0;

SELECT 'Pedidos atualizados:' as status;
SELECT COUNT(*) as total_orders FROM orders WHERE branch_id = 1;
EOF

echo "✅ Pedidos associados à Filial Central"

# 7. Resumo final
echo ""
echo "=========================================="
echo "📊 RESUMO DA RESTAURAÇÃO"
echo "=========================================="
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" << EOF
SELECT 
    'Filial Central' as filial,
    (SELECT COUNT(*) FROM branches WHERE id = 1) as filiais,
    (SELECT COUNT(*) FROM users WHERE branch_id = 1) as usuarios,
    (SELECT COUNT(*) FROM products WHERE branch_id = 1) as produtos,
    (SELECT COUNT(*) FROM product_stocks WHERE branch_id = 1) as stocks,
    (SELECT COUNT(*) FROM addresses WHERE branch_id = 1) as enderecos,
    (SELECT COUNT(*) FROM orders WHERE branch_id = 1) as pedidos;
EOF

echo ""
echo "=========================================="
echo "✅ RESTAURAÇÃO CONCLUÍDA COM SUCESSO!"
echo "=========================================="
echo ""
echo "🔗 Todos os dados foram associados à Filial Central (ID: 1)"
echo ""
