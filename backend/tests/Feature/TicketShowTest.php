<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TicketShowTest extends TestCase
{
    use RefreshDatabase;

    private Department $itDept;
    private Department $hrDept;

    protected function setUp(): void
    {
        parent::setUp();
        $this->itDept = Department::firstOrCreate(['name' => 'Information Technology']);
        $this->hrDept = Department::firstOrCreate(['name' => 'Human Resources']);
    }

    /** Helper: create a ticket owned by the given user in the given department. */
    private function makeTicket(User $owner, Department $department): Ticket
    {
        return Ticket::create([
            'user_id'       => $owner->id,
            'department_id' => $department->id,
            'title'         => 'VPN Access Request',
            'description'   => 'Need VPN credentials configured.',
            'priority'      => 'medium',
            'status'        => 'open',
        ]);
    }

    public function test_admin_can_view_any_ticket(): void
    {
        $requester = User::factory()->create(['role' => 'requester', 'department_id' => $this->itDept->id]);
        $admin = User::factory()->create(['role' => 'admin']);
        $ticket = $this->makeTicket($requester, $this->itDept);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/tickets/{$ticket->id}");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'ticket' => [
                        'id' => $ticket->id,
                        'title' => 'VPN Access Request',
                        'description' => 'Need VPN credentials configured.',
                        'priority' => 'medium',
                        'status' => 'open',
                        'department' => [
                            'id' => $this->itDept->id,
                            'name' => 'Information Technology',
                        ],
                        'requester' => [
                            'id' => $requester->id,
                            'email' => $requester->email,
                        ],
                    ],
                ],
            ]);
    }

    public function test_agent_can_view_ticket_in_their_department(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);
        $agent = User::factory()->create(['role' => 'agent', 'department_id' => $this->itDept->id]);
        $ticket = $this->makeTicket($requester, $this->itDept);

        $response = $this->actingAs($agent, 'sanctum')
            ->getJson("/api/v1/tickets/{$ticket->id}");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.ticket.id', $ticket->id);
    }

    public function test_agent_cannot_view_ticket_in_another_department(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);
        $agent = User::factory()->create(['role' => 'agent', 'department_id' => $this->hrDept->id]);
        $ticket = $this->makeTicket($requester, $this->itDept);

        $response = $this->actingAs($agent, 'sanctum')
            ->getJson("/api/v1/tickets/{$ticket->id}");

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'You are not authorized to access this ticket',
            ]);
    }

    public function test_requester_can_view_their_own_ticket(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);
        $ticket = $this->makeTicket($requester, $this->itDept);

        $response = $this->actingAs($requester, 'sanctum')
            ->getJson("/api/v1/tickets/{$ticket->id}");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.ticket.requester.id', $requester->id);
    }

    public function test_requester_cannot_view_another_users_ticket(): void
    {
        $owner = User::factory()->create(['role' => 'requester']);
        $other = User::factory()->create(['role' => 'requester']);
        $ticket = $this->makeTicket($owner, $this->itDept);

        $response = $this->actingAs($other, 'sanctum')
            ->getJson("/api/v1/tickets/{$ticket->id}");

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'You are not authorized to access this ticket',
            ]);
    }

    public function test_unauthenticated_user_gets_401(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);
        $ticket = $this->makeTicket($requester, $this->itDept);

        $response = $this->getJson("/api/v1/tickets/{$ticket->id}");

        $response->assertStatus(401);
    }

    public function test_nonexistent_ticket_returns_404(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/tickets/99999');

        $response->assertStatus(404);
    }
}
