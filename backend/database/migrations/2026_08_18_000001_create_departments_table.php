<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Insert five approved departments directly in migration up()
        // ensuring departments exist before add_department_id_to_tickets_table migration runs
        $now = now();
        DB::table('departments')->insert([
            [
                'name' => 'Information Technology',
                'description' => 'Technical support, systems, hardware, software, and IT services',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Human Resources',
                'description' => 'Employee concerns, HR inquiries, and personnel support',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Finance',
                'description' => 'Financial transactions, invoicing, expenses, and accounting concerns',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Operations',
                'description' => 'General business operations, processes, and operational support',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Facilities',
                'description' => 'Office maintenance, equipment, supplies, and facility concerns',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('departments');
    }
};
