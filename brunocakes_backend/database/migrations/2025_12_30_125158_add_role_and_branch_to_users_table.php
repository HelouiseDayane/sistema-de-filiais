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
        Schema::table('users', function (Blueprint $table) {
            // Adicionar coluna de role (master, admin, employee)
            $table->enum('role', ['master', 'admin', 'employee'])->default('employee')->after('is_admin');
            
            // Adicionar coluna branch_id (filial do usuário)
            $table->foreignId('branch_id')->nullable()->after('role')->constrained('branches')->onDelete('set null');
            
            $table->index('role');
            $table->index('branch_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['branch_id']);
            $table->dropColumn(['role', 'branch_id']);
        });
    }
};
