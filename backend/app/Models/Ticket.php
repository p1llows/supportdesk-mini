<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    use HasFactory;

    /**
     * When a ticket is deleted, delete its attachments through Eloquent so
     * each child's `deleting` hook removes the stored file from disk. The
     * database FK cascade alone would only remove rows and orphan the files.
     */
    protected static function booted(): void
    {
        static::deleting(function (Ticket $ticket) {
            $ticket->attachments()->each(
                fn (TicketAttachment $attachment) => $attachment->delete()
            );
        });
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'department_id',
        'assigned_to',
        'title',
        'description',
        'priority',
        'status',
    ];

    /**
     * Get the department that this ticket is assigned to.
     *
     * @return BelongsTo<Department, $this>
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Get the user (requester) that submitted the ticket.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the agent assigned to this ticket.
     *
     * @return BelongsTo<User, $this>
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Get the unified activity timeline entries for this ticket.
     *
     * @return HasMany<TicketActivity, $this>
     */
    public function activities(): HasMany
    {
        return $this->hasMany(TicketActivity::class);
    }

    /**
     * Get the file attachments uploaded with this ticket.
     *
     * @return HasMany<TicketAttachment, $this>
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(TicketAttachment::class);
    }
}
