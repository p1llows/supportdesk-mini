<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RequesterProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_requester_can_update_profile_department(): void
    {
        $requester = User::factory()->create(['role' => 'requester', 'department_id' => null]);
        $department = Department::create(['name' => 'IT Department']);

        $response = $this->actingAs($requester)->patchJson('/api/v1/profile/department', [
            'department_id' => $department->id,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'user' => [
                        'id' => $requester->id,
                        'department_id' => $department->id,
                    ]
                ]
            ]);

        $this->assertEquals($department->id, $requester->fresh()->department_id);
    }

    public function test_requester_cannot_update_to_non_existent_department(): void
    {
        $requester = User::factory()->create(['role' => 'requester', 'department_id' => null]);

        $response = $this->actingAs($requester)->patchJson('/api/v1/profile/department', [
            'department_id' => 9999,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['department_id']);
    }

    public function test_agent_cannot_update_profile_department(): void
    {
        $department1 = Department::create(['name' => 'IT Department']);
        $department2 = Department::create(['name' => 'HR Department']);
        $agent = User::factory()->create(['role' => 'agent', 'department_id' => $department1->id]);

        $response = $this->actingAs($agent)->patchJson('/api/v1/profile/department', [
            'department_id' => $department2->id,
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_cannot_update_profile_department(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $department = Department::create(['name' => 'IT Department']);

        $response = $this->actingAs($admin)->patchJson('/api/v1/profile/department', [
            'department_id' => $department->id,
        ]);

        $response->assertStatus(403);
    }
}
