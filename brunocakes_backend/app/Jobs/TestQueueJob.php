<?php
namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class TestQueueJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $message;

    public function __construct($message = 'Teste da fila')
    {
        $this->message = $message;
    }

    public function handle()
    {
        Log::info('🟢 FILA FUNCIONANDO!', [
            'message' => $this->message,
            'timestamp' => now()->format('H:i:s'),
            'job_id' => $this->job->getJobId()
        ]);
        
        echo "✅ Job executado: {$this->message}\n";
    }
}