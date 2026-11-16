<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TicketActivity extends Model
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
        'parent_id',
        'type',
        'body',
        'is_internal',
        'metadata',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_internal' => 'boolean',
            'metadata' => 'array',
        ];
    }

    /**
     * Get the ticket this activity entry belongs to.
     *
     * @return BelongsTo<Ticket, $this>
     */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * Get the user who performed this activity.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the parent comment this reply belongs to.
     *
     * @return BelongsTo<TicketActivity, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(TicketActivity::class, 'parent_id');
    }

    /**
     * Get the replies to this comment.
     *
     * @return HasMany<TicketActivity, $this>
     */
    public function replies(): HasMany
    {
        return $this->hasMany(TicketActivity::class, 'parent_id');
    }
}
