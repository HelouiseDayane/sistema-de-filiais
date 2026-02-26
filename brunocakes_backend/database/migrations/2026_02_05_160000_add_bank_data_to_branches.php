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
        Schema::table('branches', function (Blueprint $table) {
            $table->string('pix_key')->nullable()->after('email'); // Chave PIX
            $table->enum('payment_frequency', ['quinzenal', 'mensal', 'trimestral'])->default('mensal')->after('pix_key'); // Periodicidade
            $table->decimal('profit_percentage', 5, 2)->default(100.00)->after('payment_frequency'); // % de lucro (100% = sem desconto)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn(['pix_key', 'payment_frequency', 'profit_percentage']);
        });
    }
};
