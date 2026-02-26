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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('provider')->nullable(); // ex: 'pix_provider'
            $table->string('provider_payment_id')->nullable();
            $table->enum('status', ['pending','paid','failed',''])->default('pending');
            $table->decimal('amount', 10, 2);
            $table->text('pix_payload')->nullable(); // pode armazenar JSON com dados para gerar QR
            $table->timestamps();

            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
