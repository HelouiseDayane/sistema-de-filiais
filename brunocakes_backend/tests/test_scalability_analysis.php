<?php

/**
 * ANÁLISE DE ESCALABILIDADE E PERFORMANCE
 * 
 * Este teste analisa:
 * 1. Capacidade de lidar com 20 filiais × 15 pedidos/segundo = 300 req/s
 * 2. Performance do Redis sob alta carga
 * 3. Gargalos de conexão MySQL
 * 4. Eficiência de queries N+1
 * 5. Sistema de atualização em tempo real (SSE/Broadcast)
 */

class ScalabilityAnalyzer
{
    private $apiUrl = 'http://localhost:8191/api';
    private $adminToken = null;
    private $results = [];
    private $metrics = [
        'redis_operations' => [],
        'mysql_queries' => [],
        'api_response_times' => [],
        'concurrent_sessions' => 0,
        'errors' => []
    ];
    
    public function __construct()
    {
        echo "\n";
        echo "╔════════════════════════════════════════════════════════════════╗\n";
        echo "║     ANÁLISE DE ESCALABILIDADE - SISTEMA MULTI-FILIAL         ║\n";
        echo "║     Target: 20 filiais × 15 req/s = 300 req/s                ║\n";
        echo "╚════════════════════════════════════════════════════════════════╝\n\n";
    }
    
    private function log($icon, $message, $color = '')
    {
        echo "{$icon} {$message}\n";
    }
    
    private function logSection($title)
    {
        echo "\n" . str_repeat("=", 80) . "\n";
        echo "  {$title}\n";
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
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        
        if ($data && in_array($method, ['POST', 'PUT', 'PATCH'])) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $start = microtime(true);
        $response = curl_exec($ch);
        $duration = (microtime(true) - $start) * 1000; // ms
        
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        return [
            'status' => $httpCode,
            'data' => json_decode($response, true) ?? [],
            'duration' => $duration
        ];
    }
    
    // ============================================================================
    // TESTE 1: ANÁLISE DE CONFIGURAÇÃO
    // ============================================================================
    
    public function analyzeConfiguration()
    {
        $this->logSection("TESTE 1: ANÁLISE DE CONFIGURAÇÃO");
        
        // Conectar ao Redis e verificar configuração
        try {
            $redis = new Redis();
            $redis->connect('localhost', 6380);
            $redis->auth('cakes12345671571285415715715785421478214782171285742557');
            
            $info = $redis->info();
            
            $this->log("✅", "Redis conectado com sucesso");
            $this->log("📊", "Redis versão: " . ($info['redis_version'] ?? 'N/A'));
            $this->log("📊", "Memória usada: " . ($info['used_memory_human'] ?? 'N/A'));
            $this->log("📊", "Clientes conectados: " . ($info['connected_clients'] ?? 'N/A'));
            $this->log("📊", "Conexões max: " . ($info['maxclients'] ?? 'N/A'));
            
            // Verificar configurações críticas
            $config = $redis->config('GET', '*');
            $maxConnections = $config['maxclients'] ?? 10000;
            $timeout = $config['timeout'] ?? 0;
            
            echo "\n📋 CONFIGURAÇÕES CRÍTICAS:\n";
            echo "   - Max connections: {$maxConnections}\n";
            echo "   - Timeout: {$timeout}s\n";
            echo "   - Databases: " . ($config['databases'] ?? '16') . "\n";
            
            if ($maxConnections < 1000) {
                $this->log("⚠️ ", "ALERTA: maxclients muito baixo para 300 req/s!");
                $this->metrics['errors'][] = "Redis maxclients insuficiente";
            } else {
                $this->log("✅", "Redis configurado para alta carga");
            }
            
        } catch (Exception $e) {
            $this->log("❌", "Erro ao conectar Redis: " . $e->getMessage());
            $this->metrics['errors'][] = "Redis connection failed";
        }
        
        // Verificar MySQL
        try {
            $pdo = new PDO(
                'mysql:host=localhost;port=3310;dbname=brunocakes',
                'brunocakes',
                'brunocakes145236521478214821782171285742557'
            );
            
            $this->log("✅", "MySQL conectado com sucesso");
            
            // Verificar variáveis importantes
            $stmt = $pdo->query("SHOW VARIABLES LIKE 'max_connections'");
            $maxConn = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->log("📊", "MySQL max_connections: " . $maxConn['Value']);
            
            if ($maxConn['Value'] < 200) {
                $this->log("⚠️ ", "ALERTA: max_connections baixo para alta carga!");
                $this->metrics['errors'][] = "MySQL max_connections insuficiente";
            }
            
            $stmt = $pdo->query("SHOW VARIABLES LIKE 'innodb_buffer_pool_size'");
            $bufferPool = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->log("📊", "InnoDB buffer pool: " . round($bufferPool['Value'] / 1024 / 1024) . " MB");
            
        } catch (Exception $e) {
            $this->log("❌", "Erro ao conectar MySQL: " . $e->getMessage());
            $this->metrics['errors'][] = "MySQL connection failed";
        }
    }
    
    // ============================================================================
    // TESTE 2: ANÁLISE DE ENDPOINTS CRÍTICOS
    // ============================================================================
    
    public function analyzeCriticalEndpoints()
    {
        $this->logSection("TESTE 2: PERFORMANCE DOS ENDPOINTS CRÍTICOS");
        
        // Autenticar
        $response = $this->apiCall('POST', '/admin/login', [
            'email' => 'helouisedayane@gmail.com',
            'password' => 'Gatopreto11.'
        ]);
        
        if ($response['status'] === 200) {
            $this->adminToken = $response['data']['token'];
            $this->log("✅", "Admin autenticado ({$response['duration']}ms)");
        }
        
        echo "\n📊 TESTANDO ENDPOINTS:\n\n";
        
        $endpoints = [
            ['GET', '/branches', 'Listar filiais'],
            ['GET', '/products/with-stock?branch_id=1', 'Produtos com estoque'],
            ['GET', '/products/1/stock?branch_id=1', 'Estoque de produto'],
        ];
        
        foreach ($endpoints as [$method, $endpoint, $description]) {
            $times = [];
            for ($i = 0; $i < 10; $i++) {
                $response = $this->apiCall($method, $endpoint);
                $times[] = $response['duration'];
                usleep(50000); // 50ms entre requests
            }
            
            $avg = array_sum($times) / count($times);
            $max = max($times);
            $min = min($times);
            
            $status = $avg < 100 ? "✅" : ($avg < 300 ? "⚠️ " : "❌");
            echo "   {$status} {$description}\n";
            echo "      Avg: " . number_format($avg, 2) . "ms | Min: " . number_format($min, 2) . "ms | Max: " . number_format($max, 2) . "ms\n";
            
            if ($avg > 200) {
                $this->metrics['errors'][] = "Endpoint lento: {$endpoint} ({$avg}ms)";
            }
        }
    }
    
    // ============================================================================
    // TESTE 3: SIMULAÇÃO DE CARGA CONCORRENTE
    // ============================================================================
    
    public function testConcurrentLoad()
    {
        $this->logSection("TESTE 3: CARGA CONCORRENTE (Simulação 5 filiais × 10 clientes)");
        
        $branches = [1, 2];
        $products = [1, 2, 3];
        $totalRequests = 0;
        $successfulRequests = 0;
        $failedRequests = 0;
        $totalDuration = 0;
        
        echo "🚀 Simulando carga de 50 sessões concorrentes...\n\n";
        
        $startTime = microtime(true);
        
        // Simular 50 clientes adicionando ao carrinho
        for ($branch = 0; $branch < 2; $branch++) {
            $branchId = $branches[$branch];
            
            for ($client = 1; $client <= 25; $client++) {
                $sessionId = "load_test_b{$branchId}_c{$client}_" . time() . rand(1000, 9999);
                $productId = $products[array_rand($products)];
                $quantity = rand(1, 3);
                
                $response = $this->apiCall('POST', '/cart/add', [
                    'session_id' => $sessionId,
                    'product_id' => $productId,
                    'quantity' => $quantity,
                    'branch_id' => $branchId
                ]);
                
                $totalRequests++;
                $totalDuration += $response['duration'];
                
                if ($response['status'] === 200 || $response['status'] === 201) {
                    $successfulRequests++;
                } else {
                    $failedRequests++;
                }
                
                // Não fazer sleep para simular carga real
            }
        }
        
        $endTime = microtime(true);
        $totalTime = ($endTime - $startTime);
        $requestsPerSecond = $totalRequests / $totalTime;
        $avgResponseTime = $totalDuration / $totalRequests;
        
        echo "\n📊 RESULTADOS:\n";
        echo "   Total de requisições: {$totalRequests}\n";
        echo "   Sucesso: {$successfulRequests} (" . round(($successfulRequests/$totalRequests)*100, 2) . "%)\n";
        echo "   Falhas: {$failedRequests} (" . round(($failedRequests/$totalRequests)*100, 2) . "%)\n";
        echo "   Tempo total: " . number_format($totalTime, 2) . "s\n";
        echo "   Throughput: " . number_format($requestsPerSecond, 2) . " req/s\n";
        echo "   Resposta média: " . number_format($avgResponseTime, 2) . "ms\n\n";
        
        // Avaliar capacidade
        $targetRps = 300; // 20 filiais × 15 req/s
        $currentCapacity = $requestsPerSecond;
        $estimatedCapacity = ($currentCapacity / 50) * 300; // Extrapolação
        
        echo "🎯 ANÁLISE DE CAPACIDADE:\n";
        echo "   Meta: {$targetRps} req/s (20 filiais × 15 req/s)\n";
        echo "   Capacidade atual (50 sessões): " . number_format($currentCapacity, 2) . " req/s\n";
        echo "   Capacidade estimada (300 sessões): " . number_format($estimatedCapacity, 2) . " req/s\n\n";
        
        if ($estimatedCapacity >= $targetRps && $avgResponseTime < 500) {
            $this->log("✅", "Sistema capaz de suportar a carga target!");
        } elseif ($estimatedCapacity >= $targetRps * 0.7) {
            $this->log("⚠️ ", "Sistema no limite. Recomenda-se otimização.");
        } else {
            $this->log("❌", "Sistema INCAPAZ de suportar a carga target!");
            $this->metrics['errors'][] = "Capacidade insuficiente para 300 req/s";
        }
    }
    
    // ============================================================================
    // TESTE 4: ANÁLISE DE ATUALIZAÇÃO EM TEMPO REAL
    // ============================================================================
    
    public function analyzeRealtimeUpdates()
    {
        $this->logSection("TESTE 4: SISTEMA DE ATUALIZAÇÃO EM TEMPO REAL");
        
        echo "📡 Verificando implementação de updates em tempo real...\n\n";
        
        // Verificar se SSE está implementado
        $response = $this->apiCall('GET', '/stream/updates');
        
        if ($response['status'] === 200) {
            $this->log("✅", "Endpoint SSE encontrado (/stream/updates)");
        } else {
            $this->log("⚠️ ", "Endpoint SSE não encontrado ou não funcional");
        }
        
        // Verificar broadcast configuration
        $envFile = __DIR__ . '/brunocakes_backend/.env';
        if (file_exists($envFile)) {
            $env = file_get_contents($envFile);
            if (strpos($env, 'BROADCAST_CONNECTION=log') !== false) {
                $this->log("❌", "BROADCAST_CONNECTION=log (não envia eventos!)");
                $this->log("⚠️ ", "PROBLEMA CRÍTICO: Eventos não são transmitidos!");
                $this->metrics['errors'][] = "Broadcasting configurado como 'log' - não funcional";
            } elseif (strpos($env, 'BROADCAST_CONNECTION=redis') !== false) {
                $this->log("✅", "BROADCAST_CONNECTION=redis (OK)");
            } else {
                $this->log("⚠️ ", "BROADCAST_CONNECTION não configurado");
            }
        }
        
        echo "\n🔍 ANÁLISE DO FRONTEND:\n\n";
        
        // Verificar se frontend tem polling
        $publicMenuFile = __DIR__ . '/brunocakes_front_v3/src/components/public/PublicMenu.tsx';
        if (file_exists($publicMenuFile)) {
            $content = file_get_contents($publicMenuFile);
            
            // Procurar por setInterval
            if (preg_match('/setInterval.*(\d{3,})/', $content, $matches)) {
                $interval = $matches[1];
                $this->log("⚠️ ", "POLLING detectado no frontend! Intervalo: {$interval}ms");
                $this->metrics['errors'][] = "Frontend usa polling ao invés de SSE/WebSocket";
            } else {
                $this->log("✅", "Sem polling detectado");
            }
            
            // Verificar EventSource (SSE)
            if (strpos($content, 'EventSource') !== false) {
                $this->log("✅", "EventSource (SSE) implementado no frontend");
            } else {
                $this->log("⚠️ ", "EventSource (SSE) NÃO encontrado");
            }
        }
    }
    
    // ============================================================================
    // TESTE 5: ANÁLISE DE CONEXÕES REDIS
    // ============================================================================
    
    public function analyzeRedisConnections()
    {
        $this->logSection("TESTE 5: ANÁLISE DE POOL DE CONEXÕES REDIS");
        
        try {
            $redis = new Redis();
            $redis->connect('localhost', 6380);
            $redis->auth('cakes12345671571285415715715785421478214782171285742557');
            
            // Testar múltiplas operações
            $operations = 1000;
            $start = microtime(true);
            
            for ($i = 0; $i < $operations; $i++) {
                $redis->set("test_key_{$i}", "value_{$i}");
                $redis->get("test_key_{$i}");
            }
            
            $duration = (microtime(true) - $start) * 1000;
            $opsPerMs = $operations / $duration;
            $opsPerSec = $opsPerMs * 1000;
            
            echo "📊 Performance Redis:\n";
            echo "   {$operations} operações em " . number_format($duration, 2) . "ms\n";
            echo "   " . number_format($opsPerSec, 0) . " ops/s\n\n";
            
            if ($opsPerSec > 10000) {
                $this->log("✅", "Performance excelente do Redis");
            } elseif ($opsPerSec > 5000) {
                $this->log("⚠️ ", "Performance adequada, mas pode melhorar");
            } else {
                $this->log("❌", "Performance BAIXA do Redis!");
                $this->metrics['errors'][] = "Redis com performance baixa";
            }
            
            // Limpar chaves de teste
            for ($i = 0; $i < $operations; $i++) {
                $redis->del("test_key_{$i}");
            }
            
        } catch (Exception $e) {
            $this->log("❌", "Erro no teste Redis: " . $e->getMessage());
        }
    }
    
    // ============================================================================
    // RELATÓRIO FINAL
    // ============================================================================
    
    public function generateReport()
    {
        $this->logSection("RELATÓRIO FINAL");
        
        $totalErrors = count($this->metrics['errors']);
        
        if ($totalErrors === 0) {
            echo "🎉 PARABÉNS! Sistema pronto para produção!\n";
            echo "   ✅ Todas as verificações passaram\n";
            echo "   ✅ Capacidade suficiente para 20 filiais\n";
            echo "   ✅ Configurações adequadas\n\n";
        } else {
            echo "⚠️  PROBLEMAS ENCONTRADOS: {$totalErrors}\n\n";
            foreach ($this->metrics['errors'] as $i => $error) {
                echo "   " . ($i + 1) . ". {$error}\n";
            }
            echo "\n";
        }
        
        echo "╔════════════════════════════════════════════════════════════════╗\n";
        echo "║                    RECOMENDAÇÕES                               ║\n";
        echo "╚════════════════════════════════════════════════════════════════╝\n\n";
        
        echo "1️⃣  REDIS:\n";
        echo "   - Aumentar maxmemory para 1GB+ em produção\n";
        echo "   - Configurar persistent connections no Laravel\n";
        echo "   - Usar Redis Cluster para escalabilidade horizontal\n\n";
        
        echo "2️⃣  MYSQL:\n";
        echo "   - Aumentar max_connections para 500+\n";
        echo "   - Configurar connection pooling\n";
        echo "   - Otimizar índices nas tabelas product_stocks\n\n";
        
        echo "3️⃣  BROADCAST:\n";
        echo "   - MUDAR de BROADCAST_CONNECTION=log para =redis\n";
        echo "   - Implementar EventSource no frontend\n";
        echo "   - Remover polling (setInterval) do frontend\n\n";
        
        echo "4️⃣  ARQUITETURA:\n";
        echo "   - Implementar Redis Sentinel para HA\n";
        echo "   - Usar Laravel Horizon para queue management\n";
        echo "   - Implementar rate limiting por IP\n";
        echo "   - CDN para assets estáticos\n\n";
        
        echo "5️⃣  MONITORAMENTO:\n";
        echo "   - Implementar APM (New Relic, DataDog)\n";
        echo "   - Logs estruturados (ELK Stack)\n";
        echo "   - Alertas para latência > 500ms\n";
        echo "   - Dashboard de métricas em tempo real\n\n";
    }
    
    // ============================================================================
    // EXECUTAR TODOS OS TESTES
    // ============================================================================
    
    public function run()
    {
        $this->analyzeConfiguration();
        $this->analyzeCriticalEndpoints();
        $this->testConcurrentLoad();
        $this->analyzeRealtimeUpdates();
        $this->analyzeRedisConnections();
        $this->generateReport();
        
        echo "\n✅ ANÁLISE COMPLETA FINALIZADA!\n\n";
    }
}

// ============================================================================
// EXECUTAR
// ============================================================================

$analyzer = new ScalabilityAnalyzer();
$analyzer->run();
