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
        if (! Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->foreignId('ticket_id')->constrained('tickets')->onDelete('cascade');
                $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('type', 50); // ticket_created, status_change, priority_change, department_change, comment
                $table->string('message');
                $table->timestamp('read_at')->nullable();
                $table->timestamps();

                // Efficient per-user unread queries
                $table->index(['user_id', 'read_at']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
