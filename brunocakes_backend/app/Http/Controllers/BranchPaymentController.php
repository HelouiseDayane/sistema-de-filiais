<?php

namespace App\Http\Controllers;

use App\Models\BranchPayment;
use App\Models\Branch;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class BranchPaymentController extends Controller
{
    /**
     * Listar todos os pagamentos
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        if (!$user || $user->role !== 'master') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $payments = BranchPayment::with('branch')
            ->orderBy('period_start', 'desc')
            ->get();

        return response()->json($payments);
    }

    /**
     * Dashboard com vendas agregadas por filial
     */
    public function dashboard(Request $request)
    {
        $user = $request->user();
        
        if (!$user || $user->role !== 'master') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $branches = Branch::all();
        $dashboard = [];

        foreach ($branches as $branch) {
            // Total de vendas da filial (pedidos concluídos)
            $totalSales = Order::where('branch_id', $branch->id)
                ->where('status', 'concluido')
                ->sum('total_amount');

            // Pagamentos pendentes
            $pendingAmount = BranchPayment::where('branch_id', $branch->id)
                ->where('status', 'pendente')
                ->sum('commission_amount');

            // Pagamentos realizados
            $paidAmount = BranchPayment::where('branch_id', $branch->id)
                ->where('status', 'pago')
                ->sum('paid_amount');

            $dashboard[] = [
                'branch' => [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'code' => $branch->code,
                    'pix_key' => $branch->pix_key,
                    'payment_frequency' => $branch->payment_frequency,
                    'profit_percentage' => $branch->profit_percentage,
                ],
                'total_sales' => (float) $totalSales,
                'pending_amount' => (float) $pendingAmount,
                'paid_amount' => (float) $paidAmount,
            ];
        }

        return response()->json($dashboard);
    }

    /**
     * Calcular pagamentos do período baseado na periodicidade de cada filial
     */
    public function calculatePayments(Request $request)
    {
        $user = $request->user();
        
        if (!$user || $user->role !== 'master') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $branches = Branch::all();
        $created = 0;

        foreach ($branches as $branch) {
            // Determinar o período baseado na frequência
            $frequency = $branch->payment_frequency ?? 'mensal';
            $now = Carbon::now();
            
            switch ($frequency) {
                case 'quinzenal':
                    $periodStart = $now->copy()->subDays(15)->startOfDay();
                    break;
                case 'trimestral':
                    $periodStart = $now->copy()->subMonths(3)->startOfDay();
                    break;
                case 'mensal':
                default:
                    $periodStart = $now->copy()->subMonth()->startOfDay();
                    break;
            }
            
            $periodEnd = $now->copy()->endOfDay();

            // Verificar se já existe pagamento para esse período
            $existingPayment = BranchPayment::where('branch_id', $branch->id)
                ->where('period_start', '>=', $periodStart)
                ->where('period_end', '<=', $periodEnd)
                ->first();

            if ($existingPayment) {
                continue; // Já existe pagamento para este período
            }

            // Calcular total de vendas do período
            $totalSales = Order::where('branch_id', $branch->id)
                ->where('status', 'concluido')
                ->whereBetween('created_at', [$periodStart, $periodEnd])
                ->sum('total_amount');

            // Calcular comissão baseada no percentual de lucro
            $profitPercentage = $branch->profit_percentage ?? 100;
            $commissionAmount = ($totalSales * $profitPercentage) / 100;

            // Criar registro de pagamento
            BranchPayment::create([
                'branch_id' => $branch->id,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'total_sales' => $totalSales,
                'profit_percentage' => $profitPercentage,
                'commission_amount' => $commissionAmount,
                'paid_amount' => 0,
                'status' => 'pendente',
            ]);

            $created++;
        }

        return response()->json([
            'message' => "$created pagamento(s) calculado(s) com sucesso",
            'created' => $created
        ]);
    }

    /**
     * Dar baixa em um pagamento (marcar como pago)
     */
    public function markAsPaid(Request $request, $id)
    {
        $user = $request->user();
        
        if (!$user || $user->role !== 'master') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'paid_amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        $payment = BranchPayment::findOrFail($id);

        $payment->update([
            'paid_amount' => $validated['paid_amount'],
            'status' => 'pago',
            'paid_at' => now(),
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'Pagamento confirmado com sucesso',
            'payment' => $payment->load('branch')
        ]);
    }
}
