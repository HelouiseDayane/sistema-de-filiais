-- Script de Migração para Filiais
-- Migra dados do banco antigo para estrutura com Filiais
-- Filial Central: FIL001

-- ============================================================
-- 1. CRIAR FILIAL CENTRAL
-- ============================================================
INSERT INTO branches (name, code, email, phone, status, address, city, state, bank_holder, bank_account, bank_code, bank_branch, bank_digit, pix_key, pix_type, created_at, updated_at)
VALUES (
  'Filial Central',
  'FIL001',
  'central@brunocakes.com',
  '(84) 99999-9999',
  1,
  'Rua Principal, 100',
  'São Gonçalo do Amarante',
  'RN',
  'BRUNO CAKES LTDA',
  '12345-6',
  '001',
  '1234',
  '0',
  'brunocakes@pix.com',
  'email',
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE updated_at = NOW();

-- Obter ID da Filial Central
SET @branch_id = (SELECT id FROM branches WHERE code = 'FIL001' LIMIT 1);

-- ============================================================
-- 2. ATUALIZAR USUÁRIOS COM FILIAL E ROLE
-- ============================================================
-- Se não houver admin, criar um
INSERT INTO users (name, email, password, role, branch_id, email_verified_at, created_at, updated_at)
SELECT 'Admin', 'admin@brunocakes.com', '$2y$12$4HbHvEhKnQPzMNgJ2dYduu6q5FaJDQ6MfGjF3w6F8x0F0F0F0F0F0', 'admin', @branch_id, NOW(), NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@brunocakes.com')
LIMIT 1;

-- Atualizar usuários existentes sem role
UPDATE users SET role = 'user', branch_id = @branch_id 
WHERE (role IS NULL OR role = '') AND email != 'admin@brunocakes.com';

-- Garantir admin
UPDATE users SET role = 'admin', branch_id = @branch_id 
WHERE email IN ('admin@brunocakes.com', 'brunocakes@brunocakes.com');

-- ============================================================
-- 3. ATUALIZAR PRODUTOS COM FILIAL
-- ============================================================
UPDATE products SET branch_id = @branch_id WHERE branch_id IS NULL OR branch_id = 0;

-- ============================================================
-- 4. ATUALIZAR PEDIDOS COM FILIAL
-- ============================================================
UPDATE orders SET branch_id = @branch_id WHERE branch_id IS NULL OR branch_id = 0;

-- ============================================================
-- 5. ATUALIZAR ENDEREÇOS COM FILIAL
-- ============================================================
UPDATE addresses SET branch_id = @branch_id WHERE branch_id IS NULL OR branch_id = 0;

-- ============================================================
-- 6. CRIAR ESTOQUE PARA CADA PRODUTO NA FILIAL CENTRAL
-- ============================================================
INSERT INTO product_stocks (product_id, branch_id, quantity, reserved, created_at, updated_at)
SELECT 
  p.id,
  @branch_id,
  COALESCE(p.stock, 0) as quantity,
  0 as reserved,
  NOW(),
  NOW()
FROM products p
WHERE p.id NOT IN (
  SELECT DISTINCT product_id FROM product_stocks WHERE branch_id = @branch_id
)
ON DUPLICATE KEY UPDATE 
  quantity = COALESCE(quantity, 0),
  updated_at = NOW();

-- ============================================================
-- 7. CRIAR STORE SETTINGS PARA FILIAL CENTRAL
-- ============================================================
INSERT INTO store_settings (branch_id, delivery_fee, min_order_value, max_order_value, operating_hours, timezone, currency, created_at, updated_at)
SELECT @branch_id, 5.00, 15.00, 1000.00, 'Segunda a Domingo: 08:00 - 22:00', 'America/Fortaleza', 'BRL', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM store_settings WHERE branch_id = @branch_id)
LIMIT 1;

-- ============================================================
-- 8. VERIFICAR INTEGRIDADE
-- ============================================================
-- Contar registros migrados
SELECT CONCAT('Usuarios na Filial Central: ', COUNT(*)) FROM users WHERE branch_id = @branch_id;
SELECT CONCAT('Produtos na Filial Central: ', COUNT(*)) FROM products WHERE branch_id = @branch_id;
SELECT CONCAT('Pedidos na Filial Central: ', COUNT(*)) FROM orders WHERE branch_id = @branch_id;
SELECT CONCAT('Estoques na Filial Central: ', COUNT(*)) FROM product_stocks WHERE branch_id = @branch_id;
SELECT CONCAT('Enderecos na Filial Central: ', COUNT(*)) FROM addresses WHERE branch_id = @branch_id;

-- Exibir dados da Filial Central
SELECT CONCAT('Filial: ', name, ' (', code, ')') FROM branches WHERE id = @branch_id;
