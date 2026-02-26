# Sistema Backend Laravel — Loja de Doces (API REST)

Documento com desenho arquitetural, migrations, models, controllers, rotas, jobs (Redis queue), e consultas de análise (dashboard). Use este documento como ponto de partida — contém exemplos prontos para copiar/colar.

---

## Visão geral

Requisitos principais:

* Cliente (frontend) vê cardápio, adiciona ao carrinho, informa endereço/telefone/email/nome no checkout e gera pedido com pagamento via PIX.
* Não há entrega: apenas retirada (mostrar endereço da loja quando o vendedor confirmar o pedido).
* Cada compra decrementa o estoque.
* Painel admin (login obrigatório) com dashboard: vendas por dia/mês/ano, produto mais vendido (semana/mês), bairro que mais comprou, faturamento total, gráficos.
* Cadastro de doces (produto): quantidade em estoque, validade, promoção, novidade, disponível/indisponível.
* Alta concorrência de pedidos: usar fila Redis para alívio e garantir consistência do estoque.

Decisões arquiteturais:

* Laravel API com Sanctum (token) para admin.
* Redis usado para: (1) queue (jobs) — `php artisan queue:work redis` / Horizon opcional; (2) caching de métricas ou preferências; (3) implementação opcional de um *fast decrement* de estoque via Redis para alta concorrência.
* Banco primário: MySQL ou Postgres.
* Transações + locks ao persistir/ajustar estoque. Em alta carga, usar decremento inicial atômico em Redis e confirmação/compensação no DB na job.

---

## Modelo de dados (principal)

### `products` (doces)

```php
Schema::create('products', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->text('description')->nullable();
    $table->decimal('price', 10, 2);
    $table->integer('stock')->default(0);
    $table->date('expires_at')->nullable();
    $table->boolean('is_promo')->default(false);
    $table->boolean('is_new')->default(false);
    $table->boolean('is_active')->default(true);
    $table->timestamps();
});
```

### `cart_items` (opção simples: front-end mantém o carrinho; backend usa `carts` apenas para persistência opcional)

```php
Schema::create('carts', function (Blueprint $table) {
    $table->id();
    $table->string('session_id')->nullable(); // se quiser ligar carrinho ao session/frontend
    $table->timestamps();
});
Schema::create('cart_items', function (Blueprint $table) {
    $table->id();
    $table->foreignId('cart_id')->constrained()->cascadeOnDelete();
    $table->foreignId('product_id')->constrained()->cascadeOnDelete();
    $table->integer('quantity');
    $table->decimal('price', 10, 2);
    $table->timestamps();
});
```

> Observação: como muitas SPAs mantêm o carrinho no browser, você pode oferecer endpoints para salvar/recarregar carrinho (opcional).

### `orders` e `order_items`

```php
Schema::create('orders', function (Blueprint $table) {
    $table->id();
    $table->string('customer_name');
    $table->string('customer_email')->nullable();
    $table->string('customer_phone');
    $table->string('customer_address')->nullable(); // endereço para contato/retirada (se precisar)
    $table->string('neighborhood')->nullable();
    $table->decimal('total', 10, 2);
    $table->enum('status', ['pending_payment','paid','confirmed','ready_for_pickup','cancelled'])->default('pending_payment');
    $table->json('payment_info')->nullable();
    $table->timestamps();
});

Schema::create('order_items', function (Blueprint $table) {
    $table->id();
    $table->foreignId('order_id')->constrained()->cascadeOnDelete();
    $table->foreignId('product_id')->constrained()->cascadeOnDelete();
    $table->integer('quantity');
    $table->decimal('unit_price', 10, 2);
    $table->decimal('subtotal', 10, 2);
    $table->timestamps();
});
```

### `admins` (usuários de painel)

```php
Schema::create('admins', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('email')->unique();
    $table->string('password');
    $table->boolean('is_super')->default(false);
    $table->timestamps();
});
```

---

## Models (exemplo `Product.php`)

```php
class Product extends Model
{
    protected $fillable = ['name','description','price','stock','expires_at','is_promo','is_new','is_active'];
    protected $casts = [
        'is_promo' => 'boolean',
        'is_new' => 'boolean',
        'is_active' => 'boolean',
        'expires_at' => 'date',
    ];
}
```

Model `Order` e `OrderItem` com relações `items()` etc.

---

## Rotas API (routes/api.php)

```php
// Public
GET  /products
GET  /products/{id}
POST /cart (opcional persistir)
POST /checkout  -> cria Order com status pending_payment e retorna instruções PIX
GET  /orders/{id} -> para ver status do pedido

// Admin (Sanctum auth)
POST /admin/login
GET  /admin/orders
GET  /admin/orders/{id}
PATCH /admin/orders/{id}/confirm -> muda para confirmed
PATCH /admin/orders/{id}/ready -> muda para ready_for_pickup
PATCH /admin/orders/{id}/cancel
CRUD /admin/products
GET /admin/dashboard -> endpoints de métricas (ou endpoints separados para gráficos)
```

---

## Fluxo de checkout (recomendado)

1. Cliente monta carrinho no front.
2. No checkout, envia `customer_name, email, phone, address, neighborhood`, `items: [{product_id, quantity}]`.
3. Backend cria um `Order` com `status=pending_payment`, grava `order_items` com `unit_price` e `subtotal` (preços fixados no momento), calcula total.
4. Backend reserva estoque **de forma leve**: duas opções:

   * Simples: ao criar order, dentro de uma transação `lockForUpdate()` na linha do produto e decrementa `stock` imediatamente (recomendado quando estoque é autoritativo no DB).
   * Alta concorrência: faça um `DECRBY` atômico em Redis por produto; se ficar negativo, rejeite a compra e incremente de volta; então enfileire uma Job para persistir no DB e confirmar. Este padrão reduz latência do checkout.
5. Retornar dados PIX (payload) ao cliente. Quando o webhook / confirmação do pagamento chegar (ex: provedor de pagamentos), marque `status=paid`.
6. Admin confirma o pedido (ou pode ser automático após ver pagamento) — ao confirmar, troque `status=confirmed` e exiba endereço/horário de retirada para o cliente.

---

## Exemplo de controller para checkout (simplificado)

```php
class CheckoutController extends Controller {
    public function checkout(Request $r) {
        $r->validate([
            'customer_name'=>'required',
            'customer_phone'=>'required',
            'items'=>'required|array',
        ]);

        DB::beginTransaction();
        try {
            $order = Order::create([
                'customer_name'=>$r->customer_name,
                'customer_email'=>$r->customer_email,
                'customer_phone'=>$r->customer_phone,
                'customer_address'=>$r->customer_address,
                'neighborhood'=>$r->neighborhood,
                'total'=>0,
                'status'=>'pending_payment',
            ]);

            $total = 0;
            foreach($r->items as $it) {
                $product = Product::lockForUpdate()->findOrFail($it['product_id']);
                if($product->stock < $it['quantity']) {
                    DB::rollBack();
                    return response()->json(['error'=>'Estoque insuficiente para ' . $product->name], 422);
                }
                $product->stock -= $it['quantity'];
                $product->save();

                $subtotal = $product->price * $it['quantity'];
                $order->items()->create([
                    'product_id'=>$product->id,
                    'quantity'=>$it['quantity'],
                    'unit_price'=>$product->price,
                    'subtotal'=>$subtotal,
                ]);
                $total += $subtotal;
            }

            $order->total = $total;
            $order->save();
            DB::commit();

            // gerar payload PIX (ou integrar provedor). Aqui retorno simulado:
            $pixPayload = [
                'pix_key' => config('app.pix_key'),
                'amount' => $order->total,
                'expires_in' => 3600,
            ];

            return response()->json(['order'=>$order, 'pix'=>$pixPayload], 201);
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
```

> **Nota**: o `lockForUpdate()` funciona quando todas as transações usam esse padrão — evita oversell. Em cenários extremamente concorridos prefira Redis DECR e reserva temporária.

---

## Job / Redis queue (ProcessOrderJob)

Exemplo de Job que confirma gravação final e envio de notificações:

```php
class ProcessOrderJob implements ShouldQueue {
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $orderId;
    public function __construct($orderId){ $this->orderId = $orderId; }
    public function handle(){
        $order = Order::with('items.product')->find($this->orderId);
        if(!$order) return;
        // lógica adicional: checar pagamento via gateway, reconciliações, enviar email, etc.
    }
}
```

Queue config: `QUEUE_CONNECTION=redis` no `.env` e rodar `php artisan queue:work redis --sleep=1 --tries=3` (ou usar Horizon para monitoramento).

---

## Alta concorrência (padrão Redis fast-decr)

Workflow recomendado para pico de pedidos:

1. No checkout API, para cada produto executar `Redis::decrby('product_stock:'.$id, $quantity)`; se resultado < 0 -> `incrby` e erro (estoque insuficiente).
2. Persistir um pedido com campo `reserved=true` e enviar Job para ProcessOrderJob.
3. Job processa a persistência definitiva no DB (em transaction), confirmando que a reserva ainda é válida (p.ex. bloqueio por TTL). Se falhar, compensar incrementando o stock Redis.

Isso reduz a contenção no DB e melhora latência.

---

## Dashboard — Queries úteis

* Total vendas por dia (últimos 30 dias):

```sql
SELECT DATE(created_at) as date, SUM(total) as daily_total
FROM orders
WHERE status IN ('paid','confirmed','ready_for_pickup')
AND created_at >= now() - interval 30 day
GROUP BY DATE(created_at)
ORDER BY DATE(created_at);
```

* Total vendas por mês / ano: semelhante com `DATE_FORMAT(created_at, '%Y-%m')` e `YEAR(created_at)`.

* Produto mais vendido (semana):

```sql
SELECT p.id, p.name, SUM(oi.quantity) as sold
FROM order_items oi
JOIN orders o on o.id = oi.order_id
JOIN products p on p.id = oi.product_id
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
AND o.status IN ('paid','confirmed','ready_for_pickup')
GROUP BY p.id
ORDER BY sold DESC
LIMIT 10;
```

* Bairro que mais comprou:

```sql
SELECT neighborhood, COUNT(*) as orders, SUM(total) as revenue
FROM orders
WHERE neighborhood IS NOT NULL
GROUP BY neighborhood
ORDER BY orders DESC
LIMIT 10;
```

---

## Endpoints recomendados para o Dashboard (exemplos)

* `GET /admin/dashboard/sales?range=30d` -> retorna séries temporais para gráfico.
* `GET /admin/dashboard/top-products?range=7d` -> top N produtos.
* `GET /admin/dashboard/top-neighborhoods?range=30d` -> top bairros.

Esses endpoints devem retornar JSON compatível com bibliotecas front (labels + data).

---

## Segurança e autenticação

* Use Laravel Sanctum para tokens do admin. Apenas endpoints `admin/*` precisam de auth.
* Valide e sanitize entrada de dados (quantidades >=1, preços >=0).
* Para gerar QRCode PIX, integre com PSP (Gerencianet, Pagar.me, etc) ou gere payload local e converta em QR com biblioteca.

---

## Observações práticas / passos de implementação

1. `composer create-project laravel/laravel backend`.
2. Instalar Sanctum e configurar guard API.
3. Configurar `QUEUE_CONNECTION=redis` e instalar predis/phpredis e Redis server.
4. Criar migrations acima (`php artisan make:migration ...`) e rodar `php artisan migrate`.
5. Criar Models, Controllers (`php artisan make:controller Admin/ProductController --api`, `CheckoutController`).
6. Implementar jobs e configurar workers (Horizon recomendado para ambiente de produção se quiser dashboard de fila).
7. Implementar testes (feature tests para checkout e redução de estoque).

---

## Código de exemplo rápido: ProductController\@index

```php
public function index(Request $r) {
    $query = Product::query()->where('is_active', true);
    if($r->has('search')) $query->where('name','like','%'.$r->search.'%');
    if($r->has('is_promo')) $query->where('is_promo', filter_var($r->is_promo, FILTER_VALIDATE_BOOLEAN));

    $products = $query->paginate(20);
    return response()->json($products);
}
```

---

## Checklist (mínimo viável)

* [x] CRUD de produtos (com estoque, validade, flags promo/new/active)
* [x] Endpoints públicos para listar/ver produtos
* [x] Checkout que cria pedido e decrementa estoque (lockForUpdate ou Redis)
* [x] Integração PIX (mock / PSP real)
* [x] Admin login (Sanctum) + rotas protegidas
* [x] Dashboard endpoints com queries para gráficos
* [x] Fila Redis para processar pedidos de alta concorrência

---

## Próximos passos (sugestões)

1. Me diga se prefere o padrão simples (DB `lockForUpdate`) ou o padrão alto-desempenho (Redis reservation). Posso gerar controllers, migrations e testes completos de acordo com sua escolha.
2. Quer que eu gere o scaffold de código (migrations, models, controllers, routes) pronto para colar no seu projeto? Eu posso criar arquivos de exemplo para o backend.

---

*Fim do documento.*
