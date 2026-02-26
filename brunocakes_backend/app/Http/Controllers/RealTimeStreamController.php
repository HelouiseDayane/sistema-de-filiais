<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RealTimeStreamController extends Controller
{
    /**
     * Endpoint SSE para eventos em tempo real
     */
    public function streamUpdates(Request $request)
    {
        return new StreamedResponse(function () {
            // Headers SSE
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');

            // Loop para enviar eventos
            $lastId = null;
            while (true) {
                // Buscar último evento WhatsApp
                $event = Cache::get('last_whatsapp_status_event');
                if ($event && $event['id'] !== $lastId) {
                    echo "event: whatsapp_status\n";
                    echo "data: " . json_encode([
                        'type' => 'whatsapp_status',
                        'data' => $event['data'],
                    ]) . "\n\n";
                    ob_flush();
                    flush();
                    $lastId = $event['id'];
                }
                // Espera 2 segundos
                sleep(2);
            }
        });
    }
}
