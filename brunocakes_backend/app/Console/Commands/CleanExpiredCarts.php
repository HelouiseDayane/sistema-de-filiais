<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Redis;

class CleanExpiredCarts extends Command
{
    protected $signature = 'carts:clean-expired';
    protected $description = 'Limpa carrinhos expirados e libera estoque reservado';

    public function handle()
    {
        $pattern = "cart:*";
        $cartKeys = Redis::keys($pattern);
        $cleanedCount = 0;

        foreach ($cartKeys as $cartKey) {
            if (!Redis::exists($cartKey)) {
                // Carrinho já expirou, limpa reservas relacionadas
                $sessionId = str_replace('cart:', '', $cartKey);
                $this->cleanSessionReservations($sessionId);
                $cleanedCount++;
            }
        }

        $this->info("Limpeza concluída: {$cleanedCount} carrinhos expirados removidos");
    }

    private function cleanSessionReservations($sessionId)
    {
        $reserveKeys = Redis::keys("reserve:{$sessionId}:*");
        
        foreach ($reserveKeys as $reserveKey) {
            $parts = explode(':', $reserveKey);
            $productId = end($parts);
            $quantity = Redis::get($reserveKey) ?? 0;
            
            if ($quantity > 0) {
                Redis::decrby("product_reserved_{$productId}", $quantity);
                Redis::del($reserveKey);
                $this->line("Liberado estoque: Produto {$productId}, Qty: {$quantity}");
            }
        }
    }
}