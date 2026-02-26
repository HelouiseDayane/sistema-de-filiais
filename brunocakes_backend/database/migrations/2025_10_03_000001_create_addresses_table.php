<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('addresses', function (Blueprint $table) {
            $table->id();
            $table->string('rua');
            $table->string('numero');
            $table->string('bairro');
            $table->string('cidade');
            $table->string('estado');
            $table->string('ponto_referencia')->nullable();
            $table->string('horarios')->nullable();
              $table->decimal('latitude', 10, 7)->nullable();
              $table->decimal('longitude', 10, 7)->nullable();
            $table->boolean('endereco_entrega')->default(false);
            $table->boolean('ativo')->default(false); // Indica se é o endereço ativo
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('addresses');
    }
};
