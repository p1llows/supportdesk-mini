<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Ticket;
use App\Models\TicketActivity;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TicketActivityTest extends TestCase
{
    use RefreshDatabase;

    // NOTE ON PORTABILITY: the metadata assertions in this class rely on
    // sqlite preserving JSON object key insertion order ('old' before 'new').
    // MySQL normalizes JSON object keys alphabetically ('new' before 'old').
    // If this project is ever tested against real MySQL, those assertions
    // must become order-insensitive (e.g. assertEquals instead of assertSame).

    private Department $itDept;
    private Department $hrDept;

    protected function setUp(): void
    {
        parent::setUp();
        $this->itDept = Department::firstOrCreate(['name' => 'Information Technology']);
        $this->hrDept = Department::firstOrCreate(['name' => 'Human Resources']);
    }

    /** Helper: create a requester with a department. */
    private function createRequester(): User
    {
        return User::factory()->create([
            'role' => 'requester',
            'department_id' => $this->itDept->id,
        ]);
    }

    /** Helper: create a ticket owned by the given user in the given department. */
    private function makeTicket(User $owner, Department $department, string $status = 'open'): Ticket
    {
        return Ticket::create([
            'user_id' => $owner->id,
            'department_id' => $department->id,
            'title' => 'Test Ticket',
            'description' => 'Test Description',
            'priority' => 'medium',
            'status' => $status,
        ]);
    }

    /** Helper: create a ticket via API (for tests that need the "created" activity). */
    private function createTicketViaApi(string $priority = 'medium', ?Department $department = null): array
    {
        $requester = User::factory()->create([
            'role' => 'requester',
            'department_id' => ($department ?? $this->itDept)->id,
        ]);

        $response = $this->actingAs($requester, 'sanctum')
            ->postJson('/api/v1/tickets', [
                'title' => 'VPN Access Request',
                'description' => 'Need VPN credentials configured.',
                'priority' => $priority,
                'department_id' => ($department ?? $this->itDept)->id,
            ]);

        $response->assertStatus(201);

        return [
            'ticket_id' => $response->json('data.ticket.id'),
            'requester' => $requester,
        ];
    }

    private function activityCount(int $ticketId): int
    {
        return DB::table('ticket_activities')->where('ticket_id', $ticketId)->count();
    }

    public function test_creating_ticket_generates_created_activity(): void
    {
        ['ticket_id' => $ticketId, 'requester' => $requester] = $this->createTicketViaApi();

        $this->assertDatabaseHas('ticket_activities', [
            'ticket_id' => $ticketId,
            'user_id' => $requester->id,
            'type' => 'created',
            'body' => null,
            'metadata' => null,
        ]);
        $this->assertSame(1, $this->activityCount($ticketId));
    }

    public function test_status_change_generates_activity_with_metadata(): void
    {
        ['ticket_id' => $ticketId] = $this->createTicketViaApi();
        $agent = User::factory()->create(['role' => 'agent', 'department_id' => $this->itDept->id]);

        $this->actingAs($agent, 'sanctum')
            ->patchJson("/api/v1/tickets/{$ticketId}/status", ['status' => 'in_progress'])
            ->assertStatus(200);

        $admin = User::factory()->create(['role' => 'admin']);
        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/tickets/{$ticketId}/activities");

        $response->assertStatus(200);
        $change = collect($response->json('data.activities'))
            ->firstWhere('type', 'status_change');

        $this->assertNotNull($change);
        $this->assertSame(['old' => 'open', 'new' => 'in_progress'], $change['metadata']);
    }

    public function test_priority_change_generates_activity_with_metadata(): void
    {
        ['ticket_id' => $ticketId] = $this->createTicketViaApi();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/tickets/{$ticketId}", ['priority' => 'high'])
            ->assertStatus(200);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/tickets/{$ticketId}/activities");

        $change = collect($response->json('data.activities'))
            ->firstWhere('type', 'priority_change');

        $this->assertNotNull($change);
        $this->assertSame(['old' => 'medium', 'new' => 'high'], $change['metadata']);
    }

    public function test_department_change_generates_activity_with_metadata(): void
    {
        ['ticket_id' => $ticketId] = $this->createTicketViaApi(department: $this->itDept);
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/tickets/{$ticketId}", ['department_id' => $this->hrDept->id])
            ->assertStatus(200);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/tickets/{$ticketId}/activities");

        $change = collect($response->json('data.activities'))
            ->firstWhere('type', 'department_change');

        $this->assertNotNull($change);
        $this->assertSame([
            'old' => 'Information Technology',
            'new' => 'Human Resources',
        ], $change['metadata']);
    }

    public function test_updating_title_only_does_not_generate_activity(): void
    {
        ['ticket_id' => $ticketId] = $this->createTicketViaApi();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/tickets/{$ticketId}", ['title' => 'Renamed Ticket'])
            ->assertStatus(200);

        $this->assertSame(1, $this->activityCount($ticketId));
    }

    public function test_updating_description_only_does_not_generate_activity(): void
    {
        ['ticket_id' => $ticketId] = $this->createTicketViaApi();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/tickets/{$ticketId}", ['description' => 'Updated description text.'])
            ->assertStatus(200);

        $this->assertSame(1, $this->activityCount($ticketId));
    }

    public function test_idempotent_status_change_does_not_generate_activity(): void
    {
        ['ticket_id' => $ticketId] = $this->createTicketViaApi();
        $agent = User::factory()->create(['role' => 'agent', 'department_id' => $this->itDept->id]);

        $this->actingAs($agent, 'sanctum')
            ->patchJson("/api/v1/tickets/{$ticketId}/status", ['status' => 'open'])
            ->assertStatus(200);

        $this->assertSame(1, $this->activityCount($ticketId));
    }

    public function test_updating_priority_to_same_value_does_not_generate_activity(): void
    {
        ['ticket_id' => $ticketId] = $this->createTicketViaApi(priority: 'medium');
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/tickets/{$ticketId}", ['priority' => 'medium'])
            ->assertStatus(200);

        $this->assertSame(1, $this->activityCount($ticketId));
    }

    public function test_updating_department_to_same_value_does_not_generate_activity(): void
    {
        ['ticket_id' => $ticketId] = $this->createTicketViaApi(department: $this->itDept);
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/tickets/{$ticketId}", ['department_id' => $this->itDept->id])
            ->assertStatus(200);

        $this->assertSame(1, $this->activityCount($ticketId));
    }

    public function test_activity_listing_respects_requester_scoping(): void
    {
        ['ticket_id' => $ticketId] = $this->createTicketViaApi();
        $other = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($other, 'sanctum')
            ->getJson("/api/v1/tickets/{$ticketId}/activities");

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'You are not authorized to access this ticket',
            ]);
    }

    public function test_activity_listing_respects_agent_department_scoping(): void
    {
        ['ticket_id' => $ticketId] = $this->createTicketViaApi(department: $this->itDept);
        $hrAgent = User::factory()->create(['role' => 'agent', 'department_id' => $this->hrDept->id]);

        $response = $this->actingAs($hrAgent, 'sanctum')
            ->getJson("/api/v1/tickets/{$ticketId}/activities");

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'You are not authorized to access this ticket',
            ]);
    }

    public function test_activities_returned_in_chronological_order(): void
    {
        ['ticket_id' => $ticketId] = $this->createTicketViaApi();

        $agent = User::factory()->create(['role' => 'agent', 'department_id' => $this->itDept->id]);
        $this->actingAs($agent, 'sanctum')
            ->patchJson("/api/v1/tickets/{$ticketId}/status", ['status' => 'in_progress'])
            ->assertStatus(200);

        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/tickets/{$ticketId}", ['priority' => 'high'])
            ->assertStatus(200);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/tickets/{$ticketId}/activities");

        $response->assertStatus(200);
        $activities = $response->json('data.activities');

        $types = collect($activities)->pluck('type')->values()->all();
        $this->assertSame(['created', 'status_change', 'priority_change'], $types);

        $timestamps = collect($activities)->pluck('created_at')->values()->all();
        $sorted = $timestamps;
        sort($timestamps);
        $this->assertSame($sorted, $timestamps);
    }

    public function test_simultaneous_priority_and_department_change_generates_two_activities(): void
    {
        $requester = User::factory()->create(['role' => 'requester', 'department_id' => $this->itDept->id]);
        $admin = User::factory()->create(['role' => 'admin']);
        $ticket = $this->makeTicket($requester, $this->itDept);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/tickets/{$ticket->id}", [
                'priority' => 'high',
                'department_id' => $this->hrDept->id,
            ])
            ->assertStatus(200);

        // Ticket was created directly (no "created" activity), so only 2 activities from the update
        $this->assertSame(2, $this->activityCount($ticket->id));

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/tickets/{$ticket->id}/activities");
        $types = collect($response->json('data.activities'))->pluck('type')->values()->all();

        $this->assertContains('priority_change', $types);
        $this->assertContains('department_change', $types);
        $this->assertEqualsCanonicalizing(
            ['priority_change', 'department_change'],
            $types
        );
    }

    // Reply functionality tests
    public function test_user_can_reply_to_a_comment(): void
    {
        $owner = $this->createRequester();
        $agent = User::factory()->create(['role' => 'agent', 'department_id' => $this->itDept->id]);

        $created = $this->actingAs($owner, 'sanctum')
            ->post('/api/v1/tickets', [
                'title' => 'Test ticket',
                'description' => 'Description',
                'priority' => 'medium',
                'department_id' => $this->itDept->id,
            ]);
        $ticketId = $created->json('data.ticket.id');

        $comment = $this->actingAs($agent, 'sanctum')
            ->postJson("/api/v1/tickets/{$ticketId}/comments", ['body' => 'First comment'])
            ->assertStatus(201)
            ->json('data.activity');

        $reply = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/v1/tickets/{$ticketId}/comments", [
                'body' => 'This is a reply',
                'parent_id' => $comment['id'],
            ])
            ->assertStatus(201)
            ->json('data.activity');

        $this->assertSame($comment['id'], $reply['parent_id']);
        $this->assertSame('This is a reply', $reply['body']);

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson("/api/v1/tickets/{$ticketId}/activities");
        $activities = $response->json('data.activities');
        $this->assertCount(2, $activities);
        $comment = collect($activities)->firstWhere('type', 'comment');
        $this->assertNotNull($comment);
        $this->assertCount(1, $comment['replies']);
        $this->assertSame('This is a reply', $comment['replies'][0]['body']);
    }

    public function test_reply_requires_valid_parent_comment(): void
    {
        $owner = $this->createRequester();

        $created = $this->actingAs($owner, 'sanctum')
            ->post('/api/v1/tickets', [
                'title' => 'Test ticket',
                'description' => 'Description',
                'priority' => 'medium',
                'department_id' => $this->itDept->id,
            ]);
        $ticketId = $created->json('data.ticket.id');

        $response = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/v1/tickets/{$ticketId}/comments", [
                'body' => 'Reply to ghost',
                'parent_id' => 99999,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['parent_id']);
    }

    public function test_cannot_reply_to_comment_on_different_ticket(): void
    {
        $ownerA = User::factory()->create(['role' => 'requester', 'department_id' => $this->itDept->id]);
        $ownerB = User::factory()->create(['role' => 'requester', 'department_id' => $this->itDept->id]);

        $ticketA = $this->actingAs($ownerA, 'sanctum')
            ->post('/api/v1/tickets', [
                'title' => 'Ticket A',
                'description' => 'x',
                'priority' => 'medium',
                'department_id' => $this->itDept->id,
            ])->json('data.ticket.id');

        $ticketB = $this->actingAs($ownerB, 'sanctum')
            ->post('/api/v1/tickets', [
                'title' => 'Ticket B',
                'description' => 'x',
                'priority' => 'medium',
                'department_id' => $this->itDept->id,
            ])->json('data.ticket.id');

        $commentOnA = $this->actingAs($ownerA, 'sanctum')
            ->postJson("/api/v1/tickets/{$ticketA}/comments", ['body' => 'Comment on A'])
            ->json('data.activity.id');

        $response = $this->actingAs($ownerB, 'sanctum')
            ->postJson("/api/v1/tickets/{$ticketB}/comments", [
                'body' => 'Cross-ticket reply attempt',
                'parent_id' => $commentOnA,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['parent_id']);
    }

    public function test_replies_are_included_in_timeline_with_proper_nesting(): void
    {
        $owner = $this->createRequester();
        $agent = User::factory()->create(['role' => 'agent', 'department_id' => $this->itDept->id]);

        $created = $this->actingAs($owner, 'sanctum')
            ->post('/api/v1/tickets', [
                'title' => 'Nested replies test',
                'description' => 'Testing nested replies',
                'priority' => 'medium',
                'department_id' => $this->itDept->id,
            ]);
        $ticketId = $created->json('data.ticket.id');

        $comment = $this->actingAs($agent, 'sanctum')
            ->postJson("/api/v1/tickets/{$ticketId}/comments", ['body' => 'Parent comment'])
            ->json('data.activity');

        $reply1 = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/v1/tickets/{$ticketId}/comments", [
                'body' => 'First reply',
                'parent_id' => $comment['id'],
            ])->json('data.activity');

        $reply2 = $this->actingAs($agent, 'sanctum')
            ->postJson("/api/v1/tickets/{$ticketId}/comments", [
                'body' => 'Second reply',
                'parent_id' => $comment['id'],
            ])->json('data.activity');

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson("/api/v1/tickets/{$ticketId}/activities");

        $activities = $response->json('data.activities');
        // Top-level: "created" activity + parent comment = 2
        $this->assertCount(2, $activities);
        // Find the parent comment (not the "created" activity)
        $parentComment = collect($activities)->firstWhere('type', 'comment');
        $this->assertNotNull($parentComment);
        $this->assertCount(2, $parentComment['replies']);
        $this->assertSame('First reply', $parentComment['replies'][0]['body']);
        $this->assertSame('Second reply', $parentComment['replies'][1]['body']);
    }
}