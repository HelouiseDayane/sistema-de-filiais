<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\StoreSetting;

class StoreSettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        StoreSetting::firstOrCreate(
            ['id' => 1],
            [
                'store_name' => 'Meu Delivery',
                'store_slogan' => 'Coloque aqui seu slogan',
                'instagram' => 'meudelivery',
                'primary_color' => '#FFFFFF',
                'logo_horizontal' => null,
                'logo_icon' => null,
                'mercado_pago_key' => null,
            ]
        );
    }
}
