<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Chama os seeders na ordem correta
        $this->call([
            BranchSeeder::class,  // Primeiro criar as filiais
            UserSeeder::class,    // Depois criar os usuários vinculados às filiais
        ]);
    }
}
