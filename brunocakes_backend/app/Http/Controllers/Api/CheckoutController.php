<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductStock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;
use App\Jobs\ExpireCartJob;
use App\Jobs\ExpireCheckoutJob;
use App\Jobs\SyncStockJob;
use App\Http\Controllers\Api\PaymentWebhookController;

class CheckoutController extends Controller
{
    protected function getRedisConnection()
    {
        $redis = new \Redis();
        try {
            $redis->connect(config('database.redis.default.host'), 6379);
            $redis->auth(config('database.redis.default.password'));
            return $redis;
        } catch (\Exception $e) {
            \Log::error("Erro ao conectar com Redis: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Generate Redis key for product stock per branch
     */
    protected function getStockKey($branchId, $productId)
    {
        return "product_stock_{$branchId}_{$productId}";
    }
    
    /**
     * Generate Redis key for reserved stock per branch
     */
    protected function getReservedKey($branchId, $productId)
    {
        return "product_reserved_{$branchId}_{$productId}";
    }
    
    /**
     * Generate Redis key for reservation tracking
     */
    protected function getReservationKey($sessionId, $branchId, $productId)
    {
        return "reserve:{$sessionId}:{$branchId}:{$productId}";
    }
    
    /**
     * @OA\Post(
     *      path="/api/cart/add",
     *      operationId="addToCart",
     *      tags={"Cart"},
     *      summary="Adicionar item ao carrinho",
     *      description="Adiciona um produto ao carrinho com expiração automática",
     *      @OA\RequestBody(
     *          required=true,
     *          @OA\JsonContent(
     *              required={"session_id","product_id","quantity"},
     *              @OA\Property(property="session_id", type="string", example="sess_123456789"),
     *              @OA\Property(property="product_id", type="integer", example=1),
     *              @OA\Property(property="quantity", type="integer", minimum=1, example=2)
     *          )
     *      ),
     *      @OA\Response(
     *          response=200,
     *          description="Item adicionado ao carrinho com sucesso",
     *          @OA\JsonContent(
     *              @OA\Property(property="message", type="string", example="Item added to cart"),
     *              @OA\Property(property="cart", type="object"),
     *              @OA\Property(property="expires_at", type="string", format="date-time")
     *          )
     *      ),
     *      @OA\Response(
     *          response=400,
     *          description="Estoque insuficiente ou dados inválidos"
     *      ),
     *      @OA\Response(
     *          response=404,
     *          description="Produto não encontrado"
     *      )
     * )
     */
    public function addToCart(Request $request)
    {
        $data = $request->validate([
            'session_id' => 'required|string',
            'product_id' => 'required|integer|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'branch_id' => 'required|integer|exists:branches,id'
        ]);

        $sessionId = $data['session_id'];
        $productId = $data['product_id'];
        $quantity = $data['quantity'];
        $branchId = $data['branch_id'];

        try {
            // Testar conexão Redis primeiro e logar configurações
            \Log::info("[AddToCart] Configuração Redis", [
                'host' => config('database.redis.default.host'),
                'port' => config('database.redis.default.port'),
                'password_set' => !empty(config('database.redis.default.password'))
            ]);
            
            if (!Redis::ping()) {
                \Log::error("[AddToCart] Redis não está respondendo ao PING");
                throw new \Exception("Redis connection failed");
            }

            // Buscar produto
            $product = Product::findOrFail($productId);
            \Log::info("[AddToCart] Produto encontrado", [
                'product_id' => $productId,
                'mysql_quantity' => $product->quantity
            ]);

            // Verificar e sincronizar estoque se necessário (por filial)
            $stockKey = $this->getStockKey($branchId, $productId);
            $currentStock = Redis::connection('stock')->get($stockKey);
            \Log::info("[AddToCart] Estoque atual no Redis", [
                'product_id' => $productId,
                'branch_id' => $branchId,
                'redis_stock' => $currentStock
            ]);

            // Se não tem no Redis, busca do product_stocks (MySQL)
            if ($currentStock === null) {
                $productStock = \App\Models\ProductStock::where('product_id', $productId)
                    ->where('branch_id', $branchId)
                    ->first();
                $currentStock = $productStock ? $productStock->quantity : 0;
                Redis::connection('stock')->set($stockKey, $currentStock);
                \Log::info("[AddToCart] Estoque sincronizado do MySQL para Redis", [
                    'product_id' => $productId,
                    'quantity' => $currentStock
                ]);
            }

            // Verificar estoque disponível (por filial)
            $reservedKey = $this->getReservedKey($branchId, $productId);
            $reservedStock = Redis::connection('stock')->get($reservedKey) ?? 0;
            $availableStock = (int)$currentStock - (int)$reservedStock;
            
            \Log::info("[AddToCart] Cálculo de estoque disponível", [
                'product_id' => $productId,
                'branch_id' => $branchId,
                'current_stock' => $currentStock,
                'reserved_stock' => $reservedStock,
                'available_stock' => $availableStock,
                'requested_quantity' => $quantity
            ]);

            if ($availableStock < $quantity) {
                \Log::warning("[AddToCart] Tentativa de adicionar quantidade maior que estoque disponível", [
                    'product_id' => $productId,
                    'available_stock' => $availableStock,
                    'requested_quantity' => $quantity
                ]);
                return response()->json([
                    'message' => 'Estoque insuficiente',
                    'available_stock' => $availableStock,
                    'requested_quantity' => $quantity
                ], 400);
            }
        } catch (\Exception $e) {
            \Log::error("[AddToCart] Erro ao verificar estoque", [
                'product_id' => $productId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erro ao verificar estoque. Por favor, tente novamente.'
            ], 500);
        }

        // Reservar estoque (por filial)
        $reservedKey = $this->getReservedKey($branchId, $productId);
        Redis::connection('stock')->incrby($reservedKey, $quantity);
        // Salvar timestamp da reserva por filial
        Redis::connection('stock')->set("product_reserved_time_{$branchId}_{$productId}", time());
        // Salvar reserva individual (para limpeza posterior)
        $reservationKey = $this->getReservationKey($sessionId, $branchId, $productId);
        Redis::connection('stock')->setex($reservationKey, 600, $quantity); // 10 min TTL

        // Adicionar ao carrinho acumulando produtos
        $cartKey = "cart:{$sessionId}";
        $cartData = Redis::connection('stock')->get($cartKey);
        $cart = $cartData ? json_decode($cartData, true) : [];

        // Se já existe o produto, soma a quantidade
        if (isset($cart[$productId])) {
            $cart[$productId]['quantity'] += $quantity;
            $cart[$productId]['total_price'] = $cart[$productId]['unit_price'] * $cart[$productId]['quantity'];
        } else {
            $cart[$productId] = [
                'product_id' => $productId,
                'branch_id' => $branchId,
                'product_name' => $product->name,
                'unit_price' => $product->price,
                'quantity' => $quantity,
                'total_price' => $product->price * $quantity,
                'image_url' => $product->image ? asset('storage/' . $product->image) : null,
                'expires_at' => now()->addMinutes(10)->toISOString()
            ];
        }

        Redis::connection('stock')->setex($cartKey, 600, json_encode($cart)); // 10 min TTL
    
        $this->registrarAtualizacaoEstoque($productId, 'stock_change');
        \Log::info('[AddToCart] registrarAtualizacaoEstoque chamado', [
            'product_id' => $productId,
            'branch_id' => $branchId
        ]);

        // ✅ DISPARAR JOB DE EXPIRAÇÃO
        try {
            ExpireCartJob::dispatch($sessionId, $productId, $quantity)
                ->delay(now()->addMinutes(10)); // 10 minutos

            Log::info('🛒 Job ExpireCartJob disparado com sucesso', [
                'session_id' => $sessionId,
                'product_id' => $productId,
                'quantity' => $quantity,
                'delay' => '10 minutes',
                'will_expire_at' => now()->addMinutes(10)->format('H:i:s')
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Erro ao disparar ExpireCartJob', [
                'session_id' => $sessionId,
                'product_id' => $productId,
                'error' => $e->getMessage()
            ]);
        }

        // Retornar o item atualizado/adicionado
        $cartItemResponse = $cart[$productId];
    
        return response()->json([
            'message' => 'Produto adicionado ao carrinho',
            'cart_item' => $cartItemResponse,
            'available_stock' => $availableStock - $quantity,
            'cart_expires_in_minutes' => 10,
            'debug_job_dispatched' => true
        ], 201);
    }

    /**
     * ✅ Remove item do carrinho
     */
    public function removeFromCart(Request $request)
    {
        $data = $request->validate([
            'session_id' => 'required|string',
            'product_id' => 'required|integer'
        ]);

        $sessionId = $data['session_id'];
        $productId = $data['product_id'];
        
        $cartKey = "cart:{$sessionId}";
        $reserveKey = "reserve:{$sessionId}:{$productId}";
        
        // Obter quantidade reservada antes de remover
        $reservedQuantity = Redis::get($reserveKey) ?? 0;
        
        if ($reservedQuantity > 0) {
            // Liberar estoque reservado
            Redis::decrby("product_reserved_{$productId}", $reservedQuantity);
            
            // Garantir que não fique negativo
            $currentReserved = Redis::get("product_reserved_{$productId}") ?? 0;
            if ($currentReserved < 0) {
                Redis::set("product_reserved_{$productId}", 0);
                Redis::set("product_reserved_{$productId}", $quantidade);
                Redis::set("product_reserved_time_{$productId}", time());
            }
        }
        
        // Remover reserva
        Redis::del($reserveKey);
        
        // Atualizar carrinho (removendo o item)
        $cartData = Redis::get($cartKey);
        if ($cartData) {
            $cart = json_decode($cartData, true);
            unset($cart[$productId]);
            
            if (empty($cart)) {
                Redis::del($cartKey);
            } else {
                Redis::setex($cartKey, 600, json_encode($cart));
            }
        }
        $this->registrarAtualizacaoEstoque($productId, 'stock_change');
     
        Redis::set("product_stock_{$productId}", Product::find($productId)->quantity);
        return response()->json([
            'message' => 'Produto removido do carrinho',
            'released_quantity' => $reservedQuantity
        ]);
    }

    /**
     * ✅ Atualiza quantidade no carrinho
     */
    public function updateCart(Request $request)
    {
        $data = $request->validate([
            'session_id' => 'required|string',
            'product_id' => 'required|integer',
            'quantity' => 'required|integer|min:1'
        ]);

        $sessionId = $data['session_id'];
        $productId = $data['product_id'];
        $newQuantity = $data['quantity'];
        
        $reserveKey = "reserve:{$sessionId}:{$productId}";
        $oldQuantity = Redis::get($reserveKey) ?? 0;
        $quantityDiff = $newQuantity - $oldQuantity;
        
        // Verificar se há estoque suficiente para o aumento
        $this->registrarAtualizacaoEstoque($productId, 'stock_change');
        if ($quantityDiff > 0) {
            $product = Product::findOrFail($productId);
            $currentStock = Redis::get("product_stock_{$productId}") ?? $product->quantity;
            $reservedStock = Redis::get("product_reserved_{$productId}") ?? 0;
            $availableStock = $currentStock - $reservedStock;
            
            if ($availableStock < $quantityDiff) {
                return response()->json([
                    'message' => 'Estoque insuficiente para aumentar quantidade',
                    'available_stock' => $availableStock,
                    'requested_increase' => $quantityDiff
                ], 400);
            }
        }
        
        // Atualizar reserva
        Redis::incrby("product_reserved_{$productId}", $quantityDiff);
        Redis::setex($reserveKey, 600, $newQuantity);
        
        // Atualizar carrinho
        $cartKey = "cart:{$sessionId}";
        $cartData = Redis::get($cartKey);
        if ($cartData) {
            $cart = json_decode($cartData, true);
            if (isset($cart[$productId])) {
                $cart[$productId]['quantity'] = $newQuantity;
                $cart[$productId]['total_price'] = $cart[$productId]['unit_price'] * $newQuantity;
                Redis::setex($cartKey, 600, json_encode($cart));
            }
        }

        return response()->json([
            'message' => 'Carrinho atualizado',
            'new_quantity' => $newQuantity,
            'quantity_change' => $quantityDiff
        ]);
    }

    /**
     * @OA\Get(
     *      path="/api/cart/{sessionId}",
     *      operationId="getCart",
     *      tags={"Cart"},
     *      summary="Obter carrinho",
     *      description="Retorna o conteúdo atual do carrinho para a sessão",
     *      @OA\Parameter(
     *          name="sessionId",
     *          description="ID da sessão do carrinho",
     *          required=true,
     *          in="path",
     *          @OA\Schema(type="string")
     *      ),
     *      @OA\Response(
     *          response=200,
     *          description="Conteúdo do carrinho ou carrinho expirado",
     *          @OA\JsonContent(
     *              oneOf={
     *                  @OA\Schema(
     *                      @OA\Property(property="cart", type="object"),
     *                      @OA\Property(property="total", type="number", format="float", example=89.90),
     *                      @OA\Property(property="expires_at", type="string", format="date-time")
     *                  ),
     *                  @OA\Schema(
     *                      @OA\Property(property="message", type="string", example="Seu carrinho expirou!"),
     *                      @OA\Property(property="cart", type="object", example={}),
     *                      @OA\Property(property="total", type="number", example=0)
     *                  )
     *              }
     *          )
     *      )
     * )
     */
    public function getCart($sessionId)
    {
        $cartKey = "cart:{$sessionId}";
        $cartData = Redis::get($cartKey);
        
        if (!$cartData) {
            // Limpa carrinho e libera estoque se expirado
            $this->clearCart($sessionId);
            return response()->json([
                'message' => 'Seu carrinho expirou! Você tem apenas 10 minutos para escolher seus produtos.'
            ], 410);
        }
        
        $cart = json_decode($cartData, true);
        $total = array_sum(array_column($cart, 'total_price'));
        
        return response()->json([
            'cart' => array_values($cart),
            'total' => $total,
            'items_count' => count($cart)
        ]);
    }

    /**
     * ✅ Limpar carrinho
     */
    public function clearCart($sessionId)
    {
        $cartKey = "cart:{$sessionId}";
        $cartData = Redis::connection('stock')->get($cartKey);
        
        if ($cartData) {
            $cart = json_decode($cartData, true);
            // Liberar todas as reservas e recalcular reservado total (por filial)
            foreach ($cart as $productId => $item) {
                $branchId = $item['branch_id'] ?? null;
                if (!$branchId) {
                    \Log::warning("[ClearCart] Item sem branch_id", ['product_id' => $productId]);
                    continue;
                }
                
                $reserveKey = $this->getReservationKey($sessionId, $branchId, $productId);
                $reservedQuantity = Redis::connection('stock')->get($reserveKey) ?? 0;
                
                if ($reservedQuantity > 0) {
                    $reservedKey = $this->getReservedKey($branchId, $productId);
                    Redis::connection('stock')->decrby($reservedKey, $reservedQuantity);
                    Redis::connection('stock')->del($reserveKey);
                }
                
                // Recalcula o reservado total considerando apenas reservas ativas (por filial)
                $pattern = "reserve:*:{$branchId}:{$productId}";
                $keys = Redis::connection('stock')->keys($pattern);
                $totalActive = 0;
                foreach ($keys as $key) {
                    $ttl = Redis::connection('stock')->ttl($key);
                    $qty = Redis::connection('stock')->get($key);
                    if ($ttl > 0 && $qty > 0) {
                        $totalActive += $qty;
                    }
                }
                $reservedKey = $this->getReservedKey($branchId, $productId);
                Redis::connection('stock')->set($reservedKey, $totalActive);
                $this->registrarAtualizacaoEstoque($productId, 'stock_change');
            }
        }
        
        // Remover carrinho
        Redis::connection('stock')->del($cartKey);
        
        return response()->json(['message' => 'Carrinho limpo']);
    }

    /**
     * ✅ Obter estoque de todos os produtos com tratamento de erros
     * Agora com suporte a filtro por filial
     */
    public function getAllProductsStock(Request $request)
    {
        try {
            // Query base: produtos ativos
            $query = Product::where('is_active', true)->with('stocks');
            
            // Filtro por filial se fornecido
            $branchId = $request->query('branch_id');
            if ($branchId) {
                // Filtra produtos que têm estoque nesta filial
                $query->whereHas('stocks', function($q) use ($branchId) {
                    $q->where('branch_id', $branchId);
                });
            }
            
            $products = $query->get();
            $productsWithStock = [];
            $redisAvailable = true;

            // Testar conexão Redis
            try {
                if (!Redis::ping()) {
                    throw new \Exception("Redis ping failed");
                }
            } catch (\Exception $e) {
                \Log::error("Redis não disponível em getAllProductsStock: " . $e->getMessage());
                $redisAvailable = false;
            }

            foreach ($products as $product) {
                try {
                    // Se filtrou por filial, usa o estoque específico dessa filial
                    if ($branchId) {
                        $branchStock = $product->stocks->where('branch_id', $branchId)->first();
                        if (!$branchStock) {
                            continue; // Pula se não tem estoque nessa filial
                        }
                        $redisStock = $branchStock->quantity;
                        $reservedKey = $this->getReservedKey($branchId, $product->id);
                        $reservedStock = Redis::connection('stock')->get($reservedKey) ?? 0;
                        \Log::info('[getAllProductsStock] Valor reserva por filial', [
                            'reservedKey' => $reservedKey,
                            'reservedStock' => $reservedStock,
                            'branch_id' => $branchId,
                            'product_id' => $product->id
                        ]);
                    } else {
                        // Sem filtro de filial: usa lógica Redis original
                        if ($redisAvailable) {
                            $redisStock = Redis::get("product_stock_{$product->id}");
                            $reservedStock = Redis::get("product_reserved_{$product->id}") ?? 0;
                            
                            // Se não tem no Redis, sincroniza do MySQL
                            if ($redisStock === null) {
                                $redisStock = $product->quantity;
                                Redis::set("product_stock_{$product->id}", $redisStock);
                                \Log::info("Estoque sincronizado do MySQL para Redis em getAllProductsStock", [
                                    'product_id' => $product->id,
                                    'quantity' => $redisStock
                                ]);
                            }
                        } else {
                            $redisStock = $product->quantity;
                            $reservedStock = 0;
                        }
                    }
                    
                    $availableStock = $redisStock - $reservedStock;

                    $productsWithStock[] = [
                        'id' => $product->id,
                        'name' => $product->name,
                        'slug' => $product->slug,
                        'price' => $product->price,
                        'promotion_price' => $product->promotion_price,
                        'category' => $product->category,
                        'description' => $product->description,
                        'image' => $product->image ? '/storage/' . ltrim($product->image, '/') : null,
                        'is_promo' => $product->is_promo,
                        'is_new' => $product->is_new,
                        'total_stock' => (int)$redisStock,
                        'reserved_stock' => (int)$reservedStock,
                        'available_stock' => max(0, $availableStock),
                        'in_stock' => $availableStock > 0,
                        'created_at' => $product->created_at,
                        'updated_at' => $product->updated_at
                    ];
                } catch (\Exception $e) {
                    \Log::error("Erro ao processar produto em getAllProductsStock", [
                        'product_id' => $product->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            return response()->json($productsWithStock);
        } catch (\Exception $e) {
            \Log::error("Erro crítico em getAllProductsStock: " . $e->getMessage());
            return response()->json(['error' => 'Erro ao buscar produtos'], 500);
        }
    }

    /**
     * ✅ Obter estoque de produto específico
     */
    public function getProductStock($id, Request $request)
    {
        try {
            $branchId = $request->query('branch_id');
            
            if (!$branchId) {
                return response()->json([
                    'message' => 'branch_id is required'
                ], 400);
            }
            
            $product = Product::findOrFail($id);
            
            \Log::info("Verificando estoque do produto por filial", [
                'product_id' => $id,
                'branch_id' => $branchId
            ]);
            
            // Usar chaves com branch_id
            $stockKey = $this->getStockKey($branchId, $id);
            $reservedKey = $this->getReservedKey($branchId, $id);
            
            $redisStock = Redis::connection('stock')->get($stockKey);
            if ($redisStock === null) {
                // Buscar do MySQL se não existe no Redis
                $productStock = ProductStock::where('product_id', $id)
                    ->where('branch_id', $branchId)
                    ->first();
                    
                $redisStock = $productStock ? $productStock->quantity : 0;
                Redis::connection('stock')->set($stockKey, $redisStock);
            }
            
            $reservedStock = Redis::connection('stock')->get($reservedKey) ?? 0;
            $availableStock = (int)$redisStock - (int)$reservedStock;

            return response()->json([
                'product_id' => $id,
                'branch_id' => $branchId,
                'quantity' => (int)$redisStock,
                'reserved' => (int)$reservedStock,
                'available' => max(0, $availableStock),
                'in_stock' => $availableStock > 0
            ]);
        } catch (\Exception $e) {
            \Log::error("Erro ao verificar estoque do produto", [
                'product_id' => $id,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'message' => 'Erro ao verificar estoque do produto',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * @OA\Post(
     *      path="/api/checkout/pix",
     *      operationId="storeWithPix",
     *      tags={"Checkout"},
     *      summary="Finalizar pedido com PIX",
     *      description="Cria um pedido e processa pagamento via PIX",
     *      @OA\RequestBody(
     *          required=true,
     *          @OA\JsonContent(
     *              required={"session_id","customer_name","customer_phone","items"},
     *              @OA\Property(property="session_id", type="string", example="sess_123456789"),
     *              @OA\Property(property="customer_name", type="string", example="João Silva"),
     *              @OA\Property(property="customer_email", type="string", format="email", example="joao@email.com"),
     *              @OA\Property(property="customer_phone", type="string", example="(11) 99999-9999"),
     *              @OA\Property(property="address_street", type="string", example="Rua das Flores, 123"),
     *              @OA\Property(property="address_neighborhood", type="string", example="Centro"),
     *              @OA\Property(property="observations", type="string", example="Sem açúcar adicional"),
     *              @OA\Property(
     *                  property="items",
     *                  type="array",
     *                  @OA\Items(
     *                      @OA\Property(property="product_id", type="integer", example=1),
     *                      @OA\Property(property="quantity", type="integer", example=2)
     *                  )
     *              )
     *          )
     *      ),
     *      @OA\Response(
     *          response=201,
     *          description="Pedido criado com sucesso",
     *          @OA\JsonContent(
     *              @OA\Property(property="message", type="string", example="Pedido criado com sucesso!"),
     *              @OA\Property(property="order_id", type="integer", example=1),
     *              @OA\Property(property="payment_id", type="integer", example=1),
     *              @OA\Property(property="total", type="number", format="float", example=89.90)
     *          )
     *      ),
     *      @OA\Response(
     *          response=400,
     *          description="Carrinho expirado ou estoque insuficiente"
     *      ),
     *      @OA\Response(
     *          response=422,
     *          description="Dados de validação inválidos"
     *      )
     * )
     */
    public function storeWithPix(Request $request)
    {
        \Log::info('[Checkout] Recebido request para storeWithPix', [
            'payload' => $request->all()
        ]);
        $data = $request->validate([
            'session_id' => 'required|string',
            'branch_id' => 'required|integer|exists:branches,id',
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'nullable|string|email',
            'customer_phone' => 'required|string|max:20',
            'address_street' => 'nullable|string',
            'address_neighborhood' => 'nullable|string',
            'items' => 'required|array',
            'items.*.product_id' => ['required', 'regex:/^\\d+$/'],
            'items.*.quantity' => ['required', 'regex:/^\\d+$/', 'min:1'],
            'observations' => 'nullable|string'
        ]);

        $sessionId = $data['session_id'];
        $cartKey = "cart:{$sessionId}";
        $cartData = Redis::connection('stock')->get($cartKey);

        if (!$cartData) {
               return response()->json([
                'message' => 'Seu carrinho expirou! Você tem apenas 10 minutos para escolher seus produtos.'
            ], 410);
        }

        $cart = json_decode($cartData, true);
        // Garante que as chaves do carrinho são inteiras
        $cart = array_combine(
            array_map('intval', array_keys($cart)),
            array_values($cart)
        );

        // Calcular total com base no preço ATUAL do banco
        $totalAmount = 0;
        $orderItems = [];
        foreach ($data['items'] as $item) {
            $productId = (int) $item['product_id'];
            $quantity = (int) $item['quantity'];
            $product = Product::find($productId);
            if ($product) {
                $unitPrice = $product->is_promo && $product->promotion_price !== null ? $product->promotion_price : $product->price;
                $totalPrice = $unitPrice * $quantity;
                $orderItems[] = [
                    'product_id' => $productId,
                    'product_name' => $product->name,
                    'unit_price' => $unitPrice,
                    'quantity' => $quantity,
                    'total_price' => $totalPrice
                ];
                $totalAmount += $totalPrice;
            }
        }

        DB::beginTransaction();
        try {
            $randomKey = strtoupper(bin2hex(random_bytes(8)));

            // Criar ordem
            $order = Order::create([
                'branch_id' => $data['branch_id'],
                'customer_name' => $data['customer_name'],
                'customer_email' => $data['customer_email'],
                'customer_phone' => $data['customer_phone'],
                'address_street' => $data['address_street'] ?? null,
                'address_neighborhood' => $data['address_neighborhood'] ?? null,
                'total_amount' => $totalAmount,
                'status' => 'pending_payment',
                'checkout_expires_at' => now()->addMinutes(15),
                'stock_reserved' => true,
                'payment_reference' => $randomKey
            ]);

            // Criar itens da ordem com preço atualizado do banco
            foreach ($orderItems as $orderItem) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $orderItem['product_id'],
                    'product_name' => $orderItem['product_name'],
                    'unit_price' => $orderItem['unit_price'],
                    'quantity' => $orderItem['quantity'],
                    'total_price' => $orderItem['total_price']
                ]);
            }

            // Limpar carrinho
            Redis::connection('stock')->del($cartKey);

            // Criar registro de pagamento
            $payment = Payment::create([
                'order_id' => $order->id,
                'provider' => 'mercadopago',
                'status' => 'pending',
                'amount' => $totalAmount
            ]);

            // Se o status do pedido for cancelado, definir pagamento como 'failed'
            if ($request->input('status') === 'canceled') {
                $payment->update(['status' => 'failed']);
            }

            \Log::info('[Checkout] Antes de gerar PIX', ['order_id' => $order->id, 'random_key' => $randomKey]);
            $pixResponse = null;
            try {
                $pixResponse = app(PaymentWebhookController::class)->gerarPixPagamento($order->id, $randomKey);
                \Log::info('[Checkout] PIX gerado com sucesso', ['order_id' => $order->id, 'pix_response' => $pixResponse]);
            } catch (\Exception $pixEx) {
                \Log::error('[Checkout] Erro ao gerar PIX', ['order_id' => $order->id, 'error' => $pixEx->getMessage(), 'trace' => $pixEx->getTraceAsString()]);
                throw $pixEx;
            }

            try {
                $payment->update([
                    'pix_payload' => json_encode($pixResponse)
                ]);
                \Log::info('[Checkout] Pagamento atualizado com PIX', ['payment_id' => $payment->id]);
            } catch (\Exception $payEx) {
                \Log::error('[Checkout] Erro ao atualizar pagamento com PIX', ['payment_id' => $payment->id, 'error' => $payEx->getMessage(), 'trace' => $payEx->getTraceAsString()]);
                throw $payEx;
            }

            // Agendar expiração do checkout
            ExpireCheckoutJob::dispatch($order->id)
                ->delay(now()->addMinutes(15));

            DB::commit();

            \Log::info('[Checkout] Pedido e pagamento PIX criados com sucesso', ['order_id' => $order->id, 'payment_id' => $payment->id]);
            return response()->json([
                'message' => 'Pedido e pagamento PIX criados com sucesso',
                'order_id' => $order->id,
                'order' => $order->load('items'),
                'payment' => $payment,
                'pix' => $pixResponse,
                'checkout_expires_in_minutes' => 15
            ], 201);
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('[Checkout] Erro interno do servidor', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json([
                'message' => 'Erro interno do servidor',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ✅ Obter clientes únicos (para admin)
     */
    public function getUniqueCustomers()
    {
        $customers = Order::select('customer_name', 'customer_phone')
            ->distinct()
            ->orderBy('customer_name')
            ->get();

        return response()->json($customers);
    }

    /**
     * ✅ Obter pedidos (para listagem pública)
     */

    public function getPedidos(Request $request)
    {
        $email = $request->input('email');
        $phone = $request->input('phone');

        // Valida que pelo menos um dos parâmetros foi fornecido
        if (!$email && !$phone) {
            return response()->json(['message' => 'Email ou telefone é obrigatório'], 400);
        }

        $query = Order::with(['items', 'payment']);

        // Filtra por email ou telefone
        if ($email && $phone) {
            // Se ambos forem fornecidos, busca por qualquer um dos dois
            $query->where(function($q) use ($email, $phone) {
                $q->where('customer_email', $email)
                  ->orWhere('customer_phone', $phone);
            });
        } elseif ($email) {
            $query->where('customer_email', $email);
        } elseif ($phone) {
            $query->where('customer_phone', $phone);
        }

        $orders = $query->orderBy('created_at', 'desc')->paginate(10);

        // Adiciona o total real somando os itens e inclui status do pagamento
        $orders->getCollection()->transform(function ($order) {
            $order->total_real = collect($order->items)->sum(function ($item) {
                return (float) $item->total_price;
            });
            $order->payment_status = $order->payment ? $order->payment->status : null;
            return $order;
        });

        return response()->json($orders);
    }

    /**
     * ✅ Obter status do pedido
     */
    public function getOrderStatus($id)
    {
        $order = Order::findOrFail($id);
        
        return response()->json([
            'id' => $order->id,
            'status' => $order->status,
            'total_amount' => $order->total_amount,
            'created_at' => $order->created_at,
            'checkout_expires_at' => $order->checkout_expires_at
        ]);
    }

    /**
     * ✅ Rastrear pedido
     */
    public function trackOrder($id)
    {
        $order = Order::with(['items', 'payment', 'branch.addresses'])->findOrFail($id);
        $orderArray = $order->toArray();
        
        // Buscar latitude/longitude do endereço da filial
        if ($order->branch && $order->branch->addresses->isNotEmpty()) {
            $address = $order->branch->addresses->first();
            $orderArray['latitude'] = $address->latitude;
            $orderArray['longitude'] = $address->longitude;
        }
        
        return response()->json($orderArray);
    }

    /**
     * ✅ Obter último pedido do cliente
     */
    public function getLastOrderCustomer(Request $request)
    {
        $phone = $request->input('phone');
        
        if (!$phone) {
            return response()->json(['message' => 'Telefone é obrigatório'], 400);
        }
        
        $lastOrder = Order::where('customer_phone', $phone)
            ->with('items')
            ->orderBy('created_at', 'desc')
            ->first();
            
        if (!$lastOrder) {
            return response()->json(['message' => 'Nenhum pedido encontrado'], 404);
        }
        
        return response()->json($lastOrder);
    }

        private function registrarAtualizacaoEstoque($productId, $tipo = 'stock_change') {
        // Buscar branchId se disponível
        $branchId = request()->input('branch_id') ?? request()->query('branch_id');
        if ($branchId) {
            $totalStock = Redis::connection('stock')->get($this->getStockKey($branchId, $productId)) ?? 0;
            $reservedStock = Redis::connection('stock')->get($this->getReservedKey($branchId, $productId)) ?? 0;
        } else {
            $totalStock = Redis::get("product_stock_{$productId}") ?? 0;
            $reservedStock = Redis::get("product_reserved_{$productId}") ?? 0;
        }
        $availableStock = max(0, $totalStock - $reservedStock);
        $evento = [
            'type' => $tipo,
            'product_id' => $productId,
            'branch_id' => $branchId,
            'available_stock' => $availableStock,
            'total_stock' => (int)$totalStock,
            'reserved_stock' => (int)$reservedStock,
            'is_available' => $availableStock > 0,
            'is_low_stock' => $availableStock <= 5 && $availableStock > 0,
            'timestamp' => now()->toISOString()
        ];
        Redis::connection('stock')->lpush('stock_updates', json_encode($evento));
    }


        /**
     * Marcar pedido como entregue (delivered)
     */ 
    public function markOrderAsDelivered($id)
    {
        $order = Order::findOrFail($id);
        $order->update(['status' => 'delivered']);

        return response()->json(['message' => 'Pedido marcado como entregue']);
    }
}