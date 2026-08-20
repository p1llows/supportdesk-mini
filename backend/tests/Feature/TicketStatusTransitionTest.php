<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TicketStatusTransitionTest extends TestCase
{
    use RefreshDatabase;

    private Department $dept;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dept = Department::firstOrCreate(['name' => 'Information Technology']);
    }

    /** Helper: create a ticket owned by the given user with the given status. */
    private function makeTicket(User $owner, string $status = 'open'): Ticket
    {
        return Ticket::create([
            'user_id'       => $owner->id,
            'department_id' => $this->dept->id,
            'title'         => 'Test Ticket',
            'description'   => 'Test Description',
            'priority'      => 'medium',
            'status'        => $status,
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // Requester — blocked unconditionally (even idempotent calls)
    // ─────────────────────────────────────────────────────────────

    public function test_requester_cannot_update_status(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);
        $ticket    = $this->makeTicket($requester, 'open');

        $response = $this->actingAs($requester, 'sanctum')
            ->patchJson("/api/v1/tickets/{$ticket->id}/status", ['status' => 'in_progress']);

        $response->assertStatus(403)
            ->assertJson(['status' => 'error']);
    }

    public function test_requester_cannot_update_status_even_when_target_equals_current_status(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);
        $ticket    = $this->makeTicket($requester, 'open');

        // Idempotent call (open → open) must still be 403 for a requester.
        $response = $this->actingAs($requester, 'sanctum')
            ->patchJson("/api/v1/tickets/{$ticket->id}/status", ['status' => 'open']);

        $response->assertStatus(403)
            ->assertJson(['status' => 'error']);
    }

    // ─────────────────────────────────────────────────────────────
    // Agent — forward-only transitions
    // ─────────────────────────────────────────────────────────────

    public function test_agent_can_transition_open_to_in_progress(): void
    {
        $agent  = User::factory()->create(['role' => 'agent']);
        $ticket = $this->makeTicket(User::factory()->create(['role' => 'requester']), 'open');

        $response = $this->actingAs($agent, 'sanctum')
            ->patchJson("/api/v1/tickets/{$ticket->id}/status", ['status' => 'in_progress']);

        $response->assertStatus(200)
            ->assertJson(['status' => 'success', 'data' => ['ticket' => ['status' => 'in_progress']]]);

        $this->assertDatabaseHas('tickets', ['id' => $ticket->id, 'status' => 'in_progress']);
    }

    public function test_agent_cannot_skip_in_progress_state(): void
    {
        $agent  = User::factory()->create(['role' => 'agent']);
        $ticket = $this->makeTicket(User::factory()->create(['role' => 'requester']), 'open');

        $response = $this->actingAs($agent, 'sanctum')
            ->patchJson("/api/v1/tickets/{$ticket->id}/status", ['status' => 'resolved']);

        $response->assertStatus(403)
            ->assertJson(['status' => 'error']);

        $this->assertDatabaseHas('tickets', ['id' => $ticket->id, 'status' => 'open']);
    }

    public function test_agent_cannot_transition_backward(): void
    {
        $agent  = User::factory()->create(['role' => 'agent']);
        $ticket = $this->makeTicket(User::factory()->create(['role' => 'requester']), 'in_progress');

        $response = $this->actingAs($agent, 'sanctum')
            ->patchJson("/api/v1/tickets/{$ticket->id}/status", ['status' => 'open']);

        $response->assertStatus(403)
            ->assertJson(['status' => 'error']);

        $this->assertDatabaseHas('tickets', ['id' => $ticket->id, 'status' => 'in_progress']);
    }

    public function test_agent_cannot_acknowledge_resolved_ticket(): void
    {
        $agent  = User::factory()->create(['role' => 'agent']);
        $ticket = $this->makeTicket(User::factory()->create(['role' => 'requester']), 'resolved');

        $response = $this->actingAs($agent, 'sanctum')
            ->patchJson("/api/v1/tickets/{$ticket->id}/status", ['status' => 'closed']);

        $response->assertStatus(403)
            ->assertJson(['status' => 'error']);

        $this->assertDatabaseHas('tickets', ['id' => $ticket->id, 'status' => 'resolved']);
    }

    // ─────────────────────────────────────────────────────────────
    // Admin — same forward-only restrictions, plus extra powers
    // ─────────────────────────────────────────────────────────────

    public function test_admin_cannot_skip_in_progress_state(): void
    {
        $admin  = User::factory()->create(['role' => 'admin']);
        $ticket = $this->makeTicket(User::factory()->create(['role' => 'requester']), 'open');

        $response = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/v1/tickets/{$ticket->id}/status", ['status' => 'resolved']);

        $response->assertStatus(403)
            ->assertJson(['status' => 'error']);

        $this->assertDatabaseHas('tickets', ['id' => $ticket->id, 'status' => 'open']);
    }

    public function test_admin_cannot_transition_backward(): void
    {
        $admin  = User::factory()->create(['role' => 'admin']);
        $ticket = $this->makeTicket(User::factory()->create(['role' => 'requester']), 'in_progress');

        $response = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/v1/tickets/{$ticket->id}/status", ['status' => 'open']);

        $response->assertStatus(403)
            ->assertJson(['status' => 'error']);

        $this->assertDatabaseHas('tickets', ['id' => $ticket->id, 'status' => 'in_progress']);
    }

    public function test_admin_can_acknowledge_resolved_ticket(): void
    {
        $admin  = User::factory()->create(['role' => 'admin']);
        $ticket = $this->makeTicket(User::factory()->create(['role' => 'requester']), 'resolved');

        $response = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/v1/tickets/{$ticket->id}/status", ['status' => 'closed']);

        $response->assertStatus(200)
            ->assertJson(['status' => 'success', 'data' => ['ticket' => ['status' => 'closed']]]);

        $this->assertDatabaseHas('tickets', ['id' => $ticket->id, 'status' => 'closed']);
    }

    public function test_admin_can_reopen_closed_ticket_to_open_state(): void
    {
        $admin  = User::factory()->create(['role' => 'admin']);
        $ticket = $this->makeTicket(User::factory()->create(['role' => 'requester']), 'closed');

        $response = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/v1/tickets/{$ticket->id}/status", ['status' => 'open']);

        $response->assertStatus(200)
            ->assertJson(['status' => 'success', 'data' => ['ticket' => ['status' => 'open']]]);

        $this->assertDatabaseHas('tickets', ['id' => $ticket->id, 'status' => 'open']);
    }

    // ─────────────────────────────────────────────────────────────
    // Idempotency & Validation
    // ─────────────────────────────────────────────────────────────

    public function test_idempotent_status_update_returns_200_no_op(): void
    {
        $agent     = User::factory()->create(['role' => 'agent']);
        $ticket    = $this->makeTicket(User::factory()->create(['role' => 'requester']), 'in_progress');
        $updatedAt = $ticket->updated_at;

        $response = $this->actingAs($agent, 'sanctum')
            ->patchJson("/api/v1/tickets/{$ticket->id}/status", ['status' => 'in_progress']);

        $response->assertStatus(200)
            ->assertJson(['status' => 'success', 'data' => ['ticket' => ['status' => 'in_progress']]]);

        // updated_at must not change on a no-op.
        $this->assertDatabaseHas('tickets', [
            'id'         => $ticket->id,
            'status'     => 'in_progress',
            'updated_at' => $updatedAt,
        ]);
    }

    public function test_invalid_status_string_returns_422_validation_error(): void
    {
        $agent  = User::factory()->create(['role' => 'agent']);
        $ticket = $this->makeTicket(User::factory()->create(['role' => 'requester']), 'open');

        $response = $this->actingAs($agent, 'sanctum')
            ->patchJson("/api/v1/tickets/{$ticket->id}/status", ['status' => 'invalid_state']);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    public function test_unauthenticated_user_cannot_update_status(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);
        $ticket    = $this->makeTicket($requester, 'open');

        $this->patchJson("/api/v1/tickets/{$ticket->id}/status", ['status' => 'in_progress'])
            ->assertStatus(401);
    }
}
