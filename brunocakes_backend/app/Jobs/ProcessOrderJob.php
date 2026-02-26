<?php

namespace App\Jobs;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProcessOrderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $orderId;

    public function __construct($orderId)
    {
        $this->orderId = $orderId;
    }

    public function handle()
    {
        DB::transaction(function () {
            $order = Order::with('items.product')->findOrFail($this->orderId);

            // Decrementa estoque (reserva) assim que o pedido for processado
            foreach ($order->items as $item) {
                $product = Product::where('id', $item->product_id)
                    ->lockForUpdate()
                    ->first();

                if ($product->quantity < $item->quantity) {
                    // Estoque insuficiente → cancela pedido
                    $order->status = 'failed_stock';
                    $order->save();

                    // Devolve produtos que já tinham sido decrementados
                    foreach ($order->items as $i) {
                        $i->product->increment('quantity', $i->quantity);
                    }
                    return;
                }

                // Decrementa estoque (reserva)
                $product->decrement('quantity', $item->quantity);
            }

            $order->status = 'stock_reserved';
            $order->save();
        });
    }

    // Método para reverter o estoque se o pagamento não for confirmado

    public function revertStock()
    {
        $order = Order::with('items.product')->find($this->orderId);

        if (!$order) {
            Log::warning("Pedido {$this->orderId} não encontrado para reverter estoque");
            return;
        }

        foreach ($order->items as $item) {
            if ($item->product) {
                // ✅ CORRIGIR: usar 'quantity' em vez de 'stock'
                $item->product->increment('quantity', $item->quantity);
                
                Log::info("Estoque revertido", [
                    'product_id' => $item->product->id,
                    'quantity_reverted' => $item->quantity,
                    'new_quantity' => $item->product->quantity // ✅ 'quantity' não 'stock'
                ]);
            }
        }

        // ✅ NÃO atualizar status aqui (Controller já faz)
        Log::info("Estoque revertido para pedido {$this->orderId}");
    }
}
