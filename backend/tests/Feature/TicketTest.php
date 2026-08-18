<?php

namespace Tests\Feature;

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TicketTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_access_tickets_list(): void
    {
        $response = $this->getJson('/api/v1/tickets');

        $response->assertStatus(401);
    }

    public function test_unauthenticated_user_cannot_create_ticket(): void
    {
        $response = $this->postJson('/api/v1/tickets', [
            'title' => 'Test Ticket',
            'description' => 'Test Description',
            'priority' => 'medium',
        ]);

        $response->assertStatus(401);
    }

    public function test_requester_can_create_ticket(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($requester, 'sanctum')
            ->postJson('/api/v1/tickets', [
                'title' => 'VPN connection drops frequently',
                'description' => 'Cannot maintain connection past 10 minutes.',
                'priority' => 'high',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'message' => 'Ticket created successfully',
                'data' => [
                    'ticket' => [
                        'user_id' => $requester->id,
                        'title' => 'VPN connection drops frequently',
                        'description' => 'Cannot maintain connection past 10 minutes.',
                        'priority' => 'high',
                        'status' => 'open',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('tickets', [
            'user_id' => $requester->id,
            'title' => 'VPN connection drops frequently',
            'status' => 'open',
        ]);
    }

    public function test_admin_cannot_create_ticket(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/tickets', [
                'title' => 'Admin Ticket Attempt',
                'description' => 'Should be blocked with 403',
                'priority' => 'low',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Only requesters are authorized to submit new tickets',
            ]);

        $this->assertDatabaseMissing('tickets', [
            'title' => 'Admin Ticket Attempt',
        ]);
    }

    public function test_agent_cannot_create_ticket(): void
    {
        $agent = User::factory()->create(['role' => 'agent']);

        $response = $this->actingAs($agent, 'sanctum')
            ->postJson('/api/v1/tickets', [
                'title' => 'Agent Ticket Attempt',
                'description' => 'Should be blocked with 403',
                'priority' => 'medium',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Only requesters are authorized to submit new tickets',
            ]);

        $this->assertDatabaseMissing('tickets', [
            'title' => 'Agent Ticket Attempt',
        ]);
    }

    public function test_ticket_creation_validates_required_title(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($requester, 'sanctum')
            ->postJson('/api/v1/tickets', [
                'description' => 'Missing title field',
                'priority' => 'medium',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['title']);
    }

    public function test_ticket_creation_validates_required_description(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($requester, 'sanctum')
            ->postJson('/api/v1/tickets', [
                'title' => 'Missing Description',
                'priority' => 'medium',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['description']);
    }

    public function test_ticket_creation_validates_priority_enum(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($requester, 'sanctum')
            ->postJson('/api/v1/tickets', [
                'title' => 'Invalid Priority Ticket',
                'description' => 'Some description',
                'priority' => 'critical', // Invalid enum value
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['priority']);
    }

    public function test_ticket_status_defaults_to_open_and_ignores_client_status(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($requester, 'sanctum')
            ->postJson('/api/v1/tickets', [
                'title' => 'Forged Status Attempt',
                'description' => 'Attempting to set status to closed upon creation',
                'priority' => 'low',
                'status' => 'closed', // Client payload attempt
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'ticket' => [
                        'status' => 'open',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('tickets', [
            'title' => 'Forged Status Attempt',
            'status' => 'open',
        ]);
    }

    public function test_ticket_user_id_assigned_from_token_and_ignores_client_user_id(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);
        $otherUser = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($requester, 'sanctum')
            ->postJson('/api/v1/tickets', [
                'user_id' => $otherUser->id, // Attempting to impersonate other user
                'title' => 'Forged User ID Attempt',
                'description' => 'Attempting to assign ticket to another user',
                'priority' => 'high',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'ticket' => [
                        'user_id' => $requester->id,
                    ],
                ],
            ]);

        $this->assertDatabaseHas('tickets', [
            'title' => 'Forged User ID Attempt',
            'user_id' => $requester->id,
        ]);
    }

    public function test_requester_can_only_view_own_tickets(): void
    {
        $requester1 = User::factory()->create(['role' => 'requester']);
        $requester2 = User::factory()->create(['role' => 'requester']);

        Ticket::create([
            'user_id' => $requester1->id,
            'title' => 'Requester 1 Ticket',
            'description' => 'Description 1',
            'priority' => 'medium',
            'status' => 'open',
        ]);

        Ticket::create([
            'user_id' => $requester2->id,
            'title' => 'Requester 2 Ticket',
            'description' => 'Description 2',
            'priority' => 'high',
            'status' => 'open',
        ]);

        $response = $this->actingAs($requester1, 'sanctum')
            ->getJson('/api/v1/tickets');

        $response->assertStatus(200);
        $tickets = $response->json('data.tickets');

        $this->assertCount(1, $tickets);
        $this->assertEquals('Requester 1 Ticket', $tickets[0]['title']);
    }

    public function test_admin_and_agent_can_view_ticket_queue(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $requester1 = User::factory()->create(['role' => 'requester']);
        $requester2 = User::factory()->create(['role' => 'requester']);

        Ticket::create([
            'user_id' => $requester1->id,
            'title' => 'Ticket A',
            'description' => 'Description A',
            'priority' => 'low',
            'status' => 'open',
        ]);

        Ticket::create([
            'user_id' => $requester2->id,
            'title' => 'Ticket B',
            'description' => 'Description B',
            'priority' => 'high',
            'status' => 'open',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/tickets');

        $response->assertStatus(200);
        $tickets = $response->json('data.tickets');

        $this->assertCount(2, $tickets);
    }
}
