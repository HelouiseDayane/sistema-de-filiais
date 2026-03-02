<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;  
use App\Models\Address;  
use Illuminate\Http\Request;  
use App\Jobs\ProcessOrderJob;  
use Illuminate\Support\Facades\Log; // Adicione esta linha no início do arquivo


class OrderAdminController extends Controller {

    /**
     * @OA\Get(
     *      path="/api/admin/analytics/customers",
     *      operationId="getCustomerAnalytics",
     *      tags={"Admin Analytics"},
     *      summary="Estatísticas de clientes",
     *      description="Retorna estatísticas de clientes baseadas em pedidos confirmados ou completos",
     *      security={{"sanctum": {}}},
     *      @OA\Response(
     *          response=200,
     *          description="Estatísticas dos clientes",
     *          @OA\JsonContent(
     *              @OA\Property(property="total_clients", type="integer", example=150),
     *              @OA\Property(property="active_clients", type="integer", example=45),
     *              @OA\Property(property="new_clients", type="integer", example=12),
     *              @OA\Property(property="avg_order_value", type="number", format="float", example=87.50),
     *              @OA\Property(property="retention_rate", type="number", format="float", example=30.5)
     *          )
     *      ),
     *      @OA\Response(
     *          response=401,
     *          description="Não autorizado"
     *      )
     * )
     */
    public function getCustomerAnalytics(Request $request)
    {
        $user = $request->user();
        $validStatuses = ['confirmed', 'completed'];

        // Determinar filial
        $branchId = null;
        if ($user->isMaster()) {
            $branchId = $request->query('branch_id');
        } else {
            $branchId = $user->branch_id;
        }

        // Total de clientes únicos com pelo menos 1 pedido confirmado ou finalizado
        $totalClients = Order::whereIn('status', $validStatuses)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->distinct('customer_email')
            ->count('customer_email');

        // Clientes ativos: último pedido confirmado/finalizado nos últimos 30 dias
        $thirtyDaysAgo = now()->subDays(30);
        $activeClients = Order::whereIn('status', $validStatuses)
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->distinct('customer_email')
            ->count('customer_email');

        // Receita total de pedidos confirmados/finalizados
        $totalRevenue = Order::whereIn('status', $validStatuses)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->sum('total_amount');

        // Ticket médio por cliente
        $averageTicket = $totalClients > 0 ? $totalRevenue / $totalClients : 0;

        // Top clientes por valor gasto
        $topClients = Order::whereIn('status', $validStatuses)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->select('customer_name as name', 'customer_email as email', \DB::raw('COUNT(*) as totalOrders'), \DB::raw('SUM(total_amount) as totalSpent'), \DB::raw('MAX(created_at) as lastOrderDate'))
            ->groupBy('customer_email', 'customer_name')
            ->orderByDesc('totalSpent')
            ->limit(5)
            ->get();

        // Cliente mais frequente
        $mostFrequentClient = Order::whereIn('status', $validStatuses)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->select('customer_name as name', 'customer_email as email', \DB::raw('COUNT(*) as totalOrders'))
            ->groupBy('customer_email', 'customer_name')
            ->orderByDesc('totalOrders')
            ->first();

        // Cliente que mais gastou
        $biggestSpender = Order::whereIn('status', $validStatuses)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->select('customer_name as name', 'customer_email as email', \DB::raw('SUM(total_amount) as totalSpent'))
            ->groupBy('customer_email', 'customer_name')
            ->orderByDesc('totalSpent')
            ->first();

        // Taxa de retenção: clientes com pelo menos 2 pedidos confirmados/finalizados / total de clientes únicos
        $retainedClients = Order::whereIn('status', $validStatuses)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->select('customer_email', \DB::raw('COUNT(*) as total_orders'))
            ->groupBy('customer_email')
            ->havingRaw('COUNT(*) >= 2')
            ->count();
        $retentionRate = $totalClients > 0 ? round(($retainedClients / $totalClients) * 100, 1) : 0;

        return response()->json([
            'total_clients' => $totalClients,
            'active_clients' => $activeClients,
            'total_clients_revenue' => $totalRevenue,
            'average_ticket' => $averageTicket,
            'top_clients' => $topClients,
            'most_frequent_client' => $mostFrequentClient,
            'biggest_spender' => $biggestSpender,
            'retention_rate' => $retentionRate,
        ]);
    }
    
    /**
     * @OA\Get(
     *      path="/api/admin/orders",
     *      operationId="getOrdersList",
     *      tags={"Admin Orders"},
     *      summary="Listar todos os pedidos",
     *      description="Retorna lista de todos os pedidos com itens e pagamentos",
     *      security={{"sanctum": {}}},
     *      @OA\Response(
     *          response=200,
     *          description="Lista de pedidos",
     *          @OA\JsonContent(
     *              type="array",
     *              @OA\Items(ref="#/components/schemas/Order")
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
        
        $query = Order::with('items', 'payment');
        
        // Filtrar por filial
        if ($user->isMaster()) {
            // Master pode ver todos ou filtrar por filial
            $branchId = $request->query('branch_id');
            if ($branchId) {
                $query->where('branch_id', $branchId);
            }
        } else {
            // Admin e Employee veem apenas pedidos da sua filial
            $query->where('branch_id', $user->branch_id);
        }
        
        return response()->json($query->latest()->get());
    }

    /**
     * @OA\Post(
     *      path="/api/admin/orders/approve-payment",
     *      operationId="approvePayment",
     *      tags={"Admin Orders"},
     *      summary="Aprovar pagamentos",
     *      description="Aprova pagamentos de múltiplos pedidos",
     *      security={{"sanctum": {}}},
     *      @OA\RequestBody(
     *          required=true,
     *          @OA\JsonContent(
     *              required={"order_ids"},
     *              @OA\Property(property="order_ids", type="array", @OA\Items(type="integer"), example={1, 2, 3})
     *          )
     *      ),
     *      @OA\Response(
     *          response=200,
     *          description="Pagamentos aprovados com sucesso",
     *          @OA\JsonContent(
     *              @OA\Property(property="message", type="string", example="Payments approved successfully"),
     *              @OA\Property(property="approved_orders", type="array", @OA\Items(type="integer"))
     *          )
     *      ),
     *      @OA\Response(
     *          response=400,
     *          description="Dados inválidos"
     *      ),
     *      @OA\Response(
     *          response=401,
     *          description="Não autorizado"
     *      )
     * )
     */                
    public function approvePayment(Request $request)
    {
        $request->validate([
            'order_ids' => 'required|array|min:1',
            'order_ids.*' => 'exists:orders,id',
        ]);

        $updatedCount = 0;

        foreach ($request->order_ids as $orderId) {
            $order = Order::with('payment')->findOrFail($orderId);
            
            // Verifica se o pagamento está associado ao pedido
            if ($order->payment) {
                Log::info("Pagamento encontrado para o pedido ID: {$orderId}"); // Log se o pagamento existir
                $order->payment->update(['status' => 'paid']); // Atualiza o status do pagamento
                $updatedCount++;
            } else {
                Log::warning("Nenhum pagamento encontrado para o pedido ID: {$orderId}"); // Log se não houver pagamento
            }

            // Atualiza o status do pedido para 'completed'
            $order->update(['status' => 'completed']);
            
            // Dispara o Job para processar o pedido
            ProcessOrderJob::dispatch($order->id)->onQueue('orders');
        }

        return response()->json(['updated_count' => $updatedCount]);
    }
    
    public function cancelPayment(Request $request)
    {
        $request->validate([
            'order_ids' => 'required|array|min:1',
            'order_ids.*' => 'exists:orders,id',
        ]);

        $updatedCount = 0;

        foreach ($request->order_ids as $orderId) {
            $order = Order::with('payment')->findOrFail($orderId);

            // ✅ Atualizar payment status primeiro
            if ($order->payment) {
                $order->payment->update(['status' => 'failed']);
            }

            // ✅ Atualizar order status antes de reverter estoque
            $order->update(['status' => 'canceled']);

            // ✅ Reverter estoque (sem duplicar update do status)
            $processOrderJob = new ProcessOrderJob($orderId);
            $processOrderJob->revertStock();

            $updatedCount++;
            
            Log::info('Pedido cancelado', [
                'order_id' => $orderId,
                'customer' => $order->customer_name,
                'payment_status' => $order->payment ? 'failed' : 'no_payment'
            ]);
        }

        return response()->json(['updated_count' => $updatedCount]);
    }
        
    
    public function getUniqueCustomers()
    {
        $customers = Order::select([
            'customer_name',
            'customer_email',
            'customer_phone',
            \DB::raw('COUNT(*) as total_orders'),
            \DB::raw('SUM(total_amount) as total_spent'),
            \DB::raw('MAX(created_at) as last_order_date'),
            \DB::raw('MAX(address_street) as address_street'),
            \DB::raw('MAX(address_neighborhood) as address_neighborhood')
        ])
        ->whereNotNull('customer_phone')
        ->where('customer_phone', '!=', '')
        ->groupBy([
            'customer_name',
            'customer_email',
            'customer_phone'
        ])
        ->orderBy('customer_name')
        ->get()
        ->map(function ($customer) {
            return [
                'name' => $customer->customer_name,
                'email' => $customer->customer_email,
                'phone' => $customer->customer_phone,
                'address' => $customer->address_street,
                'neighborhood' => $customer->address_neighborhood,
                'totalOrders' => (int) $customer->total_orders,
                'totalSpent' => (float) $customer->total_spent,
                'lastOrderDate' => $customer->last_order_date
            ];
        });

        return response()->json($customers);
    }


     public function markAsDelivered($id)
    {
        $order = Order::findOrFail($id);
        if ($order->status !== 'completed') {
            return response()->json([
                'message' => 'Só é possível marcar como entregue pedidos com status completed.',
                'current_status' => $order->status
            ], 400);
        }
        $order->status = 'delivered';
        $order->save();
        return response()->json([
            'message' => 'Pedido marcado como entregue.',
            'order_id' => $order->id,
            'new_status' => $order->status
        ]);
    }

     public function markAsCompleted(Request $request)
    {
        $request->validate([
            'order_ids' => 'required|array|min:1',
            'order_ids.*' => 'exists:orders,id',
        ]);

        // ✅ FILTRAR apenas pedidos com status 'confirmed'
        $orders = Order::whereIn('id', $request->order_ids)
            ->whereIn('status', ['confirmed', 'paid', 'completed'])
            ->get();

        $updatedCount = 0;

        // Buscar endereço ativo
        $activeAddress = Address::where('ativo', true)->first();
        $addressText = '';
        $mapsLink = '';
        if ($activeAddress) {
            $addressText = $activeAddress->rua . ', ' . $activeAddress->numero . ' - ' . $activeAddress->bairro . ', ' . $activeAddress->cidade . ' - ' . $activeAddress->estado;
            if ($activeAddress->latitude && $activeAddress->longitude) {
                $mapsLink = 'https://www.google.com/maps/search/?api=1&query=' . $activeAddress->latitude . ',' . $activeAddress->longitude;
            }
        }

        foreach ($orders as $order) {
                $order->update(['status' => 'completed']);
                $updatedCount++;

                // Buscar branch do pedido
                $branch = \App\Models\Branch::find($order->branch_id);
                // Buscar endereço ativo da filial
                $activeAddress = \App\Models\Address::where('ativo', true)
                    ->where('branch_id', $order->branch_id)
                    ->first();
                $addressText = '';
                $mapsLink = '';
                $horarios = '';
                if ($activeAddress) {
                    $addressText = $activeAddress->rua . ', ' . $activeAddress->numero . ' - ' . $activeAddress->bairro . ', ' . $activeAddress->cidade . ' - ' . $activeAddress->estado;
                    if ($activeAddress->latitude && $activeAddress->longitude) {
                        $mapsLink = 'https://www.google.com/maps/search/?api=1&query=' . $activeAddress->latitude . ',' . $activeAddress->longitude;
                    }
                    $horarios = $activeAddress->horarios;
                }

                // Monta mensagem personalizada para o cliente
                $msg = "Ei, aqui é o Bruno Miranda Cake! 😄\n";
                $msg .= "Boa notícia: seu pedido tá prontinho!\n\n";
                $msg .= "Pode vir buscar ou mandar um moto Uber pra pegar, blz?\n\n";
                $msg .= "Qualquer coisa, é só chamar! 🍰\n\n";
                $msg .= "📍 Endereço de retirada:\n";
                if ($addressText) {
                    $msg .= $addressText . "\n";
                }
                if ($horarios) {
                    $msg .= "Horário: " . $horarios . "\n";
                }
                if ($mapsLink) {
                    $msg .= "Localização: " . $mapsLink . "\n";
                }

                // Envia WhatsApp via Evolution API HTTP POST direto (modelo curl)
                if ($order->customer_phone && $branch && $branch->whatsapp_instance_name) {
                    try {
                        $cleanNumber = preg_replace('/\D/', '', $order->customer_phone);
                        if (strpos($cleanNumber, '55') !== 0) {
                            $cleanNumber = '55' . $cleanNumber;
                        }
                        $evolutionApiUrl = env('EVOLUTION_API_URL', 'https://evohelo.zapsrv.com');
                        $apikey = env('EVOLUTION_API_KEY');
                        $url = $evolutionApiUrl . "/message/sendText/{$branch->whatsapp_instance_name}";
                        $payload = [
                            'number' => $cleanNumber,
                            'text' => $msg
                        ];
                        Log::info('Enviando mensagem Evolution API para cliente (markAsCompleted)', [
                            'url' => $url,
                            'payload' => $payload,
                            'order_id' => $order->id,
                            'branch_id' => $branch->id
                        ]);
                        $response = \Illuminate\Support\Facades\Http::withHeaders([
                            'Content-Type' => 'application/json',
                            'apikey' => $apikey
                        ])->post($url, $payload);
                        Log::info('Resposta Evolution API cliente (markAsCompleted)', [
                            'status' => $response->status(),
                            'body' => $response->body(),
                        ]);
                    } catch (\Exception $e) {
                        Log::error('Erro ao enviar WhatsApp retirada (markAsCompleted)', [
                            'order_id' => $order->id,
                            'phone' => $order->customer_phone,
                            'error' => $e->getMessage()
                        ]);
                    }
                }

                Log::info('Pedido marcado como completo', [
                    'order_id' => $order->id,
                    'customer' => $order->customer_name,
                    'total' => $order->total_amount
                ]);
        }

        Log::info('Pedidos marcados como completos', [
            'requested_count' => count($request->order_ids),
            'updated_count' => $updatedCount
        ]);

        return response()->json([
            'message' => 'Pedidos marcados como completos',
            'requested_count' => count($request->order_ids),
            'updated_count' => $updatedCount
        ]);
    }


}