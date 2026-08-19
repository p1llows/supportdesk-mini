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
        // 1. Add nullable department_id column if not already present
        if (! Schema::hasColumn('tickets', 'department_id')) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->unsignedBigInteger('department_id')->nullable()->after('user_id');
            });
        }

        // 2. Query departments table (inserted in 2026_08_18_000001_create_departments_table)
        $itDeptId = DB::table('departments')->where('name', 'Information Technology')->value('id') ?? 1;
        $hrDeptId = DB::table('departments')->where('name', 'Human Resources')->value('id') ?? 2;
        $financeDeptId = DB::table('departments')->where('name', 'Finance')->value('id') ?? 3;
        $opsDeptId = DB::table('departments')->where('name', 'Operations')->value('id') ?? 4;
        $facilitiesDeptId = DB::table('departments')->where('name', 'Facilities')->value('id') ?? 5;

        // Map legacy string names to new department IDs
        $departmentMap = [
            'Information Technology' => $itDeptId,
            'IT Support' => $itDeptId,
            'Human Resources' => $hrDeptId,
            'HR' => $hrDeptId,
            'Finance' => $financeDeptId,
            'Operations' => $opsDeptId,
            'Facilities' => $facilitiesDeptId,
        ];

        foreach ($departmentMap as $legacyName => $deptId) {
            DB::table('tickets')->where('department', $legacyName)->update(['department_id' => $deptId]);
        }

        // Assign any remaining NULL department records to Information Technology ID
        DB::table('tickets')->whereNull('department_id')->update(['department_id' => $itDeptId]);

        // 3. Drop legacy department string column if present
        if (Schema::hasColumn('tickets', 'department')) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->dropColumn('department');
            });
        }

        // 4. Enforce non-nullable constraint and foreign key constraint to departments.id
        Schema::table('tickets', function (Blueprint $table) {
            $table->unsignedBigInteger('department_id')->nullable(false)->change();
            $table->foreign('department_id')->references('id')->on('departments')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropForeign(['department_id']);
            $table->string('department')->nullable()->after('user_id');
        });

        // Restore department string names
        $departments = DB::table('departments')->pluck('name', 'id');
        foreach ($departments as $id => $name) {
            DB::table('tickets')->where('department_id', $id)->update(['department' => $name]);
        }

        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn('department_id');
        });
    }
};
