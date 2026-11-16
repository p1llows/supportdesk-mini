<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Ticket;
use App\Models\TicketActivity;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_access_activity_logs(): void
    {
        $dept = Department::firstOrCreate(['name' => 'Information Technology']);
        $agent = User::factory()->create(['role' => 'agent', 'department_id' => $dept->id]);
        $requester = User::factory()->create(['role' => 'requester', 'department_id' => $dept->id]);

        $this->getJson('/api/v1/activity-logs')->assertStatus(401);
        $this->actingAs($agent, 'sanctum')->getJson('/api/v1/activity-logs')->assertStatus(403);
        $this->actingAs($requester, 'sanctum')->getJson('/api/v1/activity-logs')->assertStatus(403);
    }

    public function test_admin_can_list_and_filter_activity_logs(): void
    {
        $dept = Department::firstOrCreate(['name' => 'Information Technology']);
        $admin = User::factory()->create(['role' => 'admin']);
        $requester = User::factory()->create(['role' => 'requester', 'department_id' => $dept->id]);

        $ticket = Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $dept->id,
            'title' => 'Printer jam on floor 2',
            'description' => 'Needs service.',
            'priority' => 'medium',
            'status' => 'open',
        ]);

        TicketActivity::create([
            'ticket_id' => $ticket->id,
            'user_id' => $requester->id,
            'type' => 'created',
        ]);

        TicketActivity::create([
            'ticket_id' => $ticket->id,
            'user_id' => $admin->id,
            'type' => 'status_change',
            'metadata' => ['old' => 'open', 'new' => 'in_progress'],
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/activity-logs')
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonCount(2, 'data.activities');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/activity-logs?type=status_change')
            ->assertOk()
            ->assertJsonCount(1, 'data.activities')
            ->assertJsonPath('data.activities.0.type', 'status_change');
    }
}
