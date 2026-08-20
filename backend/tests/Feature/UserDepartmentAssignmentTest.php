<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserDepartmentAssignmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_agent_with_department_id(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $department = Department::create(['name' => 'IT Department']);

        $response = $this->actingAs($admin)->postJson('/api/v1/users', [
            'name' => 'Agent Name',
            'email' => 'agentnew@example.com',
            'password' => 'password123',
            'role' => 'agent',
            'department_id' => $department->id,
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'user' => [
                        'department_id' => $department->id,
                    ],
                ],
            ]);
    }

    public function test_agent_creation_fails_if_department_id_missing(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->postJson('/api/v1/users', [
            'name' => 'Agent Name',
            'email' => 'agentnew@example.com',
            'password' => 'password123',
            'role' => 'agent',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['department_id']);
    }

    public function test_admin_can_create_requester_without_department_id(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->postJson('/api/v1/users', [
            'name' => 'Req Name',
            'email' => 'reqnew@example.com',
            'password' => 'password123',
            'role' => 'requester',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.user.department_id', null);
    }

    public function test_admin_can_create_admin_without_department_id(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->postJson('/api/v1/users', [
            'name' => 'Admin Name',
            'email' => 'adminnew@example.com',
            'password' => 'password123',
            'role' => 'admin',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.user.department_id', null);
    }

    public function test_requester_creation_fails_if_department_id_provided(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $department = Department::create(['name' => 'IT Department']);

        $response = $this->actingAs($admin)->postJson('/api/v1/users', [
            'name' => 'Req Name',
            'email' => 'reqnew@example.com',
            'password' => 'password123',
            'role' => 'requester',
            'department_id' => $department->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['department_id']);
    }

    public function test_admin_creation_fails_if_department_id_provided(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $department = Department::create(['name' => 'IT Department']);

        $response = $this->actingAs($admin)->postJson('/api/v1/users', [
            'name' => 'Admin Name',
            'email' => 'adminnew@example.com',
            'password' => 'password123',
            'role' => 'admin',
            'department_id' => $department->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['department_id']);
    }
}
