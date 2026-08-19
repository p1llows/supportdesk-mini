<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TicketUpdateDeleteTest extends TestCase
{
    use RefreshDatabase;

    private Department $dept1;

    private Department $dept2;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dept1 = Department::firstOrCreate(['name' => 'Information Technology']);
        $this->dept2 = Department::firstOrCreate(['name' => 'Human Resources']);
    }

    public function test_unauthenticated_user_cannot_edit_or_delete_tickets(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);
        $ticket = Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $this->dept1->id,
            'title' => 'Sample Title',
            'description' => 'Sample Description',
            'priority' => 'low',
            'status' => 'open',
        ]);

        $this->putJson("/api/v1/tickets/{$ticket->id}", [
            'title' => 'Unauth Edit',
        ])->assertStatus(401);

        $this->deleteJson("/api/v1/tickets/{$ticket->id}")
            ->assertStatus(401);
    }

    public function test_requester_can_edit_own_open_ticket(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);
        $ticket = Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $this->dept1->id,
            'title' => 'Original Title',
            'description' => 'Original Description',
            'priority' => 'low',
            'status' => 'open',
        ]);

        $response = $this->actingAs($requester, 'sanctum')
            ->putJson("/api/v1/tickets/{$ticket->id}", [
                'title' => 'Updated Title By Requester',
                'priority' => 'high',
                'department_id' => $this->dept2->id,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Ticket updated successfully',
                'data' => [
                    'ticket' => [
                        'id' => $ticket->id,
                        'title' => 'Updated Title By Requester',
                        'priority' => 'high',
                        'department_id' => $this->dept2->id,
                    ],
                ],
            ]);

        $this->assertDatabaseHas('tickets', [
            'id' => $ticket->id,
            'title' => 'Updated Title By Requester',
            'priority' => 'high',
            'department_id' => $this->dept2->id,
        ]);
    }

    public function test_requester_cannot_edit_own_ticket_when_status_is_in_progress(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);
        $ticket = Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $this->dept1->id,
            'title' => 'In Progress Ticket',
            'description' => 'Description',
            'priority' => 'low',
            'status' => 'in_progress',
        ]);

        $this->actingAs($requester, 'sanctum')
            ->putJson("/api/v1/tickets/{$ticket->id}", ['title' => 'New Title'])
            ->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Requesters can only edit their own open tickets',
            ]);
    }

    public function test_requester_cannot_edit_own_ticket_when_status_is_resolved(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);
        $ticket = Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $this->dept1->id,
            'title' => 'Resolved Ticket',
            'description' => 'Description',
            'priority' => 'low',
            'status' => 'resolved',
        ]);

        $this->actingAs($requester, 'sanctum')
            ->putJson("/api/v1/tickets/{$ticket->id}", ['title' => 'New Title'])
            ->assertStatus(403);
    }

    public function test_requester_cannot_update_closed_ticket(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);
        $ticket = Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $this->dept1->id,
            'title' => 'Closed Ticket',
            'description' => 'Description',
            'priority' => 'low',
            'status' => 'closed',
        ]);

        $this->actingAs($requester, 'sanctum')
            ->putJson("/api/v1/tickets/{$ticket->id}", ['title' => 'New Title'])
            ->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Closed tickets cannot be modified',
            ]);
    }

    public function test_requester_cannot_edit_another_users_ticket(): void
    {
        $requester1 = User::factory()->create(['role' => 'requester']);
        $requester2 = User::factory()->create(['role' => 'requester']);

        $ticket = Ticket::create([
            'user_id' => $requester1->id,
            'department_id' => $this->dept1->id,
            'title' => 'Other User Ticket',
            'description' => 'Description',
            'priority' => 'low',
            'status' => 'open',
        ]);

        $this->actingAs($requester2, 'sanctum')
            ->putJson("/api/v1/tickets/{$ticket->id}", ['title' => 'Hacked Title'])
            ->assertStatus(403);
    }

    public function test_agent_can_update_active_ticket_priority_and_department(): void
    {
        $agent = User::factory()->create(['role' => 'agent']);
        $requester = User::factory()->create(['role' => 'requester']);

        $ticket = Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $this->dept1->id,
            'title' => 'Active Ticket',
            'description' => 'Description',
            'status' => 'in_progress',
            'priority' => 'medium',
        ]);

        $response = $this->actingAs($agent, 'sanctum')
            ->putJson("/api/v1/tickets/{$ticket->id}", [
                'priority' => 'high',
                'department_id' => $this->dept2->id,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.ticket.priority', 'high')
            ->assertJsonPath('data.ticket.department_id', $this->dept2->id);
    }

    public function test_agent_cannot_update_closed_ticket(): void
    {
        $agent = User::factory()->create(['role' => 'agent']);
        $requester = User::factory()->create(['role' => 'requester']);

        $ticket = Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $this->dept1->id,
            'title' => 'Closed Ticket',
            'description' => 'Description',
            'priority' => 'low',
            'status' => 'closed',
        ]);

        $this->actingAs($agent, 'sanctum')
            ->putJson("/api/v1/tickets/{$ticket->id}", ['priority' => 'low'])
            ->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Closed tickets cannot be modified',
            ]);
    }

    public function test_admin_can_update_active_ticket_details(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $requester = User::factory()->create(['role' => 'requester']);

        $ticket = Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $this->dept1->id,
            'title' => 'Old Title',
            'description' => 'Old Description',
            'priority' => 'low',
            'status' => 'open',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/tickets/{$ticket->id}", [
                'title' => 'Admin Updated Title',
                'description' => 'Admin updated description',
                'priority' => 'high',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.ticket.title', 'Admin Updated Title');
    }

    public function test_admin_cannot_update_closed_ticket(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $requester = User::factory()->create(['role' => 'requester']);

        $ticket = Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $this->dept1->id,
            'title' => 'Closed Ticket',
            'description' => 'Description',
            'priority' => 'low',
            'status' => 'closed',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/tickets/{$ticket->id}", ['title' => 'Reopened Title'])
            ->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Closed tickets cannot be modified',
            ]);
    }

    public function test_ticket_update_ignores_status_parameter(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $requester = User::factory()->create(['role' => 'requester']);

        $ticket = Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $this->dept1->id,
            'title' => 'Open Ticket',
            'description' => 'Description',
            'priority' => 'low',
            'status' => 'open',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/tickets/{$ticket->id}", [
                'title' => 'Title Only',
                'status' => 'closed', // Attempt status transition
            ]);

        $response->assertStatus(200);

        $ticket->refresh();
        $this->assertEquals('open', $ticket->status);
    }

    public function test_agent_cannot_delete_ticket(): void
    {
        $agent = User::factory()->create(['role' => 'agent']);
        $requester = User::factory()->create(['role' => 'requester']);

        $ticket = Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $this->dept1->id,
            'title' => 'Ticket',
            'description' => 'Description',
            'priority' => 'low',
            'status' => 'open',
        ]);

        $this->actingAs($agent, 'sanctum')
            ->deleteJson("/api/v1/tickets/{$ticket->id}")
            ->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Only administrators are authorized to delete tickets',
            ]);
    }

    public function test_requester_cannot_delete_ticket(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);

        $ticket = Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $this->dept1->id,
            'title' => 'Ticket',
            'description' => 'Description',
            'priority' => 'low',
            'status' => 'open',
        ]);

        $this->actingAs($requester, 'sanctum')
            ->deleteJson("/api/v1/tickets/{$ticket->id}")
            ->assertStatus(403);
    }

    public function test_admin_can_delete_ticket(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $requester = User::factory()->create(['role' => 'requester']);

        $ticket = Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $this->dept1->id,
            'title' => 'Ticket To Delete',
            'description' => 'Description',
            'priority' => 'low',
            'status' => 'open',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/v1/tickets/{$ticket->id}");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Ticket deleted successfully',
            ]);

        $this->assertDatabaseMissing('tickets', ['id' => $ticket->id]);
    }

    public function test_admin_can_delete_closed_ticket(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $requester = User::factory()->create(['role' => 'requester']);

        $ticket = Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $this->dept1->id,
            'title' => 'Closed Ticket To Delete',
            'description' => 'Description',
            'priority' => 'low',
            'status' => 'closed',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/v1/tickets/{$ticket->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('tickets', ['id' => $ticket->id]);
    }
}
