<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\PaymentWebhookController;
use App\Http\Controllers\Api\StreamController;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\ProductAdminController;
use App\Http\Controllers\Admin\OrderAdminController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\BranchController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\EngagementController;
use App\Http\Controllers\Api\GeocodeController;

// ==========================================
// ROTAS PÚBLICAS


// Health check
Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});


// Geocodificação reversa
Route::get('/geocode/reverse', [GeocodeController::class, 'reverse']);

// Filiais públicas (para o usuário escolher)
Route::get('/branches', [BranchController::class, 'publicList']);
// ==========================================

// Produtos (existentes)
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/with-stock', [CheckoutController::class, 'getAllProductsStock']);
Route::get('/products/{id}/stock', [CheckoutController::class, 'getProductStock']);
Route::get('/products/{id}', [ProductController::class, 'show']); // Esta por últim

// Checkout
Route::post('/checkout', [CheckoutController::class, 'storeWithPix']);
Route::get('/checkout/pedidos', [CheckoutController::class, 'getPedidos']);

// Carrinho
Route::prefix('cart')->group(function () {
    Route::post('/add', [CheckoutController::class, 'addToCart']);
    Route::post('/remove', [CheckoutController::class, 'removeFromCart']);
    Route::post('/update', [CheckoutController::class, 'updateCart']);
    Route::get('/session/{session_id}', [CheckoutController::class, 'getCart']);
    Route::delete('/session/{session_id}', [CheckoutController::class, 'clearCart']);
    Route::post('/reserve', [CheckoutController::class, 'reserveCartItems']);
});

// Pedidos
Route::prefix('orders')->group(function () {
    Route::get('/{id}/status', [CheckoutController::class, 'getOrderStatus']);
    Route::get('/{id}/track', [CheckoutController::class, 'trackOrder']);
    Route::patch('/{id}/mark-delivered', [CheckoutController::class, 'markAsDelivered']);
});

// Payment
Route::post('/payment/notify', [PaymentWebhookController::class, 'notify']);
Route::get('/payment/notify', [PaymentWebhookController::class, 'notify']);

// Evolution API Webhook (sem autenticação para receber notificações)
Route::post('/webhooks/evolution/{branchId}', [App\Http\Controllers\WebhookController::class, 'evolutionWebhook']);

// Customer
Route::get('/customer/last-order', [CheckoutController::class, 'getLastOrderCustomer']);

// Analytics
Route::get('/analytics', [AnalyticsController::class, 'index']);

// Stream (se implementado)
Route::prefix('stream')->group(function () {
    Route::get('/updates', [StreamController::class, 'updates']);
    Route::post('/trigger-stock-update', [StreamController::class, 'triggerStockUpdate']);
});

// SSE para eventos em tempo real
Route::get('/stream/updates', [\App\Http\Controllers\RealTimeStreamController::class, 'streamUpdates']);

Route::get('/addresses/active', [AddressController::class, 'getActive']);

// Store Settings (public - apenas dados não sensíveis)
Route::get('/store/settings', [App\Http\Controllers\Api\Admin\StoreSettingController::class, 'public']);

// Engajamento (registro de eventos)
Route::post('/engagement/visitor', [EngagementController::class, 'registerVisitor']);
Route::post('/engagement/pwa-install', [EngagementController::class, 'registerPwaInstall']);
Route::post('/engagement/cart-with-product', [EngagementController::class, 'registerCartWithProduct']);

// ==========================================
// ROTAS ADMIN
// ==========================================
Route::prefix('admin')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    
    Route::middleware(['auth:sanctum'])->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::post('/logout', [AuthController::class, 'logout']);

        // Master Dashboard - Métricas avançadas
        Route::prefix('master')->middleware('role:master')->group(function () {
            Route::get('/metrics', [App\Http\Controllers\Admin\MasterDashboardController::class, 'masterMetrics']);
            Route::get('/stock', [App\Http\Controllers\Admin\MasterDashboardController::class, 'stockByBranch']);
            Route::get('/top-products', [App\Http\Controllers\Admin\MasterDashboardController::class, 'topProducts']);
            Route::get('/top-neighborhoods', [App\Http\Controllers\Admin\MasterDashboardController::class, 'topNeighborhoods']);
            Route::get('/time-series', [App\Http\Controllers\Admin\MasterDashboardController::class, 'timeSeriesData']);
        });

                // Customer
                // Route::get('/customer/last-order', [CheckoutController::class, 'Customer']);
                Route::get('/customers/unique', [OrderAdminController::class, 'getUniqueCustomers']);
                Route::get('customers/analytics', [AnalyticsController::class, 'customerAnalytics']);

        // Products
             Route::prefix('products')->group(function () {
            Route::get('/', [ProductAdminController::class, 'index']);           // GET /api/admin/products
            Route::post('/', [ProductAdminController::class, 'store'])->middleware('role:master,admin');          // POST /api/admin/products
            Route::get('/{id}', [ProductAdminController::class, 'show']);        // GET /api/admin/products/{id}
            Route::put('/{id}', [ProductAdminController::class, 'update'])->middleware('role:master,admin');      // PUT /api/admin/products/{id}
            Route::delete('/{id}', [ProductAdminController::class, 'destroy'])->middleware('role:master,admin');  // DELETE /api/admin/products/{id}
            Route::patch('/{id}/stock', [ProductAdminController::class, 'updateStock'])->middleware('role:master,admin');     // PATCH /api/admin/products/{id}/stock
            Route::patch('/{id}/toggle', [ProductAdminController::class, 'toggleActive'])->middleware('role:master,admin');   // PATCH /api/admin/products/{id}/toggle
            Route::post('/sync-stock', [ProductAdminController::class, 'syncStock'])->middleware('role:master,admin');        // POST /api/admin/products/sync-stock
            
            // Rotas de estoque por filial
            Route::get('/{productId}/stocks', [\App\Http\Controllers\Admin\ProductStockController::class, 'index']);
            Route::put('/{productId}/stocks/{branchId}', [\App\Http\Controllers\Admin\ProductStockController::class, 'update'])->middleware('role:master,admin');
            Route::post('/{productId}/stocks/bulk', [\App\Http\Controllers\Admin\ProductStockController::class, 'bulkUpdate'])->middleware('role:master,admin');
        });
        
        
        // Orders
        Route::prefix('orders')->group(function () {
        Route::get('/', [OrderAdminController::class, 'index']);
        Route::get('/{id}', [OrderAdminController::class, 'show']);
        Route::patch('/{id}/force-expire', [OrderAdminController::class, 'forceExpire']);
        Route::patch('/{id}/mark-delivered', [OrderAdminController::class, 'markAsDelivered']);
        // ✅ AÇÕES EM LOTE (sem /orders/ duplicado)
        Route::patch('/finish', [OrderAdminController::class, 'markAsCompleted']);
        Route::patch('/cancel-payment', [OrderAdminController::class, 'cancelPayment']);
        });
        
        // System
        Route::prefix('system')->group(function () {
            Route::post('/clean-expired-carts', [OrderAdminController::class, 'cleanExpiredCarts']);
            Route::get('/redis-stats', [OrderAdminController::class, 'redisStats']);
        });
        
            Route::patch('addresses/{id}/activate', [AddressController::class, 'activate']);
            Route::apiResource('addresses', AddressController::class);
            
            // Store Settings
            Route::get('settings', [App\Http\Controllers\Api\Admin\StoreSettingController::class, 'index']);
            Route::post('settings', [App\Http\Controllers\Api\Admin\StoreSettingController::class, 'update']);
            Route::put('settings', [App\Http\Controllers\Api\Admin\StoreSettingController::class, 'update']);
            Route::delete('settings', [App\Http\Controllers\Api\Admin\StoreSettingController::class, 'destroy']);
            
            // Branches Management (Filiais)
            Route::prefix('branches')->middleware(['role:master,admin'])->group(function () {
                Route::get('/', [BranchController::class, 'index']);
                Route::post('/', [BranchController::class, 'store'])->middleware('role:master');
                Route::get('/{id}', [BranchController::class, 'show']);
                Route::put('/{id}', [BranchController::class, 'update']);
                Route::delete('/{id}', [BranchController::class, 'destroy'])->middleware('role:master');
                Route::patch('/{id}/toggle-open', [BranchController::class, 'toggleOpen']);
            });
            
            // Users Management (Usuários)
            Route::prefix('users')->middleware(['role:master,admin'])->group(function () {
                Route::get('/', [UserController::class, 'index']);
                Route::post('/', [UserController::class, 'store']);
                Route::get('/{id}', [UserController::class, 'show']);
                Route::put('/{id}', [UserController::class, 'update']);
                Route::delete('/{id}', [UserController::class, 'destroy']);
            });
            
            // Branch Payments Management (Pagamentos de Filiais) - Apenas Master
            Route::prefix('payments')->middleware(['role:master'])->group(function () {
                Route::get('/', [App\Http\Controllers\BranchPaymentController::class, 'index']); // Listar pagamentos
                Route::get('/dashboard', [App\Http\Controllers\BranchPaymentController::class, 'dashboard']); // Dashboard de vendas
                Route::post('/calculate', [App\Http\Controllers\BranchPaymentController::class, 'calculatePayments']); // Calcular pagamentos do período
                Route::patch('/{id}/pay', [App\Http\Controllers\BranchPaymentController::class, 'markAsPaid']); // Dar baixa
            });
            
            // WhatsApp Integration (Evolution API) - Master e Admin
            Route::prefix('whatsapp')->middleware(['role:master,admin'])->group(function () {
                Route::post('/connect', [App\Http\Controllers\Admin\WhatsAppController::class, 'connect']); // Conectar via QR Code
                Route::get('/qrcode/{branchId}', [App\Http\Controllers\Admin\WhatsAppController::class, 'getQrCode']); // Buscar QR Code
                Route::get('/status/{branchId}', [App\Http\Controllers\Admin\WhatsAppController::class, 'status']); // Verificar status
                Route::post('/disconnect/{branchId}', [App\Http\Controllers\Admin\WhatsAppController::class, 'disconnect']); // Desconectar
                Route::get('/refresh-qr/{branchId}', [App\Http\Controllers\Admin\WhatsAppController::class, 'refreshQrCode']); // Novo QR Code
            });
            
            // Courses Management
            Route::apiResource('courses', App\Http\Controllers\Api\Admin\CourseController::class);
            
            // Students Management
            Route::apiResource('students', App\Http\Controllers\Api\Admin\StudentController::class);
            Route::post('students/{student}/enroll', [App\Http\Controllers\Api\Admin\StudentController::class, 'enrollInCourse']);
            Route::patch('students/{student}/courses/{course}/payment', [App\Http\Controllers\Api\Admin\StudentController::class, 'updateEnrollmentPayment']);
            Route::delete('students/{student}/courses/{course}', [App\Http\Controllers\Api\Admin\StudentController::class, 'removeFromCourse']);
    });

    
});

// ==========================================
// ROTAS PÚBLICAS PARA CURSOS
// ==========================================

// Courses (public) - Qualquer pessoa pode ver os cursos e se inscrever
Route::prefix('courses')->group(function () {
    Route::get('/', [App\Http\Controllers\Api\Public\CourseController::class, 'index']); // Listar cursos ativos
    Route::get('/{course}', [App\Http\Controllers\Api\Public\CourseController::class, 'show']); // Ver detalhes do curso
    Route::post('/{course}/enroll', [App\Http\Controllers\Api\Public\CourseController::class, 'enroll']); // Inscrever-se no curso
});