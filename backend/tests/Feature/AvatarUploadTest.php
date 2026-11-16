<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AvatarUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_upload_fetch_and_remove_avatar(): void
    {
        Storage::fake('local');

        $user = User::factory()->create(['role' => 'requester']);
        $file = UploadedFile::fake()->image('avatar.png', 120, 120);

        $uploadRes = $this->actingAs($user, 'sanctum')
            ->post('/api/v1/profile/avatar', ['avatar' => $file], ['Accept' => 'application/json']);

        $uploadRes->assertOk()
            ->assertJsonPath('status', 'success');

        $user->refresh();
        $this->assertNotNull($user->avatar_path);
        Storage::disk('local')->assertExists($user->avatar_path);
        $this->assertNotNull($user->avatar_url);

        $this->get("/api/v1/users/{$user->id}/avatar")
            ->assertOk();

        $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/v1/profile/avatar')
            ->assertOk()
            ->assertJsonPath('data.user.avatar_url', null);

        $user->refresh();
        $this->assertNull($user->avatar_path);
    }

    public function test_avatar_upload_rejects_non_image_files(): void
    {
        Storage::fake('local');
        $user = User::factory()->create(['role' => 'requester']);
        $badFile = UploadedFile::fake()->create('script.txt', 10, 'text/plain');

        $this->actingAs($user, 'sanctum')
            ->post('/api/v1/profile/avatar', ['avatar' => $badFile], ['Accept' => 'application/json'])
            ->assertStatus(422);
    }
}
