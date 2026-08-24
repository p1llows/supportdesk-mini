<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TicketAttachmentTest extends TestCase
{
    use RefreshDatabase;

    private Department $itDept;
    private Department $hrDept;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->itDept = Department::firstOrCreate(['name' => 'Information Technology']);
        $this->hrDept = Department::firstOrCreate(['name' => 'Human Resources']);
    }

    /** Helper: create a requester with a department and submit a ticket via the API. */
    private function createRequester(): User
    {
        return User::factory()->create([
            'role' => 'requester',
            'department_id' => $this->itDept->id,
        ]);
    }

    public function test_requester_can_submit_ticket_with_attachments(): void
    {
        $requester = $this->createRequester();

        $response = $this->actingAs($requester, 'sanctum')
            ->post('/api/v1/tickets', [
                'title' => 'VPN Access Request',
                'description' => 'Screenshot attached.',
                'priority' => 'medium',
                'department_id' => $this->itDept->id,
                'attachments' => [
                    // NOTE: avoid UploadedFile::fake()->image() — the container's
                    // PHP lacks GD JPEG support; content-based fakes are portable.
                    UploadedFile::fake()->createWithContent('error-screenshot.png', 'PNGDATA'),
                    UploadedFile::fake()->createWithContent('notes.txt', 'extra context'),
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonCount(2, 'data.ticket.attachments')
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'ticket' => [
                        'title' => 'VPN Access Request',
                    ],
                ],
            ]);

        $this->assertDatabaseCount('ticket_attachments', 2);

        $paths = DB::table('ticket_attachments')->pluck('stored_path')->all();
        $this->assertCount(2, $paths);
        Storage::disk('local')->assertExists($paths);

        $names = DB::table('ticket_attachments')->pluck('original_name')->all();
        $this->assertEqualsCanonicalizing(['error-screenshot.png', 'notes.txt'], $names);
    }

    public function test_ticket_show_response_includes_attachment_metadata(): void
    {
        $requester = $this->createRequester();

        $created = $this->actingAs($requester, 'sanctum')
            ->post('/api/v1/tickets', [
                'title' => 'Broken laptop',
                'description' => 'Photo attached.',
                'priority' => 'high',
                'department_id' => $this->itDept->id,
                'attachments' => [
                    UploadedFile::fake()->createWithContent('scan.pdf', '%PDF-1.4 simulated pdf body'),
                ],
            ]);
        $created->assertStatus(201);
        $ticketId = $created->json('data.ticket.id');

        $response = $this->actingAs($requester, 'sanctum')
            ->getJson("/api/v1/tickets/{$ticketId}");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data.ticket.attachments')
            ->assertJsonPath('data.ticket.attachments.0.original_name', 'scan.pdf')
            ->assertJsonPath('data.ticket.attachments.0.mime_type', 'application/pdf');
    }

    public function test_ticket_can_be_submitted_without_attachments(): void
    {
        $requester = $this->createRequester();

        // JSON payload (no multipart) must keep working exactly as before.
        $response = $this->actingAs($requester, 'sanctum')
            ->postJson('/api/v1/tickets', [
                'title' => 'No attachments needed',
                'description' => 'Plain text issue.',
                'priority' => 'low',
                'department_id' => $this->itDept->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonCount(0, 'data.ticket.attachments');
        $this->assertDatabaseCount('ticket_attachments', 0);
    }

    public function test_attachment_larger_than_5mb_is_rejected(): void
    {
        $requester = $this->createRequester();

        $response = $this->actingAs($requester, 'sanctum')
            ->withHeaders(['Accept' => 'application/json'])
            ->post('/api/v1/tickets', [
                'title' => 'Too big',
                'description' => 'Oversized file.',
                'priority' => 'medium',
                'department_id' => $this->itDept->id,
                'attachments' => [
                    UploadedFile::fake()->create('huge.pdf', 5121, 'application/pdf'),
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['attachments.0']);
        $this->assertDatabaseCount('tickets', 0);
        $this->assertDatabaseCount('ticket_attachments', 0);
    }

    public function test_disallowed_file_type_is_rejected(): void
    {
        $requester = $this->createRequester();

        $response = $this->actingAs($requester, 'sanctum')
            ->withHeaders(['Accept' => 'application/json'])
            ->post('/api/v1/tickets', [
                'title' => 'Bad type',
                'description' => 'Executable attached.',
                'priority' => 'medium',
                'department_id' => $this->itDept->id,
                'attachments' => [
                    UploadedFile::fake()->create('payload.exe', 10, 'application/x-msdownload'),
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['attachments.0']);
        $this->assertDatabaseCount('tickets', 0);
    }

    public function test_more_than_three_attachments_are_rejected(): void
    {
        $requester = $this->createRequester();

        $response = $this->actingAs($requester, 'sanctum')
            ->withHeaders(['Accept' => 'application/json'])
            ->post('/api/v1/tickets', [
                'title' => 'Too many files',
                'description' => 'Four files.',
                'priority' => 'medium',
                'department_id' => $this->itDept->id,
                'attachments' => [
                    UploadedFile::fake()->create('a.txt', 5),
                    UploadedFile::fake()->create('b.txt', 5),
                    UploadedFile::fake()->create('c.txt', 5),
                    UploadedFile::fake()->create('d.txt', 5),
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['attachments']);
        $this->assertDatabaseCount('tickets', 0);
    }

    public function test_unauthenticated_user_gets_401_on_download(): void
    {
        $requester = $this->createRequester();
        $created = $this->actingAs($requester, 'sanctum')
            ->post('/api/v1/tickets', [
                'title' => 'With file',
                'description' => 'x',
                'priority' => 'medium',
                'department_id' => $this->itDept->id,
                'attachments' => [UploadedFile::fake()->createWithContent('secret.txt', 'top secret')],
            ]);
        $ticketId = $created->json('data.ticket.id');
        $attachmentId = DB::table('ticket_attachments')->where('ticket_id', $ticketId)->value('id');

        // Clear the authenticated user so the download request is truly unauthenticated.
        $this->app['auth']->forgetGuards();

        $this->getJson("/api/v1/tickets/{$ticketId}/attachments/{$attachmentId}/download")
            ->assertStatus(401);
    }

    public function test_requester_cannot_download_other_users_ticket_attachment(): void
    {
        $owner = $this->createRequester();
        $other = User::factory()->create([
            'role' => 'requester',
            'department_id' => $this->itDept->id,
        ]);

        $created = $this->actingAs($owner, 'sanctum')
            ->post('/api/v1/tickets', [
                'title' => 'Private file',
                'description' => 'x',
                'priority' => 'medium',
                'department_id' => $this->itDept->id,
                'attachments' => [UploadedFile::fake()->createWithContent('private.txt', 'private')],
            ]);
        $ticketId = $created->json('data.ticket.id');
        $attachmentId = DB::table('ticket_attachments')->where('ticket_id', $ticketId)->value('id');

        $this->actingAs($other, 'sanctum')
            ->get("/api/v1/tickets/{$ticketId}/attachments/{$attachmentId}/download")
            ->assertStatus(403);
    }

    public function test_agent_can_download_department_ticket_attachment(): void
    {
        $owner = $this->createRequester();
        $agent = User::factory()->create(['role' => 'agent', 'department_id' => $this->itDept->id]);

        $created = $this->actingAs($owner, 'sanctum')
            ->post('/api/v1/tickets', [
                'title' => 'Logs attached',
                'description' => 'x',
                'priority' => 'medium',
                'department_id' => $this->itDept->id,
                'attachments' => [UploadedFile::fake()->createWithContent('system.log', 'log line 1')],
            ]);
        $ticketId = $created->json('data.ticket.id');
        $attachmentId = DB::table('ticket_attachments')->where('ticket_id', $ticketId)->value('id');

        $response = $this->actingAs($agent, 'sanctum')
            ->get("/api/v1/tickets/{$ticketId}/attachments/{$attachmentId}/download");

        $response->assertStatus(200);
        $this->assertSame('log line 1', $response->streamedContent());
        $this->assertStringContainsString('system.log', $response->headers->get('content-disposition'));
    }

    public function test_agent_from_other_department_gets_403_on_download(): void
    {
        $owner = $this->createRequester();
        $hrAgent = User::factory()->create(['role' => 'agent', 'department_id' => $this->hrDept->id]);

        $created = $this->actingAs($owner, 'sanctum')
            ->post('/api/v1/tickets', [
                'title' => 'IT only',
                'description' => 'x',
                'priority' => 'medium',
                'department_id' => $this->itDept->id,
                'attachments' => [UploadedFile::fake()->createWithContent('it-only.txt', 'internal')],
            ]);
        $ticketId = $created->json('data.ticket.id');
        $attachmentId = DB::table('ticket_attachments')->where('ticket_id', $ticketId)->value('id');

        $this->actingAs($hrAgent, 'sanctum')
            ->get("/api/v1/tickets/{$ticketId}/attachments/{$attachmentId}/download")
            ->assertStatus(403);
    }

    public function test_admin_can_download_any_attachment(): void
    {
        $owner = $this->createRequester();
        $admin = User::factory()->create(['role' => 'admin']);

        $created = $this->actingAs($owner, 'sanctum')
            ->post('/api/v1/tickets', [
                'title' => 'For admin',
                'description' => 'x',
                'priority' => 'medium',
                'department_id' => $this->itDept->id,
                'attachments' => [UploadedFile::fake()->createWithContent('evidence.txt', 'BINARYDATA')],
            ]);
        $ticketId = $created->json('data.ticket.id');
        $attachmentId = DB::table('ticket_attachments')->where('ticket_id', $ticketId)->value('id');

        $response = $this->actingAs($admin, 'sanctum')
            ->get("/api/v1/tickets/{$ticketId}/attachments/{$attachmentId}/download");

        $response->assertStatus(200);
        $this->assertSame('BINARYDATA', $response->streamedContent());
    }

    public function test_download_with_cross_ticket_attachment_id_returns_404(): void
    {
        // IDOR prevention mirrors the comments endpoint: a valid attachment id
        // presented under a different ticket's URL must not resolve.
        $ownerA = User::factory()->create(['role' => 'requester', 'department_id' => $this->itDept->id]);
        $ownerB = User::factory()->create(['role' => 'requester', 'department_id' => $this->itDept->id]);
        $admin = User::factory()->create(['role' => 'admin']);

        $ticketA = $this->actingAs($ownerA, 'sanctum')
            ->post('/api/v1/tickets', [
                'title' => 'Ticket A',
                'description' => 'x',
                'priority' => 'medium',
                'department_id' => $this->itDept->id,
                'attachments' => [UploadedFile::fake()->createWithContent('a.txt', 'aaa')],
            ])->json('data.ticket.id');

        $ticketB = $this->actingAs($ownerB, 'sanctum')
            ->post('/api/v1/tickets', [
                'title' => 'Ticket B',
                'description' => 'x',
                'priority' => 'medium',
                'department_id' => $this->itDept->id,
            ])->json('data.ticket.id');

        $attachmentOnA = DB::table('ticket_attachments')->where('ticket_id', $ticketA)->value('id');

        $this->actingAs($admin, 'sanctum')
            ->get("/api/v1/tickets/{$ticketB}/attachments/{$attachmentOnA}/download")
            ->assertStatus(404)
            ->assertJson([
                'status' => 'error',
                'message' => 'Attachment not found',
            ]);
    }

    public function test_deleting_ticket_removes_attachment_rows_and_stored_files(): void
    {
        $owner = $this->createRequester();
        $admin = User::factory()->create(['role' => 'admin']);

        $created = $this->actingAs($owner, 'sanctum')
            ->post('/api/v1/tickets', [
                'title' => 'Doomed ticket',
                'description' => 'x',
                'priority' => 'low',
                'department_id' => $this->itDept->id,
                'attachments' => [UploadedFile::fake()->createWithContent('doomed.txt', 'goodbye')],
            ]);
        $ticketId = $created->json('data.ticket.id');
        $path = DB::table('ticket_attachments')->where('ticket_id', $ticketId)->value('stored_path');

        Storage::disk('local')->assertExists($path);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/v1/tickets/{$ticketId}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('ticket_attachments', ['ticket_id' => $ticketId]);
        Storage::disk('local')->assertMissing($path);
    }
}
