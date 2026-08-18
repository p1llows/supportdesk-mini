<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $departments = [
            [
                'name' => 'Information Technology',
                'description' => 'Technical support, systems, hardware, software, and IT services',
            ],
            [
                'name' => 'Human Resources',
                'description' => 'Employee concerns, HR inquiries, and personnel support',
            ],
            [
                'name' => 'Finance',
                'description' => 'Financial transactions, invoicing, expenses, and accounting concerns',
            ],
            [
                'name' => 'Operations',
                'description' => 'General business operations, processes, and operational support',
            ],
            [
                'name' => 'Facilities',
                'description' => 'Office maintenance, equipment, supplies, and facility concerns',
            ],
        ];

        foreach ($departments as $dept) {
            Department::firstOrCreate(
                ['name' => $dept['name']],
                ['description' => $dept['description']]
            );
        }
    }
}
