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
        Schema::create('store_settings', function (Blueprint $table) {
            $table->id();
            $table->string('store_name');
            $table->string('store_slogan')->nullable(); // Slogan da loja
            $table->string('instagram')->nullable();
            $table->string('phone')->nullable(); // Handle do Instagram
            $table->string('logo_horizontal')->nullable(); // Logo horizontal
            $table->string('logo_icon')->nullable(); // Ícone/selo da loja
            $table->string('primary_color')->default('#8B4513'); // Cor primária em hex
            $table->text('mercado_pago_key')->nullable(); // Chave do Mercado Pago
            $table->text('whatsapp')->nullable(); 
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('store_settings');
    }
};
