<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Redis;

class RedisFlushAll extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'redis:flushall';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Executa FLUSHALL no Redis (limpa todos os dados)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        try {
            Redis::connection('stock')->flushall();
            $this->info('Redis FLUSHALL executado com sucesso!');
        } catch (\Exception $e) {
            $this->error('Erro ao executar FLUSHALL: ' . $e->getMessage());
            return 1;
        }
        return 0;
    }
}
