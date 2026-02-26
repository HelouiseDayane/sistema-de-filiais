<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * Verifica se o usuário tem uma das roles permitidas
     * Uso: ->middleware('role:master,admin')
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Não autenticado'
            ], 401);
        }

        // Verificar se o usuário tem uma das roles permitidas
        if (!in_array($user->role, $roles)) {
            return response()->json([
                'message' => 'Acesso negado. Você não tem permissão para acessar este recurso.',
                'required_roles' => $roles,
                'your_role' => $user->role
            ], 403);
        }

        return $next($request);
    }
}
