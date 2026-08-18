<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DepartmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_list_departments(): void
    {
        $response = $this->getJson('/api/v1/departments');

        $response->assertStatus(401);
    }

    public function test_authenticated_user_can_list_departments(): void
    {
        $user = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/departments');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);
    }

    public function test_department_list_contains_exactly_five_configured_departments(): void
    {
        $this->seed(\Database\Seeders\DepartmentSeeder::class);

        $user = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/departments');

        $response->assertStatus(200);

        $departments = $response->json('data.departments');
        $departmentNames = array_column($departments, 'name');

        $expectedDepartments = [
            'Customer Support',
            'Facilities',
            'Finance',
            'Human Resources',
            'Information Technology',
            'Operations',
        ];

        $this->assertContains('Information Technology', $departmentNames);
        $this->assertContains('Human Resources', $departmentNames);
        $this->assertContains('Finance', $departmentNames);
        $this->assertContains('Operations', $departmentNames);
        $this->assertContains('Facilities', $departmentNames);
    }

    public function test_requester_can_create_ticket_with_valid_department_id(): void
    {
        $this->seed(\Database\Seeders\DepartmentSeeder::class);

        $requester = User::factory()->create(['role' => 'requester']);
        $department = Department::where('name', 'Information Technology')->firstOrFail();

        $response = $this->actingAs($requester, 'sanctum')
            ->postJson('/api/v1/tickets', [
                'title' => 'Computer cannot connect to network',
                'description' => 'The workstation cannot connect to the company network.',
                'priority' => 'high',
                'department_id' => $department->id,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'ticket' => [
                        'user_id' => $requester->id,
                        'department_id' => $department->id,
                        'title' => 'Computer cannot connect to network',
                        'department' => [
                            'id' => $department->id,
                            'name' => 'Information Technology',
                        ],
                    ],
                ],
            ]);

        $this->assertDatabaseHas('tickets', [
            'user_id' => $requester->id,
            'department_id' => $department->id,
            'title' => 'Computer cannot connect to network',
        ]);
    }

    public function test_ticket_creation_fails_when_department_id_is_missing(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($requester, 'sanctum')
            ->postJson('/api/v1/tickets', [
                'title' => 'Missing Department Ticket',
                'description' => 'Description here',
                'priority' => 'low',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['department_id']);
    }

    public function test_ticket_creation_fails_when_department_id_does_not_exist(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($requester, 'sanctum')
            ->postJson('/api/v1/tickets', [
                'title' => 'Invalid Department ID Ticket',
                'description' => 'Description here',
                'priority' => 'low',
                'department_id' => 99999, // Non-existent ID
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['department_id']);
    }

    public function test_ticket_response_contains_nested_department_data(): void
    {
        $this->seed(\Database\Seeders\DepartmentSeeder::class);

        $requester = User::factory()->create(['role' => 'requester']);
        $department = Department::where('name', 'Human Resources')->firstOrFail();

        $response = $this->actingAs($requester, 'sanctum')
            ->postJson('/api/v1/tickets', [
                'title' => 'Payroll Question',
                'description' => 'Question regarding tax deductions.',
                'priority' => 'medium',
                'department_id' => $department->id,
            ]);

        $response->assertStatus(201);
        $this->assertEquals('Human Resources', $response->json('data.ticket.department.name'));
    }
}
