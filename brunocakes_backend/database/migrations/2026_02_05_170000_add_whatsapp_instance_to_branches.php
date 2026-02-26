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
            $table->string('whatsapp_instance_name')->nullable()->after('profit_percentage');
            $table->string('whatsapp_number')->nullable()->after('whatsapp_instance_name');
            $table->enum('whatsapp_status', ['disconnected', 'connecting', 'connected'])->default('disconnected')->after('whatsapp_number');
            $table->timestamp('whatsapp_connected_at')->nullable()->after('whatsapp_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn([
                'whatsapp_instance_name',
                'whatsapp_number',
                'whatsapp_status',
                'whatsapp_connected_at'
            ]);
        });
    }
};
