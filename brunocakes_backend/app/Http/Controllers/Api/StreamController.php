<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StreamController extends Controller
{
    /**
     * ✅ NOVA: Stream de atualizações em tempo real via SSE
     */
    public function updates(Request $request)
    {
        $branchId = $request->query('branch_id');
        
        $response = new StreamedResponse(function () use ($branchId) {
            // Headers para SSE
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');
            header('X-Accel-Buffering: no'); // Para Nginx

            $channels = ['stock-updates', 'order-status-updates'];
            if ($branchId) {
                $channels[] = "stock-updates-branch-{$branchId}";
                $channels[] = "order-status-updates-branch-{$branchId}";
            }

            $clientConnected = true;
            $lastHeartbeat = time();

            while ($clientConnected) {
                try {
                    $redis = Redis::connection('stock');
                    $redis->subscribe($channels, function ($message, $channel) use (&$clientConnected, &$lastHeartbeat) {
                        if (connection_aborted()) {
                            $clientConnected = false;
                            return;
                        }
                        try {
                            $data = json_decode($message, true);
                            // Evento de estoque
                            if ($data && isset($data['product_id']) && $data['product_id'] > 0) {
                                echo "event: stock_update\n";
                                echo "data: " . json_encode($data) . "\n\n";
                                if (ob_get_level()) {
                                    ob_flush();
                                }
                                flush();
                            }
                            // Evento de status do pedido
                            if ($data && isset($data['type']) && $data['type'] === 'order_status') {
                                echo "event: order_status\n";
                                echo "data: " . json_encode($data['data']) . "\n\n";
                                if (ob_get_level()) {
                                    ob_flush();
                                }
                                flush();
                            }
                            // Heartbeat a cada 30 segundos
                            if (time() - $lastHeartbeat >= 30) {
                                echo "event: heartbeat\n";
                                echo "data: " . json_encode(['timestamp' => now()->toISOString()]) . "\n\n";
                                if (ob_get_level()) {
                                    ob_flush();
                                }
                                flush();
                                $lastHeartbeat = time();
                            }
                        } catch (\Exception $e) {
                            \Log::error('SSE Stream Inner Error: ' . $e->getMessage());
                            $clientConnected = false;
                        }
                    });
                } catch (\Exception $e) {
                    \Log::error('SSE Stream Redis Subscribe Error: ' . $e->getMessage());
                    // Espera 2 segundos antes de tentar reconectar
                    sleep(2);
                }
            }
        });
        
        return $response;
    }
    
    
    /**
     * ✅ NOVA: Força um evento de atualização (para testes)
     */
    public function triggerStockUpdate(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|integer',
            'type' => 'required|string|in:stock_change,low_stock,out_of_stock'
        ]);
        
        // Em produção, isso seria enviado via broadcasting/websockets
        broadcast(new \App\Events\StockUpdated($data['product_id'], $data['type']));
        
        return response()->json([
            'message' => 'Evento de estoque disparado',
            'event_data' => $data
        ]);
    }
}