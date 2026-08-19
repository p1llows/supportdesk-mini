<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_access_users_list(): void
    {
        $response = $this->getJson('/api/v1/users');

        $response->assertStatus(401);
    }

    public function test_requester_cannot_access_users_list(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($requester, 'sanctum')
            ->getJson('/api/v1/users');

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Only administrators and agents are authorized to view user directory',
            ]);
    }

    public function test_admin_can_access_users_list(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->create(['role' => 'agent', 'name' => 'Agent Smith']);
        User::factory()->create(['role' => 'requester', 'name' => 'John Requester']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/users');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'users' => [
                        '*' => ['id', 'name', 'email', 'role', 'created_at', 'updated_at'],
                    ],
                ],
            ]);

        $users = $response->json('data.users');
        $this->assertGreaterThanOrEqual(3, count($users));
    }

    public function test_agent_can_access_users_list(): void
    {
        $agent = User::factory()->create(['role' => 'agent']);

        $response = $this->actingAs($agent, 'sanctum')
            ->getJson('/api/v1/users');

        $response->assertStatus(200)
            ->assertJson(['status' => 'success']);
    }

    public function test_can_filter_users_by_role(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->create(['role' => 'agent', 'name' => 'Agent One']);
        User::factory()->create(['role' => 'agent', 'name' => 'Agent Two']);
        User::factory()->create(['role' => 'requester', 'name' => 'Requester One']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/users?role=agent');

        $response->assertStatus(200);
        $users = $response->json('data.users');

        $this->assertCount(2, $users);
        foreach ($users as $u) {
            $this->assertEquals('agent', $u['role']);
        }
    }

    public function test_can_search_users_by_name_or_email(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->create([
            'name' => 'Alice Wonderland',
            'email' => 'alice@supportdesk.local',
            'role' => 'requester',
        ]);
        User::factory()->create([
            'name' => 'Bob Builder',
            'email' => 'bob@supportdesk.local',
            'role' => 'agent',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/users?search=Alice');

        $response->assertStatus(200);
        $users = $response->json('data.users');

        $this->assertCount(1, $users);
        $this->assertEquals('Alice Wonderland', $users[0]['name']);
    }

    public function test_user_list_excludes_sensitive_attributes(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $targetUser = User::factory()->create([
            'role' => 'requester',
            'password' => bcrypt('secretpassword123'),
            'remember_token' => 'secret_token_123',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/users?search='.$targetUser->name);

        $response->assertStatus(200);
        $firstUser = $response->json('data.users.0');

        $this->assertArrayHasKey('id', $firstUser);
        $this->assertArrayHasKey('name', $firstUser);
        $this->assertArrayHasKey('email', $firstUser);
        $this->assertArrayHasKey('role', $firstUser);

        // Security assertion: Sensitive credentials MUST NEVER be present
        $this->assertArrayNotHasKey('password', $firstUser);
        $this->assertArrayNotHasKey('remember_token', $firstUser);
    }

    public function test_invalid_role_filter_returns_422(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/users?role=superadmin');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }

    public function test_empty_user_search_returns_successful_empty_array(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/users?search=nonexistent_name_xyz');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'users' => [],
                ],
            ]);
    }
}
