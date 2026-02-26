<?php

namespace App\Http\Controllers;

/**
 * @OA\Info(
 *      version="1.0.0",
 *      title="Meu Delivery API Documentation",
 *      description="API para sistema de pedidos de bolos e doces",
 *      @OA\Contact(
 *          email="contato@meudelivey.com"
 *      ),
 *      @OA\License(
 *          name="Apache 2.0",
 *          url="http://www.apache.org/licenses/LICENSE-2.0.html"
 *      )
 * )
 *
 * @OA\Server(
 *      url=L5_SWAGGER_CONST_HOST,
 *      description="Meu Delivey API Server"
 * )
 *
 * @OA\SecurityScheme(
 *      securityScheme="sanctum",
 *      type="http",
 *      scheme="bearer",
 *      bearerFormat="JWT",
 *      description="Enter token in format (Bearer <token>)"
 * )
 * 
 * @OA\Schema(
 *      schema="Product",
 *      type="object",
 *      title="Product",
 *      description="Modelo de produto",
 *      @OA\Property(property="id", type="integer", example=1),
 *      @OA\Property(property="name", type="string", example="Bolo de Chocolate"),
 *      @OA\Property(property="description", type="string", example="Delicioso bolo de chocolate"),
 *      @OA\Property(property="price", type="number", format="float", example=25.99),
 *      @OA\Property(property="stock", type="integer", example=10),
 *      @OA\Property(property="quantity", type="integer", example=10),
 *      @OA\Property(property="category", type="string", example="bolos"),
 *      @OA\Property(property="image", type="string", example="products/bolo.jpg"),
 *      @OA\Property(property="image_url", type="string", example="http://localhost:8191/storage/products/bolo.jpg"),
 *      @OA\Property(property="is_promo", type="boolean", example=false),
 *      @OA\Property(property="is_new", type="boolean", example=true),
 *      @OA\Property(property="is_active", type="boolean", example=true),
 *      @OA\Property(property="promotion_price", type="number", format="float", example=19.99, nullable=true),
 *      @OA\Property(property="expires_at", type="string", format="date-time", nullable=true),
 *      @OA\Property(property="created_at", type="string", format="date-time"),
 *      @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 * 
 * @OA\Schema(
 *      schema="Order",
 *      type="object",
 *      title="Order",
 *      description="Modelo de pedido",
 *      @OA\Property(property="id", type="integer", example=1),
 *      @OA\Property(property="customer_name", type="string", example="João Silva"),
 *      @OA\Property(property="customer_email", type="string", example="joao@email.com"),
 *      @OA\Property(property="customer_phone", type="string", example="(11) 99999-9999"),
 *      @OA\Property(property="total_amount", type="number", format="float", example=89.90),
 *      @OA\Property(property="status", type="string", example="pending", enum={"pending", "confirmed", "completed", "cancelled"}),
 *      @OA\Property(property="delivery_date", type="string", format="date-time"),
 *      @OA\Property(property="delivery_address", type="string", example="Rua das Flores, 123"),
 *      @OA\Property(property="notes", type="string", example="Sem açúcar adicional"),
 *      @OA\Property(property="created_at", type="string", format="date-time"),
 *      @OA\Property(property="updated_at", type="string", format="date-time"),
 *      @OA\Property(property="items", type="array", @OA\Items(ref="#/components/schemas/OrderItem")),
 *      @OA\Property(property="payment", ref="#/components/schemas/Payment")
 * )
 * 
 * @OA\Schema(
 *      schema="OrderItem",
 *      type="object",
 *      title="OrderItem",
 *      description="Item do pedido",
 *      @OA\Property(property="id", type="integer", example=1),
 *      @OA\Property(property="order_id", type="integer", example=1),
 *      @OA\Property(property="product_id", type="integer", example=1),
 *      @OA\Property(property="quantity", type="integer", example=2),
 *      @OA\Property(property="price", type="number", format="float", example=25.99),
 *      @OA\Property(property="created_at", type="string", format="date-time"),
 *      @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 * 
 * @OA\Schema(
 *      schema="Payment",
 *      type="object",
 *      title="Payment",
 *      description="Modelo de pagamento",
 *      @OA\Property(property="id", type="integer", example=1),
 *      @OA\Property(property="order_id", type="integer", example=1),
 *      @OA\Property(property="amount", type="number", format="float", example=89.90),
 *      @OA\Property(property="method", type="string", example="pix"),
 *      @OA\Property(property="status", type="string", example="pending", enum={"pending", "approved", "rejected"}),
 *      @OA\Property(property="transaction_id", type="string", example="TXN123456"),
 *      @OA\Property(property="created_at", type="string", format="date-time"),
 *      @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 * 
 * @OA\Schema(
 *      schema="User",
 *      type="object",
 *      title="User",
 *      description="Modelo de usuário",
 *      @OA\Property(property="id", type="integer", example=1),
 *      @OA\Property(property="name", type="string", example="Admin"),
 *      @OA\Property(property="email", type="string", example="admin@brunocakes.com"),
 *      @OA\Property(property="is_admin", type="boolean", example=true),
 *      @OA\Property(property="email_verified_at", type="string", format="date-time", nullable=true),
 *      @OA\Property(property="created_at", type="string", format="date-time"),
 *      @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 * 
 * @OA\Schema(
 *      schema="StoreSetting",
 *      type="object",
 *      title="StoreSetting",
 *      description="Configurações da loja",
 *      @OA\Property(property="id", type="integer", example=1),
 *      @OA\Property(property="store_name", type="string", example="Bruno Cakes"),
 *      @OA\Property(property="slogan", type="string", example="Os melhores bolos da cidade", nullable=true),
 *      @OA\Property(property="instagram", type="string", example="@brunocakes", nullable=true),
 *      @OA\Property(property="logo_horizontal", type="string", example="logos/horizontal.png", nullable=true),
 *      @OA\Property(property="logo_icon", type="string", example="logos/icon.png", nullable=true),
 *      @OA\Property(property="primary_color", type="string", example="#8B4513"),
 *      @OA\Property(property="mercado_pago_key", type="string", example="MP_KEY_123", nullable=true),
 *      @OA\Property(property="created_at", type="string", format="date-time"),
 *      @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 * 
 * @OA\Schema(
 *      schema="Address",
 *      type="object",
 *      title="Address",
 *      description="Endereço de entrega",
 *      @OA\Property(property="id", type="integer", example=1),
 *      @OA\Property(property="rua", type="string", example="Rua das Flores"),
 *      @OA\Property(property="numero", type="string", example="123"),
 *      @OA\Property(property="bairro", type="string", example="Centro"),
 *      @OA\Property(property="cidade", type="string", example="São Paulo"),
 *      @OA\Property(property="estado", type="string", example="SP"),
 *      @OA\Property(property="ponto_referencia", type="string", example="Próximo ao mercado", nullable=true),
 *      @OA\Property(property="horarios", type="string", example="8h às 18h", nullable=true),
 *      @OA\Property(property="endereco_entrega", type="boolean", example=true),
 *      @OA\Property(property="latitude", type="string", example="-23.550520", nullable=true),
 *      @OA\Property(property="longitude", type="string", example="-46.633309", nullable=true),
 *      @OA\Property(property="created_at", type="string", format="date-time"),
 *      @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
abstract class Controller
{
    //
}
