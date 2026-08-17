<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegisterTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_with_valid_details(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Jane Requester',
            'email' => 'jane@supportdesk.local',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    'token',
                    'user' => ['id', 'name', 'email', 'role'],
                ],
            ])
            ->assertJson([
                'status' => 'success',
                'message' => 'User registered successfully',
                'data' => [
                    'user' => [
                        'name' => 'Jane Requester',
                        'email' => 'jane@supportdesk.local',
                        'role' => 'requester',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'jane@supportdesk.local',
            'role' => 'requester',
        ]);
    }

    public function test_registration_prevents_duplicate_email(): void
    {
        User::factory()->create([
            'email' => 'jane@supportdesk.local',
        ]);

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Jane Requester',
            'email' => 'jane@supportdesk.local',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_registration_requires_password_confirmation(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Jane Requester',
            'email' => 'jane@supportdesk.local',
            'password' => 'password123',
            'password_confirmation' => 'mismatched123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_registration_requires_minimum_password_length(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Jane Requester',
            'email' => 'jane@supportdesk.local',
            'password' => '12345',
            'password_confirmation' => '12345',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_registration_forces_requester_role_and_ignores_role_escalation(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Sneaky User',
            'email' => 'sneaky@supportdesk.local',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'admin', // Attempt role escalation
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'user' => [
                        'role' => 'requester',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'sneaky@supportdesk.local',
            'role' => 'requester',
        ]);
    }
}
