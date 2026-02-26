<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->string('pix_access_token')->nullable()->after('pix_key');
            $table->string('pix_webhook_url')->nullable()->after('pix_access_token');
        });
    }

    public function down()
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn('pix_access_token');
            $table->dropColumn('pix_webhook_url');
        });
    }
};
