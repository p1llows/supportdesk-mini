<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserInsertTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_create_user(): void
    {
        $response = $this->postJson('/api/v1/users', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password123',
            'role' => 'agent',
        ]);

        $response->assertStatus(401);
    }

    public function test_agent_cannot_create_user(): void
    {
        $agent = User::factory()->create(['role' => 'agent']);

        $response = $this->actingAs($agent, 'sanctum')
            ->postJson('/api/v1/users', [
                'name' => 'New User',
                'email' => 'newuser@example.com',
                'password' => 'password123',
                'role' => 'requester',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Only administrators are authorized to create new users',
            ]);
    }

    public function test_requester_cannot_create_user(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($requester, 'sanctum')
            ->postJson('/api/v1/users', [
                'name' => 'New User',
                'email' => 'newuser@example.com',
                'password' => 'password123',
                'role' => 'requester',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Only administrators are authorized to create new users',
            ]);
    }

    public function test_admin_can_create_user_with_valid_data(): void
    {
        $dept = \App\Models\Department::create(['name' => 'IT']);
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/users', [
                'name' => 'Support Agent Jane',
                'email' => 'jane.agent@supportdesk.local',
                'password' => 'securepass123',
                'role' => 'agent',
                'department_id' => $dept->id,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'message' => 'User created successfully',
                'data' => [
                    'user' => [
                        'name' => 'Support Agent Jane',
                        'email' => 'jane.agent@supportdesk.local',
                        'role' => 'agent',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'name' => 'Support Agent Jane',
            'email' => 'jane.agent@supportdesk.local',
            'role' => 'agent',
        ]);
    }

    public function test_user_creation_validates_required_fields(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/users', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'password', 'role']);
    }

    public function test_user_creation_prevents_duplicate_email(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->create(['email' => 'existing@supportdesk.local']);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/users', [
                'name' => 'Duplicate Email User',
                'email' => 'existing@supportdesk.local',
                'password' => 'password123',
                'role' => 'requester',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_user_creation_validates_role_enum(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/users', [
                'name' => 'Invalid Role User',
                'email' => 'invalidrole@example.com',
                'password' => 'password123',
                'role' => 'superadmin',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }

    public function test_created_user_password_is_hashed(): void
    {
        $dept = \App\Models\Department::create(['name' => 'IT']);
        $admin = User::factory()->create(['role' => 'admin']);
        $plaintextPassword = 'mysecretpassword123';

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/users', [
                'name' => 'Hashed User',
                'email' => 'hashed@supportdesk.local',
                'password' => $plaintextPassword,
                'role' => 'agent',
                'department_id' => $dept->id,
            ]);

        $response->assertStatus(201);

        $user = User::where('email', 'hashed@supportdesk.local')->firstOrFail();
        $this->assertNotEquals($plaintextPassword, $user->password);
        $this->assertTrue(Hash::check($plaintextPassword, $user->password));
    }

    public function test_create_user_response_excludes_password_and_remember_token(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/users', [
                'name' => 'Secure User',
                'email' => 'secure@supportdesk.local',
                'password' => 'password123',
                'role' => 'requester',
            ]);

        $response->assertStatus(201);

        $userData = $response->json('data.user');
        $this->assertArrayNotHasKey('password', $userData);
        $this->assertArrayNotHasKey('remember_token', $userData);
    }

    public function test_created_user_appears_in_subsequent_user_listing(): void
    {
        $dept = \App\Models\Department::create(['name' => 'IT']);
        $admin = User::factory()->create(['role' => 'admin']);

        $createResponse = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/users', [
                'name' => 'Listed Agent',
                'email' => 'listed@supportdesk.local',
                'password' => 'password123',
                'role' => 'agent',
                'department_id' => $dept->id,
            ]);

        $createResponse->assertStatus(201);

        $listResponse = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/users?search=listed@supportdesk.local');

        $listResponse->assertStatus(200)
            ->assertJsonPath('data.users.0.email', 'listed@supportdesk.local')
            ->assertJsonPath('data.users.0.role', 'agent');
    }
}
