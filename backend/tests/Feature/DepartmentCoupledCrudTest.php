<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DepartmentCoupledCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_creates_department_and_agent_atomically(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->postJson('/api/v1/departments', [
            'name' => 'New Department',
            'agent_name' => 'Dept Agent',
            'agent_email' => 'deptagent@example.com',
            'agent_password' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'message' => 'Department and Agent created',
            ]);

        $this->assertDatabaseHas('departments', ['name' => 'New Department']);
        $this->assertDatabaseHas('users', [
            'email' => 'deptagent@example.com',
            'role' => 'agent',
        ]);
    }

    public function test_department_creation_fails_if_agent_email_taken(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->create(['email' => 'taken@example.com']);

        $response = $this->actingAs($admin)->postJson('/api/v1/departments', [
            'name' => 'New Department',
            'agent_name' => 'Dept Agent',
            'agent_email' => 'taken@example.com',
            'agent_password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['agent_email']);

        $this->assertDatabaseMissing('departments', ['name' => 'New Department']);
    }

    public function test_agent_cannot_create_department_returns_403_not_422(): void
    {
        $agent = User::factory()->create(['role' => 'agent']);

        $response = $this->actingAs($agent)->postJson('/api/v1/departments', [
            // Intentionally omit data to ensure 403 happens before 422
        ]);

        $response->assertStatus(403);
    }

    public function test_requester_cannot_create_department_returns_403_not_422(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($requester)->postJson('/api/v1/departments', []);

        $response->assertStatus(403);
    }

    public function test_admin_cannot_delete_department_with_existing_tickets(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $department = Department::create(['name' => 'IT Department']);
        $requester = User::factory()->create(['role' => 'requester']);
        
        Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $department->id,
            'title' => 'Test Ticket',
            'description' => 'Test',
            'priority' => 'low',
            'status' => 'open',
        ]);

        $response = $this->actingAs($admin)->deleteJson('/api/v1/departments/' . $department->id);

        $response->assertStatus(409);
    }

    public function test_admin_cannot_delete_department_with_existing_users(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $department = Department::create(['name' => 'IT Department']);
        
        User::factory()->create(['role' => 'agent', 'department_id' => $department->id]);

        $response = $this->actingAs($admin)->deleteJson('/api/v1/departments/' . $department->id);

        $response->assertStatus(409);
    }

    public function test_admin_can_delete_empty_department(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $department = Department::create(['name' => 'Empty Department']);

        $response = $this->actingAs($admin)->deleteJson('/api/v1/departments/' . $department->id);

        $response->assertStatus(200);
        $this->assertDatabaseMissing('departments', ['id' => $department->id]);
    }

    public function test_admin_can_update_department(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $department = Department::create(['name' => 'Old Name', 'description' => 'Old Desc']);

        $response = $this->actingAs($admin)->putJson('/api/v1/departments/' . $department->id, [
            'name' => 'New Name',
            'description' => 'New Desc',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('departments', [
            'id' => $department->id,
            'name' => 'New Name',
            'description' => 'New Desc',
        ]);
    }
}
