<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Development-Only Seed Accounts
        User::updateOrCreate(
            ['email' => 'admin@supportdesk.local'],
            [
                'name' => 'Administrator',
                'password' => 'password123',
                'role' => 'admin',
            ]
        );

        User::updateOrCreate(
            ['email' => 'agent@supportdesk.local'],
            [
                'name' => 'Support Agent',
                'password' => 'password123',
                'role' => 'agent',
            ]
        );

        User::updateOrCreate(
            ['email' => 'requester@supportdesk.local'],
            [
                'name' => 'Jane Requester',
                'password' => 'password123',
                'role' => 'requester',
            ]
        );
    }
}
