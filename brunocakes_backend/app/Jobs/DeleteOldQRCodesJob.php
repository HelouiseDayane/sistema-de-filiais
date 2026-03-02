<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class DeleteOldQRCodesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $filename;

    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct($filename)
    {
        $this->filename = $filename;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        $path = 'tmp_qrcodes/' . $this->filename;
        if (Storage::disk('local')->exists($path)) {
            Storage::disk('local')->delete($path);
            Log::info('[DeleteOldQRCodesJob] QR Code apagado', ['file' => $path]);
        } else {
            Log::info('[DeleteOldQRCodesJob] QR Code não encontrado para apagar', ['file' => $path]);
        }
    }
}
