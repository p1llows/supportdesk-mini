<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SessionRoleTest extends TestCase
{
    use RefreshDatabase;

    public function test_me_endpoint_returns_user_role_for_all_roles(): void
    {
        $roles = ['admin', 'agent', 'requester'];

        foreach ($roles as $role) {
            $user = User::factory()->create(['role' => $role]);

            $response = $this->actingAs($user, 'sanctum')
                ->getJson('/api/v1/auth/me');

            $response->assertStatus(200)
                ->assertJson([
                    'status' => 'success',
                    'data' => [
                        'user' => [
                            'id' => $user->id,
                            'name' => $user->name,
                            'email' => $user->email,
                            'role' => $role,
                        ],
                    ],
                ]);
        }
    }

    public function test_login_response_contains_user_role(): void
    {
        $password = 'password123';
        $user = User::factory()->create([
            'role' => 'admin',
            'password' => bcrypt($password),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => $password,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'email' => $user->email,
                        'role' => 'admin',
                    ],
                ],
            ]);
    }

    public function test_register_response_contains_requester_user_role(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'New Test User',
            'email' => 'newuser@supportdesk.local',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'user' => [
                        'name' => 'New Test User',
                        'email' => 'newuser@supportdesk.local',
                        'role' => 'requester',
                    ],
                ],
            ]);
    }

    public function test_session_role_matches_database_user_role(): void
    {
        $agent = User::factory()->create(['role' => 'agent']);

        $response = $this->actingAs($agent, 'sanctum')
            ->getJson('/api/v1/auth/me');

        $response->assertStatus(200);
        $returnedRole = $response->json('data.user.role');

        $this->assertEquals($agent->fresh()->role, $returnedRole);
        $this->assertEquals('agent', $returnedRole);
    }
}
