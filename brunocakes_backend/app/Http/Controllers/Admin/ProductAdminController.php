<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;

class ProductAdminController extends Controller
{
    /**
     * @OA\Get(
     *      path="/api/admin/products",
     *      operationId="getProductsList",
     *      tags={"Admin Products"},
     *      summary="Listar produtos (Admin)",
     *      description="Retorna lista de todos os produtos para administradores",
     *      security={{"sanctum": {}}},
     *      @OA\Response(
     *          response=200,
     *          description="Lista de produtos",
     *          @OA\JsonContent(
     *              type="array",
     *              @OA\Items(
     *                  @OA\Property(property="id", type="integer", example=1),
     *                  @OA\Property(property="name", type="string", example="Bolo de Chocolate"),
     *                  @OA\Property(property="description", type="string", example="Delicioso bolo de chocolate"),
     *                  @OA\Property(property="price", type="number", format="float", example=25.99),
     *                  @OA\Property(property="stock", type="integer", example=10),
     *                  @OA\Property(property="image", type="string", example="products/bolo.jpg"),
     *                  @OA\Property(property="image_url", type="string", example="http://localhost:8191/storage/products/bolo.jpg"),
     *                  @OA\Property(property="category", type="string", example="bolos"),
     *                  @OA\Property(property="created_at", type="string", format="date-time"),
     *                  @OA\Property(property="updated_at", type="string", format="date-time")
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
        
        // Determinar filial a filtrar
        $branchId = $user->isMaster() ? $request->query('branch_id') : $user->branch_id;
        
        $query = Product::query();
        
        // Carregar apenas stocks da filial específica
        if ($branchId) {
            $query->with(['stocks' => function($q) use ($branchId) {
                $q->where('branch_id', $branchId)->with('branch');
            }]);
            
            // Filtrar produtos que têm estoque nesta filial
            $query->whereHas('stocks', function($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        } else {
            // Master sem filtro vê todos os produtos com todos os stocks
            $query->with('stocks.branch');
        }
        
        $products = $query->get();

        $appUrl = config('app.url');
        $products->transform(function ($product) {
            if ($product->image) {
                if (preg_match('/^https?:\/\//', $product->image)) {
                    $product->image_url = $product->image;
                } else {
                    $imagePath = Storage::url($product->image);
                    $product->image_url = $imagePath;
                }
            } else {
                $product->image_url = null;
            }
            return $product;
        });

        return response()->json($products);
    }

    /**
     * @OA\Post(
     *      path="/api/admin/products",
     *      operationId="createProduct",
     *      tags={"Admin Products"},
     *      summary="Criar novo produto",
     *      description="Cria um novo produto com imagem opcional",
     *      security={{"sanctum": {}}},
     *      @OA\RequestBody(
     *          required=true,
     *          @OA\MediaType(
     *              mediaType="multipart/form-data",
     *              @OA\Schema(
     *                  required={"name","description","price","stock","category"},
     *                  @OA\Property(property="name", type="string", example="Bolo Red Velvet"),
     *                  @OA\Property(property="description", type="string", example="Delicioso bolo red velvet com cream cheese"),
     *                  @OA\Property(property="price", type="number", format="float", example=35.99),
     *                  @OA\Property(property="stock", type="integer", example=15),
     *                  @OA\Property(property="category", type="string", example="bolos"),
     *                  @OA\Property(property="is_promo", type="boolean", example=false),
     *                  @OA\Property(property="is_new", type="boolean", example=true),
     *                  @OA\Property(property="is_active", type="boolean", example=true),
     *                  @OA\Property(property="image", type="string", format="binary", description="Arquivo de imagem do produto")
     *              )
     *          )
     *      ),
     *      @OA\Response(
     *          response=201,
     *          description="Produto criado com sucesso",
     *          @OA\JsonContent(
     *              @OA\Property(property="message", type="string", example="Produto criado com sucesso!"),
     *              @OA\Property(property="product", ref="#/components/schemas/Product")
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
    public function store(Request $request)
    {
        $user = $request->user();
        
        \Log::info('ProductAdminController@store chamado', $request->all());
        
        $input = $request->all();

        // Converter campos booleanos vindos como string
        foreach (['is_promo', 'is_new', 'is_active'] as $boolField) {
            if (isset($input[$boolField])) {
                $input[$boolField] = filter_var($input[$boolField], FILTER_VALIDATE_BOOLEAN);
            }
        }
        
        // Garantir que is_active tenha valor padrão true se não fornecido
        if (!isset($input['is_active'])) {
            $input['is_active'] = true;
        }

        // Gerar slug automaticamente se não fornecido
        if (!isset($input['slug']) && isset($input['name'])) {
            $input['slug'] = \Str::slug($input['name']);
            // Garantir que seja único
            $baseSlug = $input['slug'];
            $counter = 1;
            while (Product::where('slug', $input['slug'])->exists()) {
                $input['slug'] = $baseSlug . '-' . $counter;
                $counter++;
            }
        }

        // Determinar branch_id
        // Master pode criar para qualquer filial, outros apenas para a sua
        $branchId = null;
        if ($user->isMaster()) {
            $branchId = $request->input('branch_id');
            if (!$branchId) {
                return response()->json([
                    'message' => 'Master deve especificar a filial (branch_id) ao criar produtos.'
                ], 422);
            }
        } else {
            $branchId = $user->branch_id;
        }
        
        $input['branch_id'] = $branchId;

        $data = $request->merge($input)->validate([
            'name'            => 'required|string',
            'slug'            => 'required|string|unique:products,slug',
            'price'           => 'required|numeric',
            'promotion_price' => 'nullable|numeric',
            'quantity'        => 'required|integer',
            'category'        => 'nullable|string',
            'expires_at'      => 'nullable|date',
            'is_promo'        => 'boolean',
            'is_new'          => 'boolean',
            'is_active'       => 'boolean',
            'description'     => 'nullable|string',
            'branch_id'       => 'required|exists:branches,id',
        ]);

        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('products', 'public');
            $data['image'] = $imagePath;
        } else {
            $data['image'] = null;
        }

        $product = Product::create($data);
        
        // ✅ CORRIGIDO: Sincronizar estoque com Redis automaticamente
        $this->syncProductStock($product);
        
        // Adicionar image_url para response
        $appUrl = config('app.url');
        if ($product->image) {
            if (preg_match('/^https?:\/\//', $product->image)) {
                $product->image_url = $product->image;
            } else {
                $imagePath = Storage::url($product->image);
                $product->image_url = $imagePath;
            }
        } else {
            $product->image_url = null;
        }
        
        \Log::info('Produto criado com sucesso', ['product_id' => $product->id]);
        
        return response()->json($product, 201);
    }

    /**
     * @OA\Get(
     *      path="/api/admin/products/{id}",
     *      operationId="getProductById",
     *      tags={"Admin Products"},
     *      summary="Buscar produto por ID",
     *      description="Retorna detalhes de um produto específico",
     *      security={{"sanctum": {}}},
     *      @OA\Parameter(
     *          name="id",
     *          description="ID do produto",
     *          required=true,
     *          in="path",
     *          @OA\Schema(
     *              type="integer"
     *          )
     *      ),
     *      @OA\Response(
     *          response=200,
     *          description="Dados do produto",
     *          @OA\JsonContent(ref="#/components/schemas/Product")
     *      ),
     *      @OA\Response(
     *          response=404,
     *          description="Produto não encontrado"
     *      ),
     *      @OA\Response(
     *          response=401,
     *          description="Não autorizado"
     *      )
     * )
     */
    public function show($id)
    {
        $product = Product::findOrFail($id);
        
        $appUrl = config('app.url');
        if ($product->image) {
            if (preg_match('/^https?:\/\//', $product->image)) {
                $product->image_url = $product->image;
            } else {
                $imagePath = Storage::url($product->image);
                $product->image_url = $imagePath;
            }
        } else {
            $product->image_url = null;
        }
            
        return response()->json($product);
    }

    /**
     * @OA\Put(
     *      path="/api/admin/products/{id}",
     *      operationId="updateProduct",
     *      tags={"Admin Products"},
     *      summary="Atualizar produto",
     *      description="Atualiza dados de um produto existente",
     *      security={{"sanctum": {}}},
     *      @OA\Parameter(
     *          name="id",
     *          description="ID do produto",
     *          required=true,
     *          in="path",
     *          @OA\Schema(type="integer")
     *      ),
     *      @OA\RequestBody(
     *          required=true,
     *          @OA\MediaType(
     *              mediaType="multipart/form-data",
     *              @OA\Schema(
     *                  @OA\Property(property="name", type="string", example="Bolo Red Velvet Atualizado"),
     *                  @OA\Property(property="description", type="string", example="Descrição atualizada"),
     *                  @OA\Property(property="price", type="number", format="float", example=39.99),
     *                  @OA\Property(property="stock", type="integer", example=20),
     *                  @OA\Property(property="category", type="string", example="bolos"),
     *                  @OA\Property(property="is_promo", type="boolean", example=true),
     *                  @OA\Property(property="is_new", type="boolean", example=false),
     *                  @OA\Property(property="is_active", type="boolean", example=true),
     *                  @OA\Property(property="image", type="string", format="binary", description="Nova imagem do produto")
     *              )
     *          )
     *      ),
     *      @OA\Response(
     *          response=200,
     *          description="Produto atualizado com sucesso",
     *          @OA\JsonContent(ref="#/components/schemas/Product")
     *      ),
     *      @OA\Response(
     *          response=404,
     *          description="Produto não encontrado"
     *      ),
     *      @OA\Response(
     *          response=401,
     *          description="Não autorizado"
     *      )
     * )
     */
    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        $input = $request->all();

        // Converter campos booleanos vindos como string
        foreach (["is_promo", "is_new", "is_active"] as $boolField) {
            if (isset($input[$boolField])) {
                $input[$boolField] = filter_var($input[$boolField], FILTER_VALIDATE_BOOLEAN);
            }
        }

        $validated = $request->merge($input)->validate([
            'name'            => 'string',
            'slug'            => 'string|unique:products,slug,' . $product->id,
            'price'           => 'numeric',
            'promotion_price' => 'nullable|numeric',
            'quantity'        => 'integer',
            'category'        => 'nullable|string',
            'expires_at'      => 'nullable|date',
            'is_promo'        => 'boolean',
            'is_new'          => 'boolean',
            'is_active'       => 'boolean',
            'description'     => 'nullable|string',
            'image'           => 'nullable',
        ]);

        $data = [];
        foreach ($validated as $key => $value) {
            $data[$key] = $value;
        }

        // Se não está em promoção, zere o campo promotion_price
        if (isset($data['is_promo']) && !$data['is_promo']) {
            $data['promotion_price'] = null;
        }

        // Imagem: só altera se for enviada
        if ($request->hasFile('image')) {
            if ($product->image && \Storage::disk('public')->exists($product->image)) {
                \Storage::disk('public')->delete($product->image);
            }
            $path = $request->file('image')->store('products', 'public');
            $data['image'] = $path;
        }

        $product->update($data);

        // ✅ CORRIGIDO: Sincronizar estoque com Redis automaticamente após update
        $this->syncProductStock($product->fresh());

        // Adicionar image_url para response
        $updatedProduct = $product->fresh();
        $appUrl = config('app.url');
        if ($updatedProduct->image) {
            if (preg_match('/^https?:\/\//', $updatedProduct->image)) {
                $updatedProduct->image_url = $updatedProduct->image;
            } else {
                $imagePath = Storage::url($updatedProduct->image);
                $updatedProduct->image_url = rtrim($appUrl, '/') . $imagePath;
            }
        } else {
            $updatedProduct->image_url = null;
        }
        return response()->json($updatedProduct);
    }

    /**
     * @OA\Patch(
     *      path="/api/admin/products/{id}/stock",
     *      operationId="updateProductStock",
     *      tags={"Admin Products"},
     *      summary="Atualizar estoque do produto",
     *      description="Atualiza apenas a quantidade em estoque de um produto",
     *      security={{"sanctum": {}}},
     *      @OA\Parameter(
     *          name="id",
     *          description="ID do produto",
     *          required=true,
     *          in="path",
     *          @OA\Schema(type="integer")
     *      ),
     *      @OA\RequestBody(
     *          required=true,
     *          @OA\JsonContent(
     *              required={"quantity"},
     *              @OA\Property(property="quantity", type="integer", minimum=0, example=25)
     *          )
     *      ),
     *      @OA\Response(
     *          response=200,
     *          description="Estoque atualizado com sucesso",
     *          @OA\JsonContent(
     *              @OA\Property(property="message", type="string", example="Stock updated successfully"),
     *              @OA\Property(property="old_stock", type="integer", example=10),
     *              @OA\Property(property="new_stock", type="integer", example=25)
     *          )
     *      ),
     *      @OA\Response(
     *          response=404,
     *          description="Produto não encontrado"
     *      ),
     *      @OA\Response(
     *          response=401,
     *          description="Não autorizado"
     *      )
     * )
     */
    public function updateStock(Request $request, $id)
    {
        $data = $request->validate([
            'quantity' => 'required|integer|min:0'
        ]);

        $product = Product::findOrFail($id);
        $oldStock = $product->quantity;
        // Atualiza apenas a quantidade, sem alterar is_active
        $product->quantity = $data['quantity'];
        $product->save();
        // Sincronizar estoque com Redis
        $this->syncProductStock($product->fresh());
        return response()->json([
            'message' => 'Estoque atualizado com sucesso',
            'product' => $product->fresh(),
            'old_stock' => $oldStock,
            'new_stock' => $data['quantity']
        ]);
    }

    public function toggleActive($id)
{
    // ✅ Buscar produto manualmente
    $product = Product::findOrFail($id);
    
    $product->is_active = !$product->is_active;
    $product->save();

    // ✅ Sincronizar com Redis quando ativar/desativar
    $this->syncProductStock($product);

    return response()->json([
        'message' => $product->is_active ? 'Produto habilitado' : 'Produto desabilitado',
        'product' => $product
    ]);
}
    // ✅ CORRIGIDO: Método privado para sincronizar um produto específico com debug
    private function syncProductStock(Product $product)
    {
        try {
            // Tenta conectar ao Redis primeiro
            if (!Redis::ping()) {
                \Log::error("Redis não está respondendo ao PING");
                return;
            }

            // ✅ USAR Facade Redis corretamente com log detalhado
            $key = "product_stock_{$product->id}";
            $oldValue = Redis::get($key);
            Redis::set($key, $product->quantity);
            $newValue = Redis::get($key);

            \Log::info("Produto {$product->id} sincronizado com Redis", [
                'product_name' => $product->name,
                'quantity' => $product->quantity,
                'redis_key' => $key,
                'old_value' => $oldValue,
                'new_value' => $newValue,
                'redis_info' => Redis::info()
            ]);
        } catch (\Exception $e) {
            \Log::error("Erro ao sincronizar produto {$product->id} com Redis: " . $e->getMessage(), [
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString()
            ]);
            // ✅ Não falhar se Redis não estiver disponível
        }
    }

    // ✅ CORRIGIDO: Método para sincronizar todos os produtos (manual) com validação e debug
    public function syncStock()
    {
        // Validar conexão Redis primeiro
        try {
            if (!Redis::ping()) {
                \Log::error("Redis não está respondendo ao PING durante syncStock");
                return response()->json([
                    'message' => 'Erro: Redis não está respondendo',
                    'error' => 'REDIS_NOT_RESPONDING'
                ], 500);
            }
        } catch (\Exception $e) {
            \Log::error("Erro ao tentar PING no Redis: " . $e->getMessage());
            return response()->json([
                'message' => 'Erro na conexão com Redis',
                'error' => $e->getMessage()
            ], 500);
        }

        $products = Product::all();
        $synced = 0;
        $errors = 0;
        $syncDetails = [];

        foreach ($products as $product) {
            try {
                $key = "product_stock_{$product->id}";
                $oldValue = Redis::get($key);
                Redis::set($key, $product->quantity);
                $newValue = Redis::get($key);

                if ($newValue !== null && (string)$newValue === (string)$product->quantity) {
                    $synced++;
                    $syncDetails[$product->id] = [
                        'success' => true,
                        'name' => $product->name,
                        'old_value' => $oldValue,
                        'new_value' => $newValue,
                        'expected' => $product->quantity
                    ];
                } else {
                    $errors++;
                    $syncDetails[$product->id] = [
                        'success' => false,
                        'name' => $product->name,
                        'error' => 'Valor não sincronizado corretamente',
                        'old_value' => $oldValue,
                        'new_value' => $newValue,
                        'expected' => $product->quantity
                    ];
                }
            } catch (\Exception $e) {
                $errors++;
                $syncDetails[$product->id] = [
                    'success' => false,
                    'name' => $product->name,
                    'error' => $e->getMessage()
                ];
                \Log::error("Erro ao sincronizar produto {$product->id}: " . $e->getMessage(), [
                    'exception' => get_class($e),
                    'trace' => $e->getTraceAsString()
                ]);
            }
        }

        // Log detalhado do resultado
        \Log::info("Resultado da sincronização de estoque", [
            'total_products' => $products->count(),
            'synced' => $synced,
            'errors' => $errors,
            'details' => $syncDetails,
            'redis_info' => Redis::info()
        ]);

        return response()->json([
            'message' => $errors > 0 ? 'Sincronização parcial' : 'Sincronização completa',
            'products_synced' => $synced,
            'errors' => $errors,
            'total_products' => $products->count(),
            'details' => $syncDetails
        ]);
    }
}