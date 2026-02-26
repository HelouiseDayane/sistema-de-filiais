<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Product;
use Illuminate\Support\Facades\Redis;

class SyncAndMonitorStock extends Command
{
    protected $signature = 'stock:sync-monitor';
    protected $description = 'Sincroniza e monitora estoque no Redis';

    public function handle()
    {
        $this->info('Iniciando sincronização...');
        
        $products = Product::all();
        $bar = $this->output->createProgressBar($products->count());
        
        foreach ($products as $product) {
            Redis::set("product_stock_{$product->id}", $product->quantity);
            $bar->advance();
        }
        
        $bar->finish();
        $this->newLine();
        $this->info("✅ {$products->count()} produtos sincronizados!");
        
        // Mostra estatísticas
        $this->info("\n📊 Estatísticas Redis:");
        $keys = Redis::keys('product_stock_*');
        $this->info("🔢 Total de produtos no Redis: " . count($keys));
        
        // Mostra operações recentes
        $operations = Redis::lrange('stock_operations', 0, 4);
        if (!empty($operations)) {
            $this->info("\n📝 Últimas operações:");
            foreach ($operations as $op) {
                $this->line("   • {$op}");
            }
        }
    }
}