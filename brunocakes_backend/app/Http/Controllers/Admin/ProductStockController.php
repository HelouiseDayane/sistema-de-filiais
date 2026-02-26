<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;

class ProductStockController extends Controller
{
    /**
     * Listar estoques de um produto em todas as filiais
     */
    public function index(Request $request, $productId)
    {
        $user = $request->user();
        $product = Product::findOrFail($productId);
        
        $query = ProductStock::where('product_id', $productId)->with('branch');
        
        // Se não for master, filtrar pela filial do usuário
        if (!$user->isMaster()) {
            $query->where('branch_id', $user->branch_id);
        }
        
        // Filtrar apenas filiais ativas
        $query->whereHas('branch', function($q) {
            $q->where('is_active', true);
        });
        
        $stocks = $query->get();
        
        // Se não existir estoque para alguma filial, criar com quantidade 0
        if ($user->isMaster()) {
            $branches = Branch::where('is_active', true)->get();
            foreach ($branches as $branch) {
                $existingStock = $stocks->firstWhere('branch_id', $branch->id);
                if (!$existingStock) {
                    $newStock = ProductStock::create([
                        'product_id' => $productId,
                        'branch_id' => $branch->id,
                        'quantity' => 0,
                    ]);
                    $newStock->load('branch');
                    $stocks->push($newStock);
                }
            }
        }
        
        return response()->json([
            'product' => $product,
            'stocks' => $stocks
        ]);
    }

    /**
     * Atualizar estoque de um produto em uma filial específica
     * Apenas master e admin podem atualizar
     */
    public function update(Request $request, $productId, $branchId)
    {
        $user = $request->user();
        
        // Verificar permissão
        if (!$user->isMaster() && !$user->isAdmin()) {
            return response()->json(['message' => 'Acesso negado'], 403);
        }
        
        // Se não for master, só pode atualizar estoque da própria filial
        if (!$user->isMaster() && $branchId != $user->branch_id) {
            return response()->json(['message' => 'Você só pode atualizar estoque da sua filial'], 403);
        }
        
        $data = $request->validate([
            'quantity' => 'required|integer|min:0',
        ]);
        
        $stock = ProductStock::updateOrCreate(
            [
                'product_id' => $productId,
                'branch_id' => $branchId,
            ],
            [
                'quantity' => $data['quantity'],
            ]
        );
        
        // Sincronizar com Redis
        $stockKey = "product_stock_{$branchId}_{$productId}";
        $reservedKey = "product_reserved_{$branchId}_{$productId}";
        
        Redis::connection('stock')->set($stockKey, $data['quantity']);
        // Garantir que reserved existe (set NX = só cria se não existir)
        if (Redis::connection('stock')->get($reservedKey) === null) {
            Redis::connection('stock')->set($reservedKey, 0);
        }
        
        $stock->load('branch');
        
        return response()->json([
            'message' => 'Estoque atualizado com sucesso (MySQL + Redis)',
            'stock' => $stock,
            'redis' => [
                'stock_key' => $stockKey,
                'quantity' => $data['quantity']
            ]
        ]);
    }

    /**
     * Atualizar estoques de múltiplas filiais de uma vez
     * Apenas master pode fazer isso
     */
    public function bulkUpdate(Request $request, $productId)
    {
        $user = $request->user();
        
        if (!$user->isMaster() && !$user->isAdmin()) {
            return response()->json(['message' => 'Acesso negado'], 403);
        }
        
        $data = $request->validate([
            'stocks' => 'required|array',
            'stocks.*.branch_id' => 'required|exists:branches,id',
            'stocks.*.quantity' => 'required|integer|min:0',
        ]);
        
        $product = Product::findOrFail($productId);
        $updatedStocks = [];
        
        foreach ($data['stocks'] as $stockData) {
            // Se não for master, verificar se é da sua filial
            if (!$user->isMaster() && $stockData['branch_id'] != $user->branch_id) {
                continue; // Pula filiais que não são dele
            }
            
            $stock = ProductStock::updateOrCreate(
                [
                    'product_id' => $productId,
                    'branch_id' => $stockData['branch_id'],
                ],
                [
                    'quantity' => $stockData['quantity'],
                ]
            );
            
            $stock->load('branch');
            $updatedStocks[] = $stock;
        }
        
        return response()->json([
            'message' => 'Estoques atualizados com sucesso',
            'stocks' => $updatedStocks
        ]);
    }
}
