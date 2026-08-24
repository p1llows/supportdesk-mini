<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
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

    /** Helper: create a ticket directly for a given owner/department/status. */
    private function makeTicket(User $owner, Department $department, string $status = 'open'): Ticket
    {
        return Ticket::create([
            'user_id' => $owner->id,
            'department_id' => $department->id,
            'title' => 'Ticket for user '.$owner->id,
            'description' => 'Dashboard test ticket.',
            'priority' => 'medium',
            'status' => $status,
        ]);
    }

    public function test_unauthenticated_user_cannot_access_dashboard_stats(): void
    {
        $response = $this->getJson('/api/v1/dashboard/stats');

        $response->assertStatus(401);
    }

    public function test_admin_sees_system_wide_ticket_counts(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $requesterA = User::factory()->create(['role' => 'requester']);
        $requesterB = User::factory()->create(['role' => 'requester']);

        $this->makeTicket($requesterA, $this->itDept, 'open');
        $this->makeTicket($requesterA, $this->itDept, 'in_progress');
        $this->makeTicket($requesterB, $this->hrDept, 'resolved');
        $this->makeTicket($requesterB, $this->hrDept, 'closed');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/dashboard/stats');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'stats' => [
                        'total_tickets' => 4,
                        'open_tickets' => 1,
                        'in_progress_tickets' => 1,
                        'resolved_tickets' => 1,
                        'closed_tickets' => 1,
                    ],
                ],
            ]);
    }

    public function test_agent_sees_only_own_department_ticket_counts(): void
    {
        $agent = User::factory()->create(['role' => 'agent', 'department_id' => $this->itDept->id]);
        $requesterA = User::factory()->create(['role' => 'requester']);
        $requesterB = User::factory()->create(['role' => 'requester']);

        $this->makeTicket($requesterA, $this->itDept, 'open');
        $this->makeTicket($requesterA, $this->itDept, 'in_progress');
        // Other department — must NOT be counted for this agent.
        $this->makeTicket($requesterB, $this->hrDept, 'open');

        $response = $this->actingAs($agent, 'sanctum')
            ->getJson('/api/v1/dashboard/stats');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'stats' => [
                        'total_tickets' => 2,
                        'open_tickets' => 1,
                        'in_progress_tickets' => 1,
                    ],
                ],
            ]);
    }

    public function test_agent_without_department_sees_zero_counts(): void
    {
        $agent = User::factory()->create(['role' => 'agent', 'department_id' => null]);
        $requester = User::factory()->create(['role' => 'requester']);

        $this->makeTicket($requester, $this->itDept, 'open');

        $response = $this->actingAs($agent, 'sanctum')
            ->getJson('/api/v1/dashboard/stats');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'stats' => [
                        'total_tickets' => 0,
                        'open_tickets' => 0,
                    ],
                ],
            ]);
    }

    public function test_requester_sees_only_own_ticket_counts(): void
    {
        $requesterA = User::factory()->create(['role' => 'requester']);
        $requesterB = User::factory()->create(['role' => 'requester']);

        $this->makeTicket($requesterA, $this->itDept, 'open');
        $this->makeTicket($requesterA, $this->itDept, 'resolved');
        // Other requester's tickets — must NOT be counted.
        $this->makeTicket($requesterB, $this->itDept, 'in_progress');
        $this->makeTicket($requesterB, $this->hrDept, 'closed');

        $response = $this->actingAs($requesterA, 'sanctum')
            ->getJson('/api/v1/dashboard/stats');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'stats' => [
                        'total_tickets' => 2,
                        'open_tickets' => 1,
                        'resolved_tickets' => 1,
                        'in_progress_tickets' => 0,
                        'closed_tickets' => 0,
                    ],
                ],
            ]);
    }

    public function test_scope_query_parameter_is_ignored(): void
    {
        // Regression guard for the removed role-view switcher: passing a scope
        // must neither change scoping nor error out.
        $requester = User::factory()->create(['role' => 'requester']);
        $other = User::factory()->create(['role' => 'requester']);

        $this->makeTicket($requester, $this->itDept, 'open');
        $this->makeTicket($other, $this->hrDept, 'open');

        $response = $this->actingAs($requester, 'sanctum')
            ->getJson('/api/v1/dashboard/stats?scope=all');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'stats' => [
                        'total_tickets' => 1,
                        'open_tickets' => 1,
                    ],
                ],
            ])
            ->assertJsonPath('data.active_scope', null)
            ->assertJsonPath('data.permitted_scopes', null);
    }

    public function test_dashboard_stats_returns_zero_valued_ticket_metrics(): void
    {
        $user = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/dashboard/stats');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'stats' => [
                        'total_tickets' => 0,
                        'open_tickets' => 0,
                        'in_progress_tickets' => 0,
                        'resolved_tickets' => 0,
                        'closed_tickets' => 0,
                    ],
                ],
            ]);
    }
}
