<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;

class EngagementController extends Controller
{
    // Registrar visitante único
    public function registerVisitor(Request $request)
    {
        $sessionId = $request->input('session_id');
        if ($sessionId) {
            Redis::incr('pwa_installs');
        }
        return response()->json(['ok' => true]);
    }

    // Registrar instalação PWA
    public function registerPwaInstall(Request $request)
    {
        Redis::incr('pwa_installs');
        return response()->json(['ok' => true]);
    }

    // Registrar carrinho com produto (opcional, pois já é contado no dashboard)
    public function registerCartWithProduct(Request $request)
    {
        $sessionId = $request->input('session_id');
        if ($sessionId) {
            Redis::sadd('carts_with_products', $sessionId);
        }
        return response()->json(['ok' => true]);
    }
}
