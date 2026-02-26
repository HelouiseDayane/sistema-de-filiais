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
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Nome da filial
            $table->string('code')->unique(); // Código único da filial (ex: FIL001)
            $table->string('address')->nullable(); // Endereço completo
            $table->string('phone')->nullable(); // Telefone
            $table->string('email')->nullable(); // Email
            $table->text('opening_hours')->nullable(); // Horários de funcionamento (JSON ou texto)
            $table->boolean('is_open')->default(true); // Status aberto/fechado
            $table->boolean('is_active')->default(true); // Filial ativa/inativa
            $table->timestamps();

            $table->index('is_active');
            $table->index('is_open');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('branches');
    }
};
