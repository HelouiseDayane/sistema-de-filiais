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
        Schema::table('addresses', function (Blueprint $table) {
            // Adicionar coluna branch_id (filial do endereço)
            $table->foreignId('branch_id')->nullable()->after('id')->constrained('branches')->onDelete('cascade');
            
            $table->index('branch_id');
            
            // Remover constraint de apenas 1 ativo global, agora será 1 ativo por filial
            // A lógica será implementada no controller
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->dropForeign(['branch_id']);
            $table->dropColumn('branch_id');
        });
    }
};
