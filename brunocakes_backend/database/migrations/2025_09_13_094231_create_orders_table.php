<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            // cliente — sem login obrigatório
            $table->string('customer_name');
            $table->string('customer_email')->nullable();
            $table->string('customer_phone');
            // endereço
            $table->string('address_street')->nullable();
            $table->string('address_number')->nullable();
            $table->string('address_neighborhood')->nullable()->index();
            $table->string('address_city')->nullable();
            $table->string('address_state')->nullable();
            $table->string('address_zip')->nullable();
            // valores
            $table->decimal('total_amount', 10, 2);
            $table->string('payment_method')->default('pix'); // future-proof
            $table->string('payment_reference')->nullable(); // id do provedor
            // status
              $table->enum('status', ['pending_payment','awaiting_seller_confirmation','confirmed','canceled','completed','delivered'])
                  ->default('pending_payment');
            $table->boolean('pickup_info_visible')->default(false); // quando admin confirmar, set true
            $table->timestamps();

            $table->index('status');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
