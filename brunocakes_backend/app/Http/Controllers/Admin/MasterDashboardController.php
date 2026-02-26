<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Branch;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MasterDashboardController extends Controller
{
    /**
     * Dashboard Master - Métricas gerais de todas as filiais
     */
    public function masterMetrics(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isMaster()) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validOrderStatus = ['confirmed', 'completed', 'delivered'];

        // === RANKING DE FILIAIS POR VENDAS ===
        $branchSalesRanking = Branch::where('is_active', true)
            ->select('branches.*')
            ->withCount(['orders as total_orders' => function($q) use ($validOrderStatus) {
                $q->whereIn('status', $validOrderStatus);
            }])
            ->withSum(['orders as total_revenue' => function($q) use ($validOrderStatus) {
                $q->whereIn('status', $validOrderStatus);
            }], 'total_amount')
            ->orderByDesc('total_revenue')
            ->get()
            ->map(function($branch) {
                return [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'code' => $branch->code,
                    'total_orders' => $branch->total_orders ?? 0,
                    'total_revenue' => $branch->total_revenue ?? 0,
                    'is_active' => $branch->is_active,
                    'is_open' => $branch->is_open,
                ];
            });

        // === VENDAS TOTAIS DE TODAS AS FILIAIS ===
        $totalRevenue = Order::whereIn('status', $validOrderStatus)
            ->whereHas('branch', fn($q) => $q->where('is_active', true))
            ->sum('total_amount');

        $totalOrders = Order::whereIn('status', $validOrderStatus)
            ->whereHas('branch', fn($q) => $q->where('is_active', true))
            ->count();

        $totalOrdersToday = Order::whereIn('status', $validOrderStatus)
            ->whereDate('created_at', today())
            ->whereHas('branch', fn($q) => $q->where('is_active', true))
            ->count();

        $revenueToday = Order::whereIn('status', $validOrderStatus)
            ->whereDate('created_at', today())
            ->whereHas('branch', fn($q) => $q->where('is_active', true))
            ->sum('total_amount');

        $revenueThisMonth = Order::whereIn('status', $validOrderStatus)
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->whereHas('branch', fn($q) => $q->where('is_active', true))
            ->sum('total_amount');

        // === MELHOR SEMANA POR FILIAL (últimas 12 semanas) ===
        $branchBestWeeks = [];
        $branches = Branch::where('is_active', true)->get();
        
        foreach ($branches as $branch) {
            $weeklyData = [];
            for ($i = 11; $i >= 0; $i--) {
                $startOfWeek = now()->subWeeks($i)->startOfWeek();
                $endOfWeek = now()->subWeeks($i)->endOfWeek();
                
                $weekRevenue = Order::where('branch_id', $branch->id)
                    ->whereIn('status', $validOrderStatus)
                    ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                    ->sum('total_amount');
                
                $weeklyData[] = [
                    'week' => $startOfWeek->format('d/m'),
                    'revenue' => $weekRevenue,
                ];
            }
            
            // Encontrar melhor semana
            $bestWeek = collect($weeklyData)->sortByDesc('revenue')->first();
            
            $branchBestWeeks[] = [
                'branch_id' => $branch->id,
                'branch_name' => $branch->name,
                'branch_code' => $branch->code,
                'best_week' => $bestWeek['week'],
                'best_week_revenue' => $bestWeek['revenue'],
                'weekly_data' => $weeklyData,
            ];
        }

        return response()->json([
            'branch_sales_ranking' => $branchSalesRanking,
            'branch_best_weeks' => $branchBestWeeks,
            'global_metrics' => [
                'total_revenue' => $totalRevenue,
                'total_orders' => $totalOrders,
                'total_orders_today' => $totalOrdersToday,
                'revenue_today' => $revenueToday,
                'revenue_this_month' => $revenueThisMonth,
            ],
        ]);
    }

    /**
     * Estoque por filial ou geral
     */
    public function stockByBranch(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isMaster()) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $branchId = $request->query('branch_id'); // null = todas as filiais

        if ($branchId) {
            // Estoque de uma filial específica
            $products = Product::where('is_active', true)
                ->with(['stocks' => function($q) use ($branchId) {
                    $q->where('branch_id', $branchId);
                }])
                ->get()
                ->map(function($product) {
                    $stock = $product->stocks->first();
                    return [
                        'id' => $product->id,
                        'name' => $product->name,
                        'quantity' => $stock ? $stock->quantity : 0,
                        'status' => $this->getStockStatus($stock ? $stock->quantity : 0),
                    ];
                });

            $summary = [
                'total_products' => $products->count(),
                'available' => $products->where('status', 'available')->count(),
                'low_stock' => $products->where('status', 'low')->count(),
                'out_of_stock' => $products->where('status', 'out')->count(),
                'total_quantity' => $products->sum('quantity'),
            ];
        } else {
            // Estoque geral de todas as filiais
            $branches = Branch::where('is_active', true)->get();
            $stockByBranch = [];

            foreach ($branches as $branch) {
                $products = Product::where('is_active', true)
                    ->with(['stocks' => function($q) use ($branch) {
                        $q->where('branch_id', $branch->id);
                    }])
                    ->get();

                $totalQuantity = 0;
                $available = 0;
                $low = 0;
                $out = 0;

                foreach ($products as $product) {
                    $stock = $product->stocks->first();
                    $qty = $stock ? $stock->quantity : 0;
                    $totalQuantity += $qty;

                    if ($qty > 3) $available++;
                    elseif ($qty > 0) $low++;
                    else $out++;
                }

                $stockByBranch[] = [
                    'branch_id' => $branch->id,
                    'branch_name' => $branch->name,
                    'branch_code' => $branch->code,
                    'total_products' => $products->count(),
                    'available' => $available,
                    'low_stock' => $low,
                    'out_of_stock' => $out,
                    'total_quantity' => $totalQuantity,
                ];
            }

            // Summary geral
            $summary = [
                'total_branches' => $branches->count(),
                'total_products' => Product::where('is_active', true)->count(),
                'total_quantity' => collect($stockByBranch)->sum('total_quantity'),
                'total_available' => collect($stockByBranch)->sum('available'),
                'total_low_stock' => collect($stockByBranch)->sum('low_stock'),
                'total_out_of_stock' => collect($stockByBranch)->sum('out_of_stock'),
            ];

            $products = $stockByBranch;
        }

        return response()->json([
            'branch_id' => $branchId,
            'products' => $products,
            'summary' => $summary,
        ]);
    }

    /**
     * Produtos mais vendidos por filial ou geral
     */
    public function topProducts(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isMaster()) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $branchId = $request->query('branch_id');
        $period = $request->query('period', 'month'); // week, month, year, all
        $validOrderStatus = ['confirmed', 'completed', 'delivered'];

        $query = OrderItem::select('product_name as name', DB::raw('SUM(quantity) as total_quantity'), DB::raw('SUM(total_price) as total_revenue'))
            ->whereHas('order', function($q) use ($validOrderStatus, $branchId, $period) {
                $q->whereIn('status', $validOrderStatus);
                
                if ($branchId) {
                    $q->where('branch_id', $branchId);
                }

                switch ($period) {
                    case 'week':
                        $q->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]);
                        break;
                    case 'month':
                        $q->whereMonth('created_at', now()->month)
                          ->whereYear('created_at', now()->year);
                        break;
                    case 'year':
                        $q->whereYear('created_at', now()->year);
                        break;
                }
            })
            ->groupBy('product_name')
            ->orderByDesc('total_quantity')
            ->limit(10)
            ->get();

        return response()->json([
            'branch_id' => $branchId,
            'period' => $period,
            'top_products' => $query,
        ]);
    }

    /**
     * Bairros que mais compram por filial ou geral
     */
    public function topNeighborhoods(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isMaster()) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $branchId = $request->query('branch_id');
        $period = $request->query('period', 'month');
        $validOrderStatus = ['confirmed', 'completed', 'delivered'];

        $query = Order::select(
                'address_neighborhood as neighborhood', 
                DB::raw('COUNT(*) as total_orders'), 
                DB::raw('SUM(total_amount) as total_revenue')
            )
            ->whereNotNull('address_neighborhood')
            ->where('address_neighborhood', '!=', '')
            ->whereIn('status', $validOrderStatus);

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        switch ($period) {
            case 'week':
                $query->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]);
                break;
            case 'month':
                $query->whereMonth('created_at', now()->month)
                      ->whereYear('created_at', now()->year);
                break;
            case 'year':
                $query->whereYear('created_at', now()->year);
                break;
        }

        $neighborhoods = $query->groupBy('address_neighborhood')
            ->orderByDesc('total_orders')
            ->limit(10)
            ->get();

        return response()->json([
            'branch_id' => $branchId,
            'period' => $period,
            'top_neighborhoods' => $neighborhoods,
        ]);
    }

    /**
     * Gráficos de evolução temporal (diário, semanal, quinzenal, mensal, anual)
     */
    public function timeSeriesData(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isMaster()) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $branchId = $request->query('branch_id');
        $period = $request->query('period', 'daily'); // daily, weekly, biweekly, monthly, yearly
        $validOrderStatus = ['confirmed', 'completed', 'delivered'];

        $data = [];

        switch ($period) {
            case 'daily':
                // Últimos 30 dias
                for ($i = 29; $i >= 0; $i--) {
                    $date = now()->subDays($i)->startOfDay();
                    $revenue = Order::whereIn('status', $validOrderStatus)
                        ->whereDate('created_at', $date)
                        ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                        ->whereHas('branch', fn($q) => $q->where('is_active', true))
                        ->sum('total_amount');
                    
                    $orders = Order::whereIn('status', $validOrderStatus)
                        ->whereDate('created_at', $date)
                        ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                        ->whereHas('branch', fn($q) => $q->where('is_active', true))
                        ->count();
                    
                    $data[] = [
                        'date' => $date->format('d/m'),
                        'full_date' => $date->format('Y-m-d'),
                        'revenue' => $revenue,
                        'orders' => $orders,
                    ];
                }
                break;

            case 'weekly':
                // Últimas 12 semanas
                for ($i = 11; $i >= 0; $i--) {
                    $startOfWeek = now()->subWeeks($i)->startOfWeek();
                    $endOfWeek = now()->subWeeks($i)->endOfWeek();
                    
                    $revenue = Order::whereIn('status', $validOrderStatus)
                        ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                        ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                        ->whereHas('branch', fn($q) => $q->where('is_active', true))
                        ->sum('total_amount');
                    
                    $orders = Order::whereIn('status', $validOrderStatus)
                        ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                        ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                        ->whereHas('branch', fn($q) => $q->where('is_active', true))
                        ->count();
                    
                    $data[] = [
                        'date' => 'Sem ' . $startOfWeek->format('d/m'),
                        'full_date' => $startOfWeek->format('Y-m-d'),
                        'revenue' => $revenue,
                        'orders' => $orders,
                    ];
                }
                break;

            case 'biweekly':
                // Últimas 12 quinzenas
                for ($i = 11; $i >= 0; $i--) {
                    $startDate = now()->subWeeks($i * 2)->startOfWeek();
                    $endDate = now()->subWeeks($i * 2)->endOfWeek()->addWeek();
                    
                    $revenue = Order::whereIn('status', $validOrderStatus)
                        ->whereBetween('created_at', [$startDate, $endDate])
                        ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                        ->whereHas('branch', fn($q) => $q->where('is_active', true))
                        ->sum('total_amount');
                    
                    $orders = Order::whereIn('status', $validOrderStatus)
                        ->whereBetween('created_at', [$startDate, $endDate])
                        ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                        ->whereHas('branch', fn($q) => $q->where('is_active', true))
                        ->count();
                    
                    $data[] = [
                        'date' => 'Qz ' . $startDate->format('d/m'),
                        'full_date' => $startDate->format('Y-m-d'),
                        'revenue' => $revenue,
                        'orders' => $orders,
                    ];
                }
                break;

            case 'monthly':
                // Últimos 12 meses
                for ($i = 11; $i >= 0; $i--) {
                    $month = now()->subMonths($i);
                    
                    $revenue = Order::whereIn('status', $validOrderStatus)
                        ->whereMonth('created_at', $month->month)
                        ->whereYear('created_at', $month->year)
                        ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                        ->whereHas('branch', fn($q) => $q->where('is_active', true))
                        ->sum('total_amount');
                    
                    $orders = Order::whereIn('status', $validOrderStatus)
                        ->whereMonth('created_at', $month->month)
                        ->whereYear('created_at', $month->year)
                        ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                        ->whereHas('branch', fn($q) => $q->where('is_active', true))
                        ->count();
                    
                    $data[] = [
                        'date' => $month->format('M/y'),
                        'full_date' => $month->format('Y-m-01'),
                        'revenue' => $revenue,
                        'orders' => $orders,
                    ];
                }
                break;

            case 'yearly':
                // Últimos 5 anos
                for ($i = 4; $i >= 0; $i--) {
                    $year = now()->subYears($i)->year;
                    
                    $revenue = Order::whereIn('status', $validOrderStatus)
                        ->whereYear('created_at', $year)
                        ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                        ->whereHas('branch', fn($q) => $q->where('is_active', true))
                        ->sum('total_amount');
                    
                    $orders = Order::whereIn('status', $validOrderStatus)
                        ->whereYear('created_at', $year)
                        ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                        ->whereHas('branch', fn($q) => $q->where('is_active', true))
                        ->count();
                    
                    $data[] = [
                        'date' => (string)$year,
                        'full_date' => $year . '-01-01',
                        'revenue' => $revenue,
                        'orders' => $orders,
                    ];
                }
                break;
        }

        return response()->json([
            'period' => $period,
            'branch_id' => $branchId,
            'data' => $data,
        ]);
    }

    private function getStockStatus($quantity)
    {
        if ($quantity > 3) return 'available';
        if ($quantity > 0) return 'low';
        return 'out';
    }
}
