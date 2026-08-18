<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed default departments
        $this->call(DepartmentSeeder::class);

        // Development-Only Seed Accounts
        User::updateOrCreate(
            ['email' => 'admin@supportdesk.local'],
            [
                'name' => 'Administrator',
                'password' => Hash::make('password123'),
                'role' => 'admin',
            ]
        );

        User::updateOrCreate(
            ['email' => 'agent@supportdesk.local'],
            [
                'name' => 'Support Agent',
                'password' => Hash::make('password123'),
                'role' => 'agent',
            ]
        );

        User::updateOrCreate(
            ['email' => 'requester@supportdesk.local'],
            [
                'name' => 'Jane Requester',
                'password' => Hash::make('password123'),
                'role' => 'requester',
            ]
        );
    }
}
