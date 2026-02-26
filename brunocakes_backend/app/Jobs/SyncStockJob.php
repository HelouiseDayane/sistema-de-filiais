<?php

namespace App\Jobs;

use App\Models\Product;
use App\Models\ProductStock;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

class SyncStockJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $productId;
    protected $branchId;

    public function __construct($productId, $branchId)
    {
        $this->productId = $productId;
        $this->branchId = $branchId;
    }

    public function handle()
    {
        $product = Product::find($this->productId);
        if (!$product) {
            Log::warning("SyncStockJob: Produto não encontrado", ['product_id' => $this->productId]);
            return;
        }

        $stockKey = "product_stock_{$this->branchId}_{$this->productId}";
        $redisStock = Redis::get($stockKey);
        
        // Buscar ou criar o registro de estoque para esta filial
        $productStock = ProductStock::firstOrCreate(
            [
                'product_id' => $this->productId,
                'branch_id' => $this->branchId
            ],
            ['quantity' => 0]
        );
        
        $mysqlStock = $productStock->quantity;
        Log::info("SyncStockJob: Estoque antes da sync", [
            'product_id' => $this->productId,
            'branch_id' => $this->branchId,
            'redisStock' => $redisStock,
            'mysqlStock' => $mysqlStock
        ]);

        // Sempre atualiza o MySQL com o valor do Redis
        $productStock->update(['quantity' => $redisStock]);
        Log::info("SyncStockJob: MySQL atualizado para o valor do Redis", [
            'product_id' => $this->productId,
            'branch_id' => $this->branchId,
            'novo_mysqlStock' => $redisStock
        ]);

        // Garante que Redis está atualizado
        Redis::set($stockKey, $redisStock);
        Log::info("SyncStockJob: Estoque após sync", [
            'product_id' => $this->productId,
            'branch_id' => $this->branchId,
            'redisStock_final' => Redis::get($stockKey),
            'mysqlStock_final' => $redisStock
        ]);
    }
}
