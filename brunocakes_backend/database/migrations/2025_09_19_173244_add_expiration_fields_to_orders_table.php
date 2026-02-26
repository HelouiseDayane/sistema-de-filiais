<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('cart_expires_at')->nullable()->after('status');
            $table->timestamp('checkout_expires_at')->nullable()->after('cart_expires_at');
            $table->boolean('stock_reserved')->default(false)->after('checkout_expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['cart_expires_at', 'checkout_expires_at', 'stock_reserved']);
        });
    }
};