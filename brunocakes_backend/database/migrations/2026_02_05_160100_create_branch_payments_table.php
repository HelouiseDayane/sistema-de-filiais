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
        Schema::create('branch_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->date('period_start'); // Início do período
            $table->date('period_end'); // Fim do período
            $table->decimal('total_sales', 10, 2)->default(0); // Total de vendas no período
            $table->decimal('profit_percentage', 5, 2); // % de lucro aplicado
            $table->decimal('commission_amount', 10, 2); // Valor da comissão a pagar
            $table->decimal('paid_amount', 10, 2)->default(0); // Valor pago
            $table->enum('status', ['pendente', 'pago', 'cancelado'])->default('pendente');
            $table->timestamp('paid_at')->nullable(); // Data/hora do pagamento
            $table->text('notes')->nullable(); // Observações
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('branch_payments');
    }
};
