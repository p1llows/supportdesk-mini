<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Ticket;
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

        // Development & Presentation Seed Accounts
        $admin = User::updateOrCreate(
            ['email' => 'admin@supportdesk.local'],
            [
                'name' => 'Administrator',
                'password' => Hash::make('password123'),
                'role' => 'admin',
            ]
        );

        $agent = User::updateOrCreate(
            ['email' => 'agent@supportdesk.local'],
            [
                'name' => 'Support Agent',
                'password' => Hash::make('password123'),
                'role' => 'agent',
            ]
        );

        $requester = User::updateOrCreate(
            ['email' => 'requester@supportdesk.local'],
            [
                'name' => 'Jane Requester',
                'password' => Hash::make('password123'),
                'role' => 'requester',
            ]
        );

        $deptIt = Department::where('name', 'Information Technology')->first();
        $deptHr = Department::where('name', 'Human Resources')->first();
        $deptFin = Department::where('name', 'Finance')->first();

        // Seed Sample Presentation Tickets
        if ($deptIt && $deptHr && $deptFin && $requester) {
            Ticket::updateOrCreate(
                ['title' => 'VPN Access Request for Remote Work'],
                [
                    'user_id' => $requester->id,
                    'department_id' => $deptIt->id,
                    'description' => 'Need VPN credentials configured for remote laptop.',
                    'priority' => 'medium',
                    'status' => 'open',
                ]
            );

            Ticket::updateOrCreate(
                ['title' => 'Printer Offline in HR Office'],
                [
                    'user_id' => $requester->id,
                    'department_id' => $deptHr->id,
                    'description' => 'HR department printer is not responding on network.',
                    'priority' => 'high',
                    'status' => 'in_progress',
                ]
            );

            Ticket::updateOrCreate(
                ['title' => 'Software License Renewal for Finance'],
                [
                    'user_id' => $requester->id,
                    'department_id' => $deptFin->id,
                    'description' => 'Annual spreadsheet software subscription renewal.',
                    'priority' => 'low',
                    'status' => 'closed',
                ]
            );
        }
    }
}
