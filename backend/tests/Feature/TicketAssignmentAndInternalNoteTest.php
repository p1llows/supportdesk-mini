<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TicketAssignmentAndInternalNoteTest extends TestCase
{
    use RefreshDatabase;

    private Department $itDept;
    private Department $hrDept;
    private User $admin;
    private User $itAgent;
    private User $hrAgent;
    private User $requester;
    private Ticket $ticket;

    protected function setUp(): void
    {
        parent::setUp();

        $this->itDept = Department::firstOrCreate(['name' => 'Information Technology']);
        $this->hrDept = Department::firstOrCreate(['name' => 'Human Resources']);

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->itAgent = User::factory()->create(['role' => 'agent', 'department_id' => $this->itDept->id]);
        $this->hrAgent = User::factory()->create(['role' => 'agent', 'department_id' => $this->hrDept->id]);
        $this->requester = User::factory()->create(['role' => 'requester', 'department_id' => $this->itDept->id]);

        $this->ticket = Ticket::create([
            'user_id' => $this->requester->id,
            'department_id' => $this->itDept->id,
            'title' => 'VPN connection drops',
            'description' => 'Drops every 10 minutes.',
            'priority' => 'high',
            'status' => 'open',
        ]);
    }

    public function test_admin_can_assign_and_unassign_ticket(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/tickets/{$this->ticket->id}/assign", [
                'assigned_to' => $this->itAgent->id,
            ])
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.ticket.assigned_to', $this->itAgent->id)
            ->assertJsonPath('data.ticket.assignee.id', $this->itAgent->id);

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/tickets/{$this->ticket->id}/assign", [
                'assigned_to' => null,
            ])
            ->assertOk()
            ->assertJsonPath('data.ticket.assigned_to', null);
    }

    public function test_department_agent_can_claim_ticket_but_other_dept_agent_is_forbidden(): void
    {
        $this->actingAs($this->hrAgent, 'sanctum')
            ->patchJson("/api/v1/tickets/{$this->ticket->id}/assign", [
                'assigned_to' => $this->hrAgent->id,
            ])
            ->assertStatus(403);

        $this->actingAs($this->itAgent, 'sanctum')
            ->patchJson("/api/v1/tickets/{$this->ticket->id}/assign", [
                'assigned_to' => $this->itAgent->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.ticket.assigned_to', $this->itAgent->id);
    }

    public function test_requester_cannot_assign_ticket(): void
    {
        $this->actingAs($this->requester, 'sanctum')
            ->patchJson("/api/v1/tickets/{$this->ticket->id}/assign", [
                'assigned_to' => $this->itAgent->id,
            ])
            ->assertStatus(403);
    }

    public function test_internal_notes_are_visible_to_agents_and_hidden_from_requesters(): void
    {
        $this->actingAs($this->itAgent, 'sanctum')
            ->postJson("/api/v1/tickets/{$this->ticket->id}/comments", [
                'body' => 'Internal triage note: check firewall logs',
                'is_internal' => true,
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.activity.is_internal', true);

        $this->actingAs($this->itAgent, 'sanctum')
            ->postJson("/api/v1/tickets/{$this->ticket->id}/comments", [
                'body' => 'We are investigating your VPN issue.',
                'is_internal' => false,
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.activity.is_internal', false);

        // Agent sees both
        $this->actingAs($this->itAgent, 'sanctum')
            ->getJson("/api/v1/tickets/{$this->ticket->id}/activities")
            ->assertOk()
            ->assertJsonCount(2, 'data.activities');

        // Requester only sees the public comment
        $this->actingAs($this->requester, 'sanctum')
            ->getJson("/api/v1/tickets/{$this->ticket->id}/activities")
            ->assertOk()
            ->assertJsonCount(1, 'data.activities')
            ->assertJsonPath('data.activities.0.body', 'We are investigating your VPN issue.');
    }

    public function test_requester_cannot_post_internal_note(): void
    {
        $this->actingAs($this->requester, 'sanctum')
            ->postJson("/api/v1/tickets/{$this->ticket->id}/comments", [
                'body' => 'Trying internal note',
                'is_internal' => true,
            ])
            ->assertStatus(403);
    }
}
