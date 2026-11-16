<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\RolePermission;
use App\Models\Ticket;
use App\Models\TicketActivity;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RolePermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_view_or_update_role_permissions(): void
    {
        $dept = Department::firstOrCreate(['name' => 'Information Technology']);
        $agent = User::factory()->create(['role' => 'agent', 'department_id' => $dept->id]);
        $requester = User::factory()->create(['role' => 'requester', 'department_id' => $dept->id]);

        $this->getJson('/api/v1/roles/permissions')->assertStatus(401);
        $this->actingAs($agent, 'sanctum')->getJson('/api/v1/roles/permissions')->assertStatus(403);
        $this->actingAs($requester, 'sanctum')->getJson('/api/v1/roles/permissions')->assertStatus(403);
        $this->actingAs($agent, 'sanctum')->putJson('/api/v1/roles/permissions', ['permissions' => []])->assertStatus(403);
    }

    public function test_admin_can_update_role_permissions_and_locked_permissions_stay_enforced(): void
    {
        $dept = Department::firstOrCreate(['name' => 'Information Technology']);
        $admin = User::factory()->create(['role' => 'admin']);
        $agent = User::factory()->create(['role' => 'agent', 'department_id' => $dept->id]);
        $requester = User::factory()->create(['role' => 'requester', 'department_id' => $dept->id]);

        $ticket = Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $dept->id,
            'title' => 'Test permission enforcement',
            'description' => 'Details',
            'priority' => 'medium',
            'status' => 'resolved',
        ]);

        // By default, agent cannot close resolved tickets
        $this->actingAs($agent, 'sanctum')
            ->patchJson("/api/v1/tickets/{$ticket->id}/status", ['status' => 'closed'])
            ->assertStatus(403);

        // Admin enables close_reopen_tickets for agent, and tries to disable locked manage_roles for admin
        $matrix = collect(RolePermission::matrix())->map(function ($row) {
            if ($row['key'] === 'close_reopen_tickets') {
                $row['agent'] = true;
            }
            if ($row['key'] === 'manage_roles') {
                $row['admin'] = false; // locked!
            }
            return [
                'key' => $row['key'],
                'admin' => $row['admin'],
                'agent' => $row['agent'],
                'requester' => $row['requester'],
            ];
        })->all();

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/v1/roles/permissions', ['permissions' => $matrix])
            ->assertOk()
            ->assertJsonPath('status', 'success');

        // Locked admin permission remains true
        $this->assertTrue(RolePermission::allows('admin', 'manage_roles'));
        // Updated agent permission is now true and enforced by the API
        $this->assertTrue(RolePermission::allows('agent', 'close_reopen_tickets'));

        $this->actingAs($agent, 'sanctum')
            ->patchJson("/api/v1/tickets/{$ticket->id}/status", ['status' => 'closed'])
            ->assertOk()
            ->assertJsonPath('data.ticket.status', 'closed');
    }
}
