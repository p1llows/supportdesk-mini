<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_access_dashboard_stats(): void
    {
        $response = $this->getJson('/api/v1/dashboard/stats');

        $response->assertStatus(401);
    }

    public function test_admin_can_access_dashboard_with_default_scope(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/dashboard/stats');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'active_scope' => 'admin',
                    'permitted_scopes' => ['all', 'admin', 'agent', 'requester'],
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

    public function test_admin_can_access_all_scope(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/dashboard/stats?scope=all');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'active_scope' => 'all',
                ],
            ]);
    }

    public function test_admin_can_access_agent_scope(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/dashboard/stats?scope=agent');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'active_scope' => 'agent',
                ],
            ]);
    }

    public function test_admin_can_access_requester_scope(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/dashboard/stats?scope=requester');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'active_scope' => 'requester',
                ],
            ]);
    }

    public function test_agent_can_access_default_scope(): void
    {
        $agent = User::factory()->create(['role' => 'agent']);

        $response = $this->actingAs($agent, 'sanctum')
            ->getJson('/api/v1/dashboard/stats');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'active_scope' => 'agent',
                    'permitted_scopes' => ['agent', 'requester'],
                ],
            ]);
    }

    public function test_agent_can_access_requester_scope(): void
    {
        $agent = User::factory()->create(['role' => 'agent']);

        $response = $this->actingAs($agent, 'sanctum')
            ->getJson('/api/v1/dashboard/stats?scope=requester');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'active_scope' => 'requester',
                ],
            ]);
    }

    public function test_agent_cannot_access_admin_scope(): void
    {
        $agent = User::factory()->create(['role' => 'agent']);

        $response = $this->actingAs($agent, 'sanctum')
            ->getJson('/api/v1/dashboard/stats?scope=admin');

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Unauthorized scope access for your user role',
            ]);
    }

    public function test_agent_cannot_access_all_scope(): void
    {
        $agent = User::factory()->create(['role' => 'agent']);

        $response = $this->actingAs($agent, 'sanctum')
            ->getJson('/api/v1/dashboard/stats?scope=all');

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Unauthorized scope access for your user role',
            ]);
    }

    public function test_requester_can_access_default_scope(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($requester, 'sanctum')
            ->getJson('/api/v1/dashboard/stats');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'active_scope' => 'requester',
                    'permitted_scopes' => ['requester'],
                ],
            ]);
    }

    public function test_requester_cannot_access_admin_scope(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($requester, 'sanctum')
            ->getJson('/api/v1/dashboard/stats?scope=admin');

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Unauthorized scope access for your user role',
            ]);
    }

    public function test_requester_cannot_access_agent_scope(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($requester, 'sanctum')
            ->getJson('/api/v1/dashboard/stats?scope=agent');

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Unauthorized scope access for your user role',
            ]);
    }

    public function test_requester_cannot_access_all_scope(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($requester, 'sanctum')
            ->getJson('/api/v1/dashboard/stats?scope=all');

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Unauthorized scope access for your user role',
            ]);
    }

    public function test_invalid_scope_parameter_returns_validation_error(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/dashboard/stats?scope=invalid_scope');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['scope']);
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
