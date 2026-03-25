<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\BranchPayment;
use App\Models\Order;
use Illuminate\Http\Request;
use Carbon\Carbon;

class BranchPaymentController extends Controller
{
    /**
     * Listar todos os pagamentos (apenas master)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isMaster()) {
            return response()->json(['message' => 'Acesso negado'], 403);
        }

        $payments = BranchPayment::with('branch')
            ->orderBy('period_end', 'desc')
            ->get();

        foreach ($payments as $payment) {
            $ordersCount = Order::where('branch_id', $payment->branch_id)
                ->whereIn('status', ['confirmed', 'completed', 'delivered'])
                ->count();
            $totalSales = Order::where('branch_id', $payment->branch_id)
                ->whereIn('status', ['confirmed', 'completed', 'delivered'])
                ->sum('total_amount');
            \Log::info('DEBUG PAGAMENTOS INDEX', [
                'branch_id' => $payment->branch_id,
                'total_sales' => $totalSales,
                'orders_count' => $ordersCount,
            ]);
        }

        return response()->json($payments);
    }

    /**
     * Calcular vendas e gerar pagamentos pendentes para o período
     */
    public function calculatePayments(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isMaster()) {
            return response()->json(['message' => 'Acesso negado'], 403);
        }

        $branches = Branch::where('is_active', true)->get();
        $createdPayments = [];

        foreach ($branches as $branch) {
            // Determinar período baseado na frequência
            $frequency = $branch->payment_frequency ?? 'mensal';
            $now = Carbon::now();
            
            switch ($frequency) {
                case 'quinzenal':
                    $periodStart = $now->copy()->subDays(15);
                    break;
                case 'trimestral':
                    $periodStart = $now->copy()->subMonths(3);
                    break;
                default: // mensal
                    $periodStart = $now->copy()->subMonth();
            }
            
            $periodEnd = $now->copy();

            // Calcular total de vendas no período
            $totalSales = Order::where('branch_id', $branch->id)
                ->whereIn('status', ['confirmed', 'completed', 'delivered'])
                ->sum('total_amount');

            if ($totalSales > 0) {
                $profitPercentage = $branch->profit_percentage ?? 100;
                $commissionAmount = ($totalSales * $profitPercentage) / 100;

                // Atualiza ou cria registro de pagamento do período
                $payment = BranchPayment::updateOrCreate(
                    [
                        'branch_id' => $branch->id,
                        'period_start' => $periodStart,
                        'period_end' => $periodEnd,
                    ],
                    [
                        'total_sales' => $totalSales,
                        'profit_percentage' => $profitPercentage,
                        'commission_amount' => $commissionAmount,
                        'status' => 'pendente',
                    ]
                );

                $createdPayments[] = $payment;
            }
        }

        return response()->json([
            'message' => 'Pagamentos calculados com sucesso',
            'payments' => $createdPayments
        ]);
    }

    /**
     * Dar baixa em um pagamento (marcar como pago)
     */
    public function markAsPaid(Request $request, $id)
    {
        $user = $request->user();
        
        if (!$user->isMaster()) {
            return response()->json(['message' => 'Acesso negado'], 403);
        }

        $payment = BranchPayment::findOrFail($id);

        $validated = $request->validate([
            'paid_amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $payment->update([
            'paid_amount' => $validated['paid_amount'],
            'status' => 'pago',
            'paid_at' => Carbon::now(),
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'Pagamento confirmado com sucesso',
            'payment' => $payment->load('branch')
        ]);
    }

    /**
     * Dashboard de vendas por filial
     */
    public function dashboard(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isMaster()) {
            return response()->json(['message' => 'Acesso negado'], 403);
        }

        $branches = Branch::where('is_active', true)->get();
        $dashboard = [];

        foreach ($branches as $branch) {
            // Vendas totais (confirmed, completed, delivered)
            $totalSales = Order::where('branch_id', $branch->id)
                ->whereIn('status', ['confirmed', 'completed', 'delivered'])
                ->sum('total_amount');

            \Log::info('[DASHBOARD_DEBUG]', [
                'branch_id' => $branch->id,
                'branch_name' => $branch->name,
                'total_sales' => $totalSales,
            ]);

            // Pagamentos pendentes
            $pendingPayments = BranchPayment::where('branch_id', $branch->id)
                ->where('status', 'pendente')
                ->sum('commission_amount');

            // Pagamentos realizados
            $paidPayments = BranchPayment::where('branch_id', $branch->id)
                ->where('status', 'pago')
                ->sum('paid_amount');

            $dashboard[] = [
                'branch' => $branch,
                'total_sales' => $totalSales,
                'pending_amount' => $pendingPayments,
                'paid_amount' => $paidPayments,
                'pix_key' => $branch->pix_key,
                'payment_frequency' => $branch->payment_frequency,
                'profit_percentage' => $branch->profit_percentage,
            ];
        }

        return response()->json($dashboard);
    }
}
