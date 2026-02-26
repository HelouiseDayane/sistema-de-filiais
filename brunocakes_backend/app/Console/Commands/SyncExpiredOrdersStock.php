<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Order;
use App\Jobs\ExpireCheckoutJob;
use Illuminate\Support\Facades\Redis;

class SyncExpiredOrdersStock extends Command
{
    protected $signature = 'sync:expired-orders-stock {--product=}';
    protected $description = 'Libera estoque de pedidos expirados/cancelados que ainda possuem itens reservados';

    public function handle()
    {
        $productId = $this->option('product');
        if ($productId) {
            // Limpa reserva do produto específico, ignorando pedidos
            $reservedKey = "product_reserved_{$productId}";
            $reserved = Redis::get($reservedKey);
            if ($reserved > 0) {
                Redis::set($reservedKey, 0);
                Redis::incrby("product_stock_{$productId}", $reserved);
                $this->info("Reserva fantasma removida do produto #{$productId} (devolvido {$reserved} ao estoque)");
            } else {
                $this->info("Nenhuma reserva encontrada para o produto #{$productId}");
            }
            return;
        }

        $orders = Order::with('items')
            ->where(function($query) {
                $query->whereNull('status')
                    ->orWhere('status', '')
                    ->orWhereIn('status', ['pending_payment', 'canceled', 'failed', 'expired']);
            })
            ->get();

        $count = 0;
        $reservedKeys = [];
        // Processa pedidos pendentes/cancelados normalmente
        foreach ($orders as $order) {
            foreach ($order->items as $item) {
                $reservedKeys[$item->product_id] = true;
            }
            if ($order->items->count() > 0) {
                $this->info("Liberando estoque do pedido #{$order->id} (status: {$order->status})");
                dispatch(new ExpireCheckoutJob($order->id));
                $count++;
            }
        }
        $this->info("Total de pedidos processados: {$count}");

        // Recalcula o reservado de cada produto somando apenas reservas individuais ativas (TTL > 0)
        $allProductIds = \DB::table('products')->pluck('id');
        foreach ($allProductIds as $productId) {
            $reservedKey = "product_reserved_{$productId}";
            $pattern = "reserve:*:{$productId}";
            $keys = Redis::keys($pattern);
            $totalActive = 0;
            $totalExpired = 0;
            foreach ($keys as $key) {
                $ttl = Redis::ttl($key);
                $qty = Redis::get($key);
                if ($ttl > 0) { // reserva ainda ativa
                    if ($qty > 0) {
                        $totalActive += $qty;
                    }
                } else if ($ttl === -2) { // reserva expirada
                    if ($qty > 0) {
                        $totalExpired += $qty;
                    }
                }
            }
            // Diminui apenas o valor expirado do reservado
            $reservedAtual = Redis::get($reservedKey) ?? 0;
            $novoReserved = max(0, $reservedAtual - $totalExpired);
            Redis::set($reservedKey, $novoReserved);
            $this->info("Reserva recalculada do produto #{$productId}: {$novoReserved} ainda ativa (expiradas removidas: {$totalExpired})");
            // Emite evento SSE para o frontend
            if (class_exists('App\\Http\\Controllers\\Api\\CheckoutController')) {
                $controller = new \App\Http\Controllers\Api\CheckoutController();
                $controller->registrarAtualizacaoEstoque($productId, 'stock_change');
            }
        }
    }
}
