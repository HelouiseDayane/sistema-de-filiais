<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Http\Controllers\Controller;

class GeocodeController extends Controller
{
    public function reverse(Request $request)
    {
        $lat = $request->input('lat');
        $lon = $request->input('lon');
        if (!$lat || !$lon) {
            return response()->json(['error' => 'Latitude e longitude são obrigatórios'], 400);
        }
        $url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={$lat}&lon={$lon}";
        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'User-Agent' => 'BrunoCakes/1.0 (contato@brunocakes.com)'
                ])
                ->get($url);
            if ($response->failed()) {
                $body = $response->body();
                // Força encoding UTF-8 e remove caracteres inválidos
                $bodyUtf8 = mb_convert_encoding($body, 'UTF-8', 'UTF-8');
                \Log::error('Geocode Nominatim erro', [
                    'status' => $response->status(),
                    'body' => $bodyUtf8,
                    'url' => $url,
                    'lat' => $lat,
                    'lon' => $lon
                ]);
                return response()->json(['error' => 'Falha ao buscar endereço'], 500, [], JSON_UNESCAPED_UNICODE);
            }
            return response()->json($response->json(), 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            \Log::error('Geocode Nominatim exception', [
                'message' => $e->getMessage(),
                'url' => $url,
                'lat' => $lat,
                'lon' => $lon
            ]);
            return response()->json(['error' => 'Exceção ao buscar endereço'], 500);
        }
    }
}
