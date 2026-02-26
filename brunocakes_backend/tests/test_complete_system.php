<?php

/**
 * Teste Completo do Sistema Multi-Filial
 * 
 * Fase 1: Autenticação Admin
 * Fase 2: Popular Estoque Inicial (100 unidades por produto em cada filial)
 * Fase 3: Testar 5 clientes por filial
 *   - Adicionar produtos ao carrinho
 *   - Realizar checkout
 *   - Confirmar pagamento (verificar decremento de estoque)
 *   - Abandonar carrinho (verificar devolução de estoque)
 */

class CompleteSystemTester
{
    private $apiUrl = 'http://localhost:8191/api';
    private $adminToken = null;
    private $branches = [];
    private $products = [];
    private $users = [];
    private $testResults = [];
    
    public function __construct()
    {
        echo "\n🚀 TESTE COMPLETO DO SISTEMA MULTI-FILIAL\n";
        echo str_repeat("=", 80) . "\n\n";
    }
    
    private function apiCall($method, $endpoint, $data = null, $useAuth = false)
    {
        $url = $this->apiUrl . $endpoint;
        $ch = curl_init($url);
        
        $headers = [
            'Content-Type: application/json',
            'Accept: application/json'
        ];
        
        if ($useAuth && $this->adminToken) {
            $headers[] = 'Authorization: Bearer ' . $this->adminToken;
        }
        
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        if ($data && in_array($method, ['POST', 'PUT', 'PATCH'])) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        if (curl_errno($ch)) {
            $error = curl_error($ch);
            curl_close($ch);
            return ['status' => 0, 'data' => ['message' => $error]];
        }
        
        curl_close($ch);
        
        return [
            'status' => $httpCode,
            'data' => json_decode($response, true) ?? []
        ];
    }
    
    private function log($icon, $message)
    {
        echo "{$icon} {$message}\n";
    }
    
    private function logSuccess($message, $details = '')
    {
        $this->log('✅', $message . ($details ? " - {$details}" : ''));
        $this->testResults[] = ['success' => true, 'message' => $message];
    }
    
    private function logError($message, $details = '')
    {
        $this->log('❌', $message . ($details ? " - {$details}" : ''));
        $this->testResults[] = ['success' => false, 'message' => $message];
    }
    
    private function logInfo($message)
    {
        $this->log('ℹ️ ', $message);
    }
    
    private function logWarning($message)
    {
        $this->log('⚠️ ', $message);
    }
    
    // ============================================================================
    // FASE 1: AUTENTICAÇÃO
    // ============================================================================
    
    public function authenticate()
    {
        echo "🔐 FASE 1: Autenticação Admin\n";
        echo str_repeat("-", 80) . "\n";
        
        $response = $this->apiCall('POST', '/admin/login', [
            'email' => 'helouisedayane@gmail.com',
            'password' => 'Gatopreto11.'
        ]);
        
        if ($response['status'] === 200 && isset($response['data']['token'])) {
            $this->adminToken = $response['data']['token'];
            $this->logSuccess('Login admin realizado');
            echo "\n";
            return true;
        } else {
            $this->logError('Falha no login admin', json_encode($response));
            echo "\n";
            return false;
        }
    }
    
    // ============================================================================
    // FASE 2: POPULAR ESTOQUE
    // ============================================================================
    
    public function setupStock()
    {
        echo "📦 FASE 2: Popular Estoque Inicial\n";
        echo str_repeat("-", 80) . "\n";
        
        // Buscar filiais
        $response = $this->apiCall('GET', '/branches');
        if ($response['status'] !== 200 || empty($response['data'])) {
            $this->logError('Falha ao buscar filiais');
            return false;
        }
        $this->branches = $response['data'];
        $this->logSuccess('Filiais encontradas: ' . count($this->branches));
        
        // Buscar produtos
        $response = $this->apiCall('GET', '/products/with-stock');
        if ($response['status'] !== 200) {
            $this->logError('Falha ao buscar produtos');
            return false;
        }
        $this->products = $response['data']['products'] ?? $response['data'];
        $this->logSuccess('Produtos encontrados: ' . count($this->products));
        
        echo "\n";
        $stockPerProduct = 100;
        $totalUpdated = 0;
        
        foreach ($this->branches as $branch) {
            $branchId = $branch['id'];
            $branchName = $branch['name'];
            $this->logInfo("Filial: {$branchName} (ID: {$branchId})");
            
            foreach ($this->products as $product) {
                $productId = $product['id'];
                $productName = $product['name'];
                
                // Usar rota admin para atualizar estoque
                $response = $this->apiCall('PUT', "/admin/products/{$productId}/stocks/{$branchId}", [
                    'quantity' => $stockPerProduct
                ], true);
                
                if ($response['status'] === 200 || $response['status'] === 201) {
                    echo "   ✅ {$productName}: {$stockPerProduct} unidades\n";
                    $totalUpdated++;
                } else {
                    echo "   ❌ {$productName}: ERRO - " . ($response['data']['message'] ?? 'Desconhecido') . "\n";
                }
                
                usleep(50000); // 50ms entre requisições
            }
        }
        
        echo "\n";
        if ($totalUpdated > 0) {
            $this->logSuccess("Estoque populado: {$totalUpdated} registros atualizados");
        } else {
            $this->logError("Nenhum estoque foi atualizado");
        }
        echo "\n";
        
        return $totalUpdated > 0;
    }
    
    // ============================================================================
    // FASE 3: VERIFICAR ESTOQUE NO MYSQL E REDIS
    // ============================================================================
    
    public function verifyStock()
    {
        echo "🔍 FASE 3: Verificar Estoque (MySQL + Redis)\n";
        echo str_repeat("-", 80) . "\n";
        
        foreach ($this->branches as $branch) {
            $branchId = $branch['id'];
            $branchName = $branch['name'];
            echo "\n📍 {$branchName} (ID: {$branchId})\n";
            
            foreach ($this->products as $product) {
                $productId = $product['id'];
                $productName = $product['name'];
                
                $response = $this->apiCall('GET', "/products/{$product['id']}/stock?branch_id={$branch['id']}");
                
                if ($response['status'] === 200 && isset($response['data'])) {
                    $stock = $response['data']['quantity'] ?? $response['data']['available'] ?? 'N/A';
                    $reserved = $response['data']['reserved'] ?? 0;
                    echo "   📦 {$product['name']}: Estoque={$stock}, Reservado={$reserved}\n";
                } else {
                    echo "   ❌ {$product['name']}: Erro - Status: {$response['status']}, " . json_encode($response['data']) . "\n";
                }
            }
        }
        
        echo "\n";
    }
    
    // ============================================================================
    // FASE 4: TESTE DE VENDAS - 5 CLIENTES POR FILIAL
    // ============================================================================
    
    public function testSales()
    {
        echo "🛒 FASE 4: Teste de Vendas (5 clientes por filial)\n";
        echo str_repeat("=", 80) . "\n\n";
        
        // Criar 5 usuários por filial
        foreach ($this->branches as $branch) {
            for ($i = 1; $i <= 5; $i++) {
                $this->users[] = [
                    'id' => count($this->users) + 1,
                    'session_id' => 'test_session_' . $branch['id'] . '_user_' . $i . '_' . time() . rand(1000, 9999),
                    'branch_id' => $branch['id'],
                    'branch_name' => $branch['name'],
                    'user_name' => "Cliente {$i} - {$branch['name']}",
                    'cart' => [],
                    'order_id' => null,
                    'scenario' => $i <= 3 ? 'complete_purchase' : 'abandon_cart' // 3 compram, 2 abandonam
                ];
            }
        }
        
        $this->logSuccess('Usuários criados: ' . count($this->users));
        echo "\n";
        
        // Fase 4.1: Adicionar ao carrinho
        $this->testAddToCart();
        
        // Fase 4.2: Verificar estoque reservado
        $this->verifyReservedStock();
        
        // Fase 4.3: Checkout
        $this->testCheckout();
        
        // Fase 4.4: Confirmar pagamentos (apenas quem completa compra)
        $this->testPaymentConfirmation();
        
        // Fase 4.5: Verificar estoque após vendas
        $this->verifyFinalStock();
        
        // Fase 4.6: Abandonar carrinhos (simular expiração)
        $this->testCartAbandonment();
    }
    
    private function testAddToCart()
    {
        echo "🛒 FASE 4.1: Adicionar Produtos ao Carrinho\n";
        echo str_repeat("-", 80) . "\n";
        
        foreach ($this->users as &$user) {
            // Cada usuário adiciona 2 produtos aleatórios
            $productKeys = array_rand($this->products, min(2, count($this->products)));
            if (!is_array($productKeys)) $productKeys = [$productKeys];
            
            foreach ($productKeys as $key) {
                $product = $this->products[$key];
                $quantity = rand(1, 3);
                
                $response = $this->apiCall('POST', '/cart/add', [
                    'session_id' => $user['session_id'],
                    'product_id' => $product['id'],
                    'quantity' => $quantity,
                    'branch_id' => $user['branch_id']
                ]);
                
                if ($response['status'] === 201 || $response['status'] === 200) {
                    $user['cart'][] = [
                        'product_id' => $product['id'],
                        'product_name' => $product['name'],
                        'quantity' => $quantity
                    ];
                    echo "   ✅ {$user['user_name']}: {$product['name']} x{$quantity}\n";
                } else {
                    echo "   ❌ {$user['user_name']}: ERRO - " . ($response['data']['message'] ?? 'Desconhecido') . "\n";
                }
                
                usleep(100000); // 100ms
            }
        }
        
        echo "\n";
    }
    
    private function verifyReservedStock()
    {
        echo "🔒 FASE 4.2: Verificar Estoque Reservado\n";
        echo str_repeat("-", 80) . "\n";
        
        foreach ($this->branches as $branch) {
            echo "\n📍 {$branch['name']}\n";
            
            foreach ($this->products as $product) {
                $response = $this->apiCall('GET', "/products/{$product['id']}/stock?branch_id={$branch['id']}");
                
                if ($response['status'] === 200) {
                    $stock = $response['data']['quantity'] ?? 0;
                    $reserved = $response['data']['reserved'] ?? 0;
                    echo "   📦 {$product['name']}: Disponível={$stock}, Reservado={$reserved}\n";
                }
            }
        }
        
        echo "\n";
    }
    
    private function testCheckout()
    {
        echo "💳 FASE 4.3: Realizar Checkout\n";
        echo str_repeat("-", 80) . "\n";
        
        foreach ($this->users as &$user) {
            if (empty($user['cart']) || $user['scenario'] !== 'complete_purchase') {
                continue;
            }
            
            // Construir array de items a partir do carrinho
            $items = [];
            foreach ($user['cart'] as $cartItem) {
                $items[] = [
                    'product_id' => $cartItem['product_id'],
                    'quantity' => $cartItem['quantity']
                ];
            }
            
            $response = $this->apiCall('POST', '/checkout', [
                'session_id' => $user['session_id'],
                'branch_id' => $user['branch_id'],
                'customer_name' => $user['user_name'],
                'customer_phone' => '11999999999',
                'customer_email' => 'test' . $user['id'] . time() . '@example.com',
                'items' => $items,
                'address_street' => 'Rua Teste, 123',
                'address_neighborhood' => 'Centro'
            ]);
            
            if ($response['status'] === 201 || $response['status'] === 200) {
                $user['order_id'] = $response['data']['order']['id'] ?? $response['data']['order_id'] ?? null;
                $user['payment_id'] = $response['data']['payment']['id'] ?? null;
                $user['random_key'] = $response['data']['order']['payment_reference'] ?? null;
                echo "   ✅ {$user['user_name']}: Pedido #{$user['order_id']} criado (Payment ID: {$user['payment_id']})\n";
            } else {
                echo "   ❌ {$user['user_name']}: ERRO - " . ($response['data']['message'] ?? json_encode($response)) . "\n";
            }
            
            usleep(200000); // 200ms
        }
        
        echo "\n";
    }
    
    private function testPaymentConfirmation()
    {
        echo "✅ FASE 4.4: Confirmar Pagamentos\n";
        echo str_repeat("-", 80) . "\n";
        
        foreach ($this->users as &$user) {
            if (empty($user['order_id']) || $user['scenario'] !== 'complete_purchase') {
                continue;
            }
            
            if (empty($user['payment_id']) || empty($user['random_key'])) {
                echo "   ⚠️  {$user['user_name']}: ERRO - Dados de pagamento não encontrados\n";
                continue;
            }
            
            // Simular notificação de pagamento via webhook Mercado Pago
            // Usar query parameters como esperado pelo webhook
            $response = $this->apiCall('GET', "/payment/notify?payment_id={$user['payment_id']}&random_key={$user['random_key']}&status=paid");
            
            if ($response['status'] === 200) {
                $user['payment_confirmed'] = true;
                echo "   ✅ {$user['user_name']}: Pagamento confirmado (Pedido #{$user['order_id']}, Status: {$response['data']['order_status']})\n";
            } else {
                echo "   ⚠️  {$user['user_name']}: ERRO ao confirmar - " . ($response['data']['message'] ?? $response['data']['error'] ?? json_encode($response)) . "\n";
            }
            
            usleep(200000); // 200ms
        }
        
        echo "\n";
    }
    
    private function verifyFinalStock()
    {
        echo "📊 FASE 4.5: Estoque Após Vendas Confirmadas\n";
        echo str_repeat("-", 80) . "\n";
        
        foreach ($this->branches as $branch) {
            echo "\n📍 {$branch['name']}\n";
            
            foreach ($this->products as $product) {
                $response = $this->apiCall('GET', "/products/{$product['id']}/stock?branch_id={$branch['id']}");
                
                if ($response['status'] === 200) {
                    $stock = $response['data']['quantity'] ?? 0;
                    $reserved = $response['data']['reserved'] ?? 0;
                    $total = $stock + $reserved;
                    echo "   📦 {$product['name']}: Disponível={$stock}, Reservado={$reserved}, Total={$total}\n";
                }
            }
        }
        
        echo "\n";
    }
    
    private function testCartAbandonment()
    {
        echo "🗑️  FASE 4.6: Simular Abandono de Carrinho\n";
        echo str_repeat("-", 80) . "\n";
        
        $abandonedUsers = array_filter($this->users, fn($u) => $u['scenario'] === 'abandon_cart' && !empty($u['cart']));
        
        if (empty($abandonedUsers)) {
            $this->logInfo('Nenhum carrinho para abandonar');
            echo "\n";
            return;
        }
        
        echo "⏳ Limpando carrinhos abandonados...\n\n";
        
        foreach ($abandonedUsers as $user) {
            // Limpar carrinho manualmente (simula expiração)
            $response = $this->apiCall('DELETE', "/cart/session/{$user['session_id']}");
            
            if ($response['status'] === 200 || $response['status'] === 204) {
                echo "   ✅ {$user['user_name']}: Carrinho limpo (estoque devolvido)\n";
            } else {
                echo "   ⚠️  {$user['user_name']}: Erro ao limpar - " . ($response['data']['message'] ?? 'Desconhecido') . "\n";
            }
            
            usleep(100000);
        }
        
        echo "\n📊 Verificando estoque após devoluções...\n\n";
        
        foreach ($this->branches as $branch) {
            echo "📍 {$branch['name']}\n";
            
            foreach ($this->products as $product) {
                $response = $this->apiCall('GET', "/products/{$product['id']}/stock?branch_id={$branch['id']}");
                
                if ($response['status'] === 200) {
                    $stock = $response['data']['quantity'] ?? 0;
                    $reserved = $response['data']['reserved'] ?? 0;
                    echo "   📦 {$product['name']}: Disponível={$stock}, Reservado={$reserved}\n";
                }
            }
            echo "\n";
        }
    }
    
    // ============================================================================
    // RELATÓRIO FINAL
    // ============================================================================
    
    public function generateReport()
    {
        echo "\n" . str_repeat("=", 80) . "\n";
        echo "📊 RELATÓRIO FINAL\n";
        echo str_repeat("=", 80) . "\n\n";
        
        $passed = count(array_filter($this->testResults, fn($r) => $r['success']));
        $failed = count($this->testResults) - $passed;
        
        echo "Total de operações: " . count($this->testResults) . "\n";
        echo "✅ Sucesso: {$passed}\n";
        echo "❌ Falhas: {$failed}\n\n";
        
        echo "👥 Resumo de Usuários:\n";
        foreach ($this->branches as $branch) {
            $branchUsers = array_filter($this->users, fn($u) => $u['branch_id'] === $branch['id']);
            $purchased = count(array_filter($branchUsers, fn($u) => !empty($u['payment_confirmed'])));
            $abandoned = count(array_filter($branchUsers, fn($u) => $u['scenario'] === 'abandon_cart'));
            
            echo "\n📍 {$branch['name']}:\n";
            echo "   - Total de clientes: " . count($branchUsers) . "\n";
            echo "   - Compras finalizadas: {$purchased}\n";
            echo "   - Carrinhos abandonados: {$abandoned}\n";
        }
        
        echo "\n" . str_repeat("=", 80) . "\n";
        echo "✅ TESTE COMPLETO FINALIZADO!\n";
        echo str_repeat("=", 80) . "\n\n";
    }
    
    // ============================================================================
    // EXECUTAR TODOS OS TESTES
    // ============================================================================
    
    public function run()
    {
        if (!$this->authenticate()) {
            echo "❌ Falha na autenticação. Abortando.\n";
            return;
        }
        
        if (!$this->setupStock()) {
            echo "⚠️  Falha ao popular estoque. Continuando com estoque existente...\n\n";
        }
        
        $this->verifyStock();
        $this->testSales();
        $this->generateReport();
    }
}

// ============================================================================
// EXECUTAR
// ============================================================================

$tester = new CompleteSystemTester();
$tester->run();
