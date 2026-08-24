<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TicketCommentTest extends TestCase
{
    use RefreshDatabase;

    private Department $itDept;
    private Department $hrDept;

    protected function setUp(): void
    {
        parent::setUp();
        $this->itDept = Department::firstOrCreate(['name' => 'Information Technology']);
        $this->hrDept = Department::firstOrCreate(['name' => 'Human Resources']);
    }

    /** Helper: submit a ticket via the API for a fresh requester in IT. */
    private function createTicketViaApi(string $status = 'open'): array
    {
        $owner = User::factory()->create([
            'role' => 'requester',
            'department_id' => $this->itDept->id,
        ]);

        $response = $this->actingAs($owner, 'sanctum')
            ->postJson('/api/v1/tickets', [
                'title' => 'VPN Access Request',
                'description' => 'Need VPN credentials configured.',
                'priority' => 'medium',
                'department_id' => $this->itDept->id,
            ]);

        $response->assertStatus(201);
        $ticketId = $response->json('data.ticket.id');

        if ($status !== 'open') {
            $admin = User::factory()->create(['role' => 'admin']);
            // Drive the state machine: open -> in_progress -> resolved -> closed
            foreach (['in_progress', 'resolved', 'closed'] as $target) {
                $this->actingAs($admin, 'sanctum')
                    ->patchJson("/api/v1/tickets/{$ticketId}/status", ['status' => $target])
                    ->assertStatus(200);
            }
        }

        return ['ticket_id' => $ticketId, 'owner' => $owner];
    }

    /** Helper: add a comment and return its activity id. */
    private function addCommentViaApi(int $ticketId, User $as): int
    {
        $response = $this->actingAs($as, 'sanctum')
            ->postJson("/api/v1/tickets/{$ticketId}/comments", [
                'body' => 'Test comment body.',
            ]);

        $response->assertStatus(201);

        return $response->json('data.activity.id');
    }

    public function test_requester_can_comment_on_own_ticket(): void
    {
        ['ticket_id' => $ticketId, 'owner' => $owner] = $this->createTicketViaApi();

        $response = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/v1/tickets/{$ticketId}/comments", [
                'body' => 'Any update on this?',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'message' => 'Comment added successfully',
                'data' => [
                    'activity' => [
                        'type' => 'comment',
                        'body' => 'Any update on this?',
                        'user' => ['id' => $owner->id],
                    ],
                ],
            ]);
    }

    public function test_requester_cannot_comment_on_another_users_ticket(): void
    {
        ['ticket_id' => $ticketId] = $this->createTicketViaApi();
        $other = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($other, 'sanctum')
            ->postJson("/api/v1/tickets/{$ticketId}/comments", [
                'body' => 'I should not be able to post this.',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'You are not authorized to access this ticket',
            ]);
    }

    public function test_agent_can_comment_on_ticket_in_their_department(): void
    {
        ['ticket_id' => $ticketId] = $this->createTicketViaApi();
        $agent = User::factory()->create(['role' => 'agent', 'department_id' => $this->itDept->id]);

        $response = $this->actingAs($agent, 'sanctum')
            ->postJson("/api/v1/tickets/{$ticketId}/comments", [
                'body' => 'Looking into it now.',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.activity.user.id', $agent->id);
    }

    public function test_agent_cannot_comment_on_ticket_in_another_department(): void
    {
        ['ticket_id' => $ticketId] = $this->createTicketViaApi();
        $hrAgent = User::factory()->create(['role' => 'agent', 'department_id' => $this->hrDept->id]);

        $response = $this->actingAs($hrAgent, 'sanctum')
            ->postJson("/api/v1/tickets/{$ticketId}/comments", [
                'body' => 'Wrong department.',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'You are not authorized to access this ticket',
            ]);
    }

    public function test_admin_can_comment_on_any_ticket(): void
    {
        ['ticket_id' => $ticketId] = $this->createTicketViaApi();
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/tickets/{$ticketId}/comments", [
                'body' => 'Escalating to infrastructure.',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.activity.user.id', $admin->id);
    }

    public function test_admin_cannot_comment_on_closed_ticket(): void
    {
        ['ticket_id' => $ticketId] = $this->createTicketViaApi(status: 'closed');
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/tickets/{$ticketId}/comments", [
                'body' => 'Even admins are blocked.',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Cannot comment on a closed ticket',
            ]);
    }

    public function test_agent_cannot_comment_on_closed_ticket(): void
    {
        ['ticket_id' => $ticketId] = $this->createTicketViaApi(status: 'closed');
        $agent = User::factory()->create(['role' => 'agent', 'department_id' => $this->itDept->id]);

        $response = $this->actingAs($agent, 'sanctum')
            ->postJson("/api/v1/tickets/{$ticketId}/comments", [
                'body' => 'Blocked too.',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Cannot comment on a closed ticket',
            ]);
    }

    public function test_requester_cannot_comment_on_own_closed_ticket(): void
    {
        ['ticket_id' => $ticketId, 'owner' => $owner] = $this->createTicketViaApi(status: 'closed');

        $response = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/v1/tickets/{$ticketId}/comments", [
                'body' => 'My own closed ticket.',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Cannot comment on a closed ticket',
            ]);
    }

    public function test_empty_body_returns_422(): void
    {
        ['ticket_id' => $ticketId, 'owner' => $owner] = $this->createTicketViaApi();

        $response = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/v1/tickets/{$ticketId}/comments", [
                'body' => '',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['body']);
    }

    public function test_body_exceeding_5000_chars_returns_422(): void
    {
        ['ticket_id' => $ticketId, 'owner' => $owner] = $this->createTicketViaApi();

        $response = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/v1/tickets/{$ticketId}/comments", [
                'body' => str_repeat('a', 5001),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['body']);
    }

    public function test_admin_can_delete_a_comment(): void
    {
        ['ticket_id' => $ticketId, 'owner' => $owner] = $this->createTicketViaApi();
        $commentId = $this->addCommentViaApi($ticketId, $owner);
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/v1/tickets/{$ticketId}/comments/{$commentId}");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Comment deleted successfully',
            ]);
        $this->assertDatabaseMissing('ticket_activities', ['id' => $commentId]);
    }

    public function test_agent_cannot_delete_a_comment(): void
    {
        ['ticket_id' => $ticketId, 'owner' => $owner] = $this->createTicketViaApi();
        $commentId = $this->addCommentViaApi($ticketId, $owner);
        $agent = User::factory()->create(['role' => 'agent', 'department_id' => $this->itDept->id]);

        $response = $this->actingAs($agent, 'sanctum')
            ->deleteJson("/api/v1/tickets/{$ticketId}/comments/{$commentId}");

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Only administrators can delete comments',
            ]);
        $this->assertDatabaseHas('ticket_activities', ['id' => $commentId]);
    }

    public function test_requester_cannot_delete_a_comment(): void
    {
        ['ticket_id' => $ticketId, 'owner' => $owner] = $this->createTicketViaApi();
        $commentId = $this->addCommentViaApi($ticketId, $owner);

        $response = $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/v1/tickets/{$ticketId}/comments/{$commentId}");

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Only administrators can delete comments',
            ]);
        $this->assertDatabaseHas('ticket_activities', ['id' => $commentId]);
    }

    public function test_deleting_a_non_comment_activity_returns_404(): void
    {
        ['ticket_id' => $ticketId] = $this->createTicketViaApi();
        // The auto-generated 'created' activity is a system event, not a comment.
        $createdActivityId = DB::table('ticket_activities')
            ->where('ticket_id', $ticketId)
            ->where('type', 'created')
            ->value('id');
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/v1/tickets/{$ticketId}/comments/{$createdActivityId}");

        $response->assertStatus(404)
            ->assertJson([
                'status' => 'error',
                'message' => 'Comment not found',
            ]);
        $this->assertDatabaseHas('ticket_activities', ['id' => $createdActivityId]);
    }

    public function test_deleting_a_comment_via_wrong_ticket_id_returns_404(): void
    {
        ['ticket_id' => $ticketA, 'owner' => $owner] = $this->createTicketViaApi();
        ['ticket_id' => $ticketB] = $this->createTicketViaApi();
        $commentOnA = $this->addCommentViaApi($ticketA, $owner);
        $admin = User::factory()->create(['role' => 'admin']);

        // IDOR attempt: valid comment id presented under a different ticket's URL.
        $response = $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/v1/tickets/{$ticketB}/comments/{$commentOnA}");

        $response->assertStatus(404)
            ->assertJson([
                'status' => 'error',
                'message' => 'Comment not found',
            ]);
        $this->assertDatabaseHas('ticket_activities', ['id' => $commentOnA]);
    }
}
