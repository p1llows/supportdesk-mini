<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class TicketAttachment extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'ticket_id',
        'user_id',
        'original_name',
        'stored_path',
        'mime_type',
        'size_bytes',
    ];

    /**
     * Remove the stored file from disk when the attachment record is deleted,
     * whether directly or via its ticket's cleanup hook.
     */
    protected static function booted(): void
    {
        static::deleting(function (TicketAttachment $attachment) {
            Storage::disk('local')->delete($attachment->stored_path);
        });
    }

    /**
     * Get the ticket this attachment belongs to.
     *
     * @return BelongsTo<Ticket, $this>
     */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * Get the user who uploaded this attachment.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
