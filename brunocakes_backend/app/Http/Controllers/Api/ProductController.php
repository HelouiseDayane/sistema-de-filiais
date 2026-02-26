<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Support\Facades\Storage;


class ProductController extends Controller
{
    /**
     * @OA\Get(
     *      path="/api/products",
     *      operationId="getPublicProductsList",
     *      tags={"Public Products"},
     *      summary="Listar produtos públicos",
     *      description="Retorna lista de produtos ativos para o público",
     *      @OA\Response(
     *          response=200,
     *          description="Lista de produtos ativos",
     *          @OA\JsonContent(
     *              type="array",
     *              @OA\Items(ref="#/components/schemas/Product")
     *          )
     *      )
     * )
     */
    public function index()
    {
        $products = Product::where('is_active', true)->get();

        $products->map(function ($product) {
            $product->image_url = $product->image 
                ? Storage::url($product->image) 
                : null;
            return $product;
        });

        return response()->json($products);
    }

    /**
     * @OA\Get(
     *      path="/api/products/{id}",
     *      operationId="getPublicProductById",
     *      tags={"Public Products"},
     *      summary="Buscar produto público por ID",
     *      description="Retorna detalhes de um produto específico",
     *      @OA\Parameter(
     *          name="id",
     *          description="ID do produto",
     *          required=true,
     *          in="path",
     *          @OA\Schema(type="integer")
     *      ),
     *      @OA\Response(
     *          response=200,
     *          description="Dados do produto",
     *          @OA\JsonContent(ref="#/components/schemas/Product")
     *      ),
     *      @OA\Response(
     *          response=404,
     *          description="Produto não encontrado"
     *      )
     * )
     */
    public function show($id)
    {
        $product = Product::findOrFail($id);

        $product->image_url = $product->image 
            ? Storage::url($product->image) 
            : null;

        return response()->json($product);
    }

    
}
