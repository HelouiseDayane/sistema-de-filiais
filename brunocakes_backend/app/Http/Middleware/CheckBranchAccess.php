<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckBranchAccess
{
    /**
     * Handle an incoming request.
     *
     * Verifica se o usuário tem acesso à filial requisitada
     * Master: acessa todas as filiais
     * Admin/Employee: apenas sua própria filial
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Não autenticado'
            ], 401);
        }

        // Master pode acessar todas as filiais
        if ($user->isMaster()) {
            return $next($request);
        }

        // Para outros roles, verificar se está tentando acessar dados de outra filial
        $requestedBranchId = $request->input('branch_id') ?? 
                            $request->route('branch_id') ?? 
                            $request->query('branch_id');

        // Se não especificou filial, está ok (usará a do usuário)
        if (!$requestedBranchId) {
            return $next($request);
        }

        // Verificar se está tentando acessar sua própria filial
        if ($requestedBranchId != $user->branch_id) {
            return response()->json([
                'message' => 'Acesso negado. Você só pode acessar dados da sua filial.',
                'your_branch_id' => $user->branch_id,
                'requested_branch_id' => $requestedBranchId
            ], 403);
        }

        return $next($request);
    }
}
