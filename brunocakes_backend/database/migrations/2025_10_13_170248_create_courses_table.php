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
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description');
            $table->string('image')->nullable();
            $table->string('location')->nullable(); // Nome do local
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->string('street'); // rua
            $table->string('number'); // numero
            $table->string('neighborhood'); // bairro
            $table->string('city'); // cidade
            $table->string('state'); // estado
            $table->integer('duration_hours'); // duração em horas
            $table->string('schedule'); // horário (ex: "14:00 às 18:00")
            $table->decimal('price', 10, 2); // valor
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('courses');
    }
};
