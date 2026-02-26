<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Products;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class DashboardController extends Controller
{
    /**
     * @OA\Get(
     *      path="/api/admin/dashboard",
     *      operationId="getDashboardData",
     *      tags={"Admin Dashboard"},
     *      summary="Dados do dashboard administrativo",
     *      description="Retorna métricas e estatísticas para o painel administrativo",
     *      security={{"sanctum": {}}},
     *      @OA\Response(
     *          response=200,
     *          description="Dados do dashboard",
     *          @OA\JsonContent(
     *              @OA\Property(property="engagement_metrics", type="object",
     *                  @OA\Property(property="total_carts_with_products", type="integer", example=15),
     *                  @OA\Property(property="conversion_rate", type="number", format="float", example=12.5),
     *                  @OA\Property(property="abandoned_cart_rate", type="number", format="float", example=87.5)
     *              ),
     *              @OA\Property(property="sales_metrics", type="object",
     *                  @OA\Property(property="orders_today", type="integer", example=8),
     *                  @OA\Property(property="revenue_today", type="number", format="float", example=450.50),
     *                  @OA\Property(property="total_orders", type="integer", example=125),
     *                  @OA\Property(property="total_revenue", type="number", format="float", example=12500.75),
     *                  @OA\Property(property="pending_orders", type="integer", example=3),
     *                  @OA\Property(property="confirmed_orders", type="integer", example=5)
     *              ),
     *              @OA\Property(property="product_metrics", type="object",
     *                  @OA\Property(property="low_stock_products", type="integer", example=2),
     *                  @OA\Property(property="out_of_stock_products", type="integer", example=1),
     *                  @OA\Property(property="best_selling_products", type="array", @OA\Items(type="object"))
     *              )
     *          )
     *      ),
     *      @OA\Response(
     *          response=401,
     *          description="Não autorizado"
     *      )
     * )
     */
    public function index(Request $request)
    {
    $user = $request->user();
    $today = now()->toDateString();

    // Determinar qual filial filtrar
    $branchId = null;
    if ($user->isMaster()) {
        // Master pode ver todas ou escolher uma filial específica
        $branchId = $request->query('branch_id');
    } else {
        // Admin e Employee veem apenas sua filial
        $branchId = $user->branch_id;
    }

    // === MÉTRICAS DE ENGAJAMENTO ===
    // 1. Carrinhos com produtos (mock: Redis ou tabela carts, aqui exemplo Redis)
    $totalCartsWithProducts = 0;
    if (class_exists('Redis')) {
        try {
            $uniqueCarts = Redis::keys('cart:*');
            foreach ($uniqueCarts as $cartKey) {
                $cart = json_decode(Redis::get($cartKey), true);
                if (is_array($cart) && count($cart) > 0) {
                    $totalCartsWithProducts++;
                }
            }
        } catch (\Exception $e) {
            $totalCartsWithProducts = 0;
        }
    }

    // 2. Visitantes únicos (mock: Redis set 'unique_visitors')
    $uniqueVisitors = 0;
    if (class_exists('Redis')) {
        try {
            $uniqueVisitors = Redis::scard('unique_visitors');
        } catch (\Exception $e) {
            $uniqueVisitors = 0;
        }
    }

    // 3. Instalações PWA (mock: Redis key 'pwa_installs')
    $pwaInstalls = 0;
    if (class_exists('Redis')) {
        try {
            $pwaInstalls = (int) (Redis::get('pwa_installs') ?? 0);
        } catch (\Exception $e) {
            $pwaInstalls = 0;
        }
    }

    // Considera apenas pedidos não cancelados e pagamento confirmado ou pago
    $validOrderStatus = ['confirmed', 'completed', 'delivered'];

    // Aplicar filtro de filial em todas as queries de Orders
    $salesByDay = Order::whereDate('created_at', $today)
        ->whereIn('status', $validOrderStatus)
        ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
        ->sum('total_amount');

    $ordersByDay = Order::whereDate('created_at', $today)
        ->whereIn('status', $validOrderStatus)
        ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
        ->count();

    $salesByMonth = Order::whereMonth('created_at', now()->month)
        ->whereIn('status', $validOrderStatus)
        ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
        ->sum('total_amount');

    $ordersByMonth = Order::whereMonth('created_at', now()->month)
        ->whereIn('status', $validOrderStatus)
        ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
        ->count();

    $salesByYear = Order::whereYear('created_at', now()->year)
        ->whereIn('status', $validOrderStatus)
        ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
        ->sum('total_amount');

    // ✅ Top produtos (somente confirmados ou pagos)
    $topProductWeek = OrderItem::select('product_name', DB::raw('SUM(quantity) as qty'))
        ->whereHas('order', function($q) use ($validOrderStatus, $branchId) {
            $q->whereIn('status', $validOrderStatus);
            if ($branchId) {
                $q->where('branch_id', $branchId);
            }
        })
        ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
        ->groupBy('product_name')
        ->orderByDesc('qty')
        ->first();

    $topProductsMonth = OrderItem::select('product_name as name', DB::raw('SUM(quantity) as quantity'), DB::raw('SUM(total_price) as revenue'))
        ->whereHas('order', function($q) use ($validOrderStatus, $branchId) {
            $q->whereIn('status', $validOrderStatus);
            $q->whereMonth('created_at', now()->month);
            if ($branchId) {
                $q->where('branch_id', $branchId);
            }
        })
        ->groupBy('product_name')
        ->orderByDesc('quantity')
        ->limit(5)
        ->get();
        
    // ✅ Top bairro (somente confirmados ou pagos)
    $neighborhoodsSales = Order::select('address_neighborhood as neighborhood', DB::raw('COUNT(*) as sales'), DB::raw('SUM(total_amount) as revenue'))
        ->whereNotNull('address_neighborhood')
        ->where('address_neighborhood', '!=', '')
        ->whereIn('status', $validOrderStatus)
        ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
        ->groupBy('address_neighborhood')
        ->orderByDesc('sales')
        ->limit(10)
        ->get();

    // ✅ Faturamento total (somente confirmados ou pagos)
    $totalRevenue = Order::whereIn('status', $validOrderStatus)
        ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
        ->sum('total_amount');

    // ✅ Estatísticas de tickets (status puro da ordem, não do pagamento)
    $ticketStats = [
        'total_created' => Order::when($branchId, fn($q) => $q->where('branch_id', $branchId))->count(),
        'pending_payment' => Order::where('status', 'pending_payment')->when($branchId, fn($q) => $q->where('branch_id', $branchId))->count(),
        'awaiting_confirmation' => Order::where('status', 'awaiting_seller_confirmation')->when($branchId, fn($q) => $q->where('branch_id', $branchId))->count(),
        'confirmed' => Order::where('status', 'confirmed')->when($branchId, fn($q) => $q->where('branch_id', $branchId))->count(),
        'completed' => Order::where('status', 'completed')->when($branchId, fn($q) => $q->where('branch_id', $branchId))->count(),
        'canceled' => Order::where('status', 'canceled')->when($branchId, fn($q) => $q->where('branch_id', $branchId))->count(),
        // Estatísticas de pagamento
        'payments_pending' => Payment::where('status', 'pending')->count(),
        'payments_paid' => Payment::where('status', 'paid')->count(),
        'payments_failed' => Payment::where('status', 'failed')->count(),
        // Estatísticas do mês atual
        'tickets_this_month' => Order::whereMonth('created_at', now()->month)->when($branchId, fn($q) => $q->where('branch_id', $branchId))->count(),
        'paid_this_month' => Order::whereMonth('created_at', now()->month)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->whereHas('payment', function($query) {
                $query->where('status', 'paid');
            })->count(),
        'canceled_this_month' => Order::whereMonth('created_at', now()->month)
            ->where('status', 'canceled')
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->count(),
    ];

    // === MÉTRICAS DE ESTOQUE ===
    $lowStockThreshold = 3;
    $lowStockProducts = 0;
    $outOfStockProducts = 0;
    $availableProducts = 0;
    $totalProducts = 0;
    
    // Buscar produtos com seus estoques por filial
    $productsQuery = \App\Models\Product::where('is_active', true)
        ->with(['stocks' => function($query) use ($branchId) {
            if ($branchId) {
                $query->where('branch_id', $branchId);
            }
        }]);
    
    if ($branchId) {
        // Se filtrar por filial, só conta produtos dessa filial
        $productsQuery->where('branch_id', $branchId);
    }
    
    $products = $productsQuery->get();
        
    foreach ($products as $product) {
        // Calcular estoque real somando todos os stocks da filial filtrada
        $realStock = $product->stocks->sum('quantity');
        $totalProducts++;
        
        if ($realStock > $lowStockThreshold) {
            $availableProducts++;
        } elseif ($realStock > 0 && $realStock <= $lowStockThreshold) {
            $lowStockProducts++;
        } elseif ($realStock == 0) {
            $outOfStockProducts++;
        }
    }

    return response()->json([
        'sales_today' => $salesByDay,
        'orders_today' => $ordersByDay,
        'sales_month' => $salesByMonth,
        'orders_month' => $ordersByMonth,
        'sales_year' => $salesByYear,
        'top_product_week' => $topProductWeek,
        'top_products_month' => $topProductsMonth,
        'neighborhoods_sales' => $neighborhoodsSales,
        'total_revenue' => $totalRevenue,
        'ticket_statistics' => $ticketStats,
        'engagement' => [
            'carts_with_products' => $totalCartsWithProducts,
            'unique_visitors' => $uniqueVisitors,
            'pwa_installs' => $pwaInstalls,
        ],
        'product_metrics' => [
            'available_products' => $availableProducts,
            'low_stock_products' => $lowStockProducts,
            'out_of_stock_products' => $outOfStockProducts,
            'total_products' => $totalProducts,
        ],
        'filtered_by_branch' => $branchId,
        'user_role' => $user->role,
    ]);
    }

}