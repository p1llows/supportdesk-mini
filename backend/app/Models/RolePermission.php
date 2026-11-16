<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RolePermission extends Model
{
    protected $fillable = [
        'role',
        'permission',
        'allowed',
    ];

    protected function casts(): array
    {
        return [
            'allowed' => 'boolean',
        ];
    }

    /**
     * Default permission matrix for the 3 fixed system roles.
     *
     * @var list<array{
     *   key: string,
     *   group: string,
     *   label: string,
     *   admin: bool,
     *   agent: bool,
     *   requester: bool,
     *   locked: array{admin?: bool, agent?: bool, requester?: bool}
     * }>
     */
    public const DEFINITIONS = [
        [
            'key' => 'create_tickets',
            'group' => 'Tickets',
            'label' => 'Submit new support tickets',
            'admin' => false,
            'agent' => false,
            'requester' => true,
            'locked' => ['admin' => true, 'agent' => true],
        ],
        [
            'key' => 'edit_tickets',
            'group' => 'Tickets',
            'label' => 'Edit ticket details & priority',
            'admin' => true,
            'agent' => true,
            'requester' => true,
            'locked' => ['admin' => true],
        ],
        [
            'key' => 'transition_tickets',
            'group' => 'Tickets',
            'label' => 'Transition Open → In Progress → Resolved',
            'admin' => true,
            'agent' => true,
            'requester' => false,
            'locked' => ['admin' => true, 'requester' => true],
        ],
        [
            'key' => 'close_reopen_tickets',
            'group' => 'Tickets',
            'label' => 'Close resolved & reopen closed tickets',
            'admin' => true,
            'agent' => false,
            'requester' => false,
            'locked' => ['admin' => true, 'requester' => true],
        ],
        [
            'key' => 'assign_tickets',
            'group' => 'Tickets',
            'label' => 'Assign or claim ticket owner',
            'admin' => true,
            'agent' => true,
            'requester' => false,
            'locked' => ['admin' => true, 'requester' => true],
        ],
        [
            'key' => 'delete_tickets',
            'group' => 'Tickets',
            'label' => 'Delete tickets',
            'admin' => true,
            'agent' => false,
            'requester' => false,
            'locked' => ['admin' => true],
        ],
        [
            'key' => 'post_comments',
            'group' => 'Comments & Notes',
            'label' => 'Post public comments & replies',
            'admin' => true,
            'agent' => true,
            'requester' => true,
            'locked' => ['admin' => true],
        ],
        [
            'key' => 'internal_notes',
            'group' => 'Comments & Notes',
            'label' => 'Post & view internal agent notes',
            'admin' => true,
            'agent' => true,
            'requester' => false,
            'locked' => ['admin' => true, 'requester' => true],
        ],
        [
            'key' => 'edit_comments',
            'group' => 'Comments & Notes',
            'label' => 'Edit comments',
            'admin' => true,
            'agent' => true,
            'requester' => true,
            'locked' => ['admin' => true],
        ],
        [
            'key' => 'delete_comments',
            'group' => 'Comments & Notes',
            'label' => 'Delete comments',
            'admin' => true,
            'agent' => false,
            'requester' => false,
            'locked' => ['admin' => true],
        ],
        [
            'key' => 'manage_departments',
            'group' => 'Administration',
            'label' => 'Manage departments & create dept agents',
            'admin' => true,
            'agent' => false,
            'requester' => false,
            'locked' => ['admin' => true, 'requester' => true],
        ],
        [
            'key' => 'manage_users',
            'group' => 'Administration',
            'label' => 'Manage users & role assignments',
            'admin' => true,
            'agent' => false,
            'requester' => false,
            'locked' => ['admin' => true, 'requester' => true],
        ],
        [
            'key' => 'view_activity_logs',
            'group' => 'Administration',
            'label' => 'View system-wide activity logs',
            'admin' => true,
            'agent' => false,
            'requester' => false,
            'locked' => ['admin' => true, 'requester' => true],
        ],
        [
            'key' => 'manage_roles',
            'group' => 'Administration',
            'label' => 'Manage roles & permissions',
            'admin' => true,
            'agent' => false,
            'requester' => false,
            'locked' => ['admin' => true, 'agent' => true, 'requester' => true],
        ],
    ];

    public static function allows(string $role, string $permission): bool
    {
        $override = static::where('role', $role)
            ->where('permission', $permission)
            ->first();

        if ($override !== null) {
            return (bool) $override->allowed;
        }

        foreach (self::DEFINITIONS as $def) {
            if ($def['key'] === $permission) {
                return (bool) ($def[$role] ?? false);
            }
        }

        return false;
    }

    /**
     * Return full permission matrix merged with persisted DB overrides.
     *
     * @return list<array<string, mixed>>
     */
    public static function matrix(): array
    {
        $overrides = static::all()
            ->groupBy('permission')
            ->map(fn ($rows) => $rows->keyBy('role'));

        return array_map(function (array $def) use ($overrides) {
            $permOverrides = $overrides->get($def['key']);
            foreach (['admin', 'agent', 'requester'] as $role) {
                if ($permOverrides && $permOverrides->has($role)) {
                    $def[$role] = (bool) $permOverrides->get($role)->allowed;
                }
            }
            return $def;
        }, self::DEFINITIONS);
    }
}
