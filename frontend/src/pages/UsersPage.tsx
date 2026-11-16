import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Trash2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { CreateUserModal } from '@/components/users/CreateUserModal';
import { EditUserModal } from '@/components/users/EditUserModal';

interface UserData {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'agent' | 'requester' | string;
  department_id: number | null;
  department: { id: number; name: string } | null;
  created_at: string;
  updated_at: string;
}

// Avatar initials
function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E5E2DA] bg-[#F1EFE9] text-xs font-bold text-stone-700">
      {initials}
    </div>
  );
}

const roleStyles: Record<string, string> = {
  admin: 'text-stone-900',
  agent: 'text-[#0F766E]',
  requester: 'text-stone-600',
};

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  agent: 'Support Agent',
  requester: 'Requester',
};

export function UsersPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserData | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const loadUsers = useCallback(async () => {
    if (!token) return;
    const response = await fetch(`${apiBaseUrl}/v1/users`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const result = await response.json();
    if (response.ok && result.status === 'success') setUsers(result.data.users || []);
  }, [apiBaseUrl, token]);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/', { replace: true });
      return;
    }
    loadUsers();
  }, [user, navigate, loadUsers]);

  const handleDelete = async () => {
    if (!deleteUser || !token) return;
    setDeleteLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/v1/users/${deleteUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const result = await response.json();
      if (response.ok && result.status === 'success') {
        setDeleteUser(null);
        loadUsers();
      } else {
        alert(result.message || 'Failed to delete user');
      }
    } catch {
      alert('Network error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const [roleFilter, setRoleFilter] = useState<string>('');

  const filtered = users.filter((entry) => {
    const matchesQuery = `${entry.name} ${entry.email}`.toLowerCase().includes(query.toLowerCase());
    const matchesRole = !roleFilter || entry.role === roleFilter;
    return matchesQuery && matchesRole;
  });
  const count = (role: string) => users.filter((entry) => entry.role === role).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-stone-900">Users</h1>
          <p className="mt-1 text-sm text-stone-500">{users.length} users across all roles</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="h-9 bg-[#0F766E] px-3.5 text-sm font-semibold text-white hover:bg-[#115E59]">
          <UserPlus className="mr-1.5 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Interactive Role Summary Strip */}
      <div className="grid grid-cols-2 divide-y divide-[#E5E2DA] overflow-hidden rounded-xl border border-[#E5E2DA] bg-white md:grid-cols-4 md:divide-x md:divide-y-0">
        {[
          { role: '', label: 'All Users', value: users.length, dot: 'bg-stone-400' },
          { role: 'admin', label: 'Administrators', value: count('admin'), dot: 'bg-stone-900' },
          { role: 'agent', label: 'Support Agents', value: count('agent'), dot: 'bg-blue-600' },
          { role: 'requester', label: 'Requesters', value: count('requester'), dot: 'bg-emerald-500' },
        ].map(({ role, label, value, dot }) => {
          const active = roleFilter === role;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setRoleFilter((prev) => (prev === role ? '' : role))}
              className={`relative px-5 py-4 text-left transition-colors hover:bg-stone-50/80 ${active ? 'bg-stone-50/90' : ''}`}
            >
              <p className="flex items-center gap-2 text-xs font-medium text-stone-500">
                <span className={`h-2 w-2 rounded-full ${dot}`} />
                {label}
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-[-0.02em] text-stone-900">{value}</p>
              {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-stone-900" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {/* Unified Search + Users Table Card */}
      <div className="overflow-hidden rounded-xl border border-[#E5E2DA] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E2DA] bg-stone-50/60 px-4 py-3 sm:px-5">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users..."
              className="h-9 w-full rounded-lg border border-[#E5E2DA] bg-white pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-shadow focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>
          <span className="text-xs font-medium tabular-nums text-stone-500">
            {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5E2DA] bg-stone-50/40 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((entry) => (
                <tr key={entry.id} className="transition-colors hover:bg-stone-50/80">
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Avatar name={entry.name} />
                      <span className="font-semibold text-stone-900">{entry.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-stone-500 whitespace-nowrap">{entry.email}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className={`text-[13px] font-semibold ${roleStyles[entry.role] ?? 'text-stone-500'}`}>
                      {roleLabels[entry.role] ?? entry.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-stone-500 whitespace-nowrap">
                    {entry.role === 'admin'
                      ? 'All departments'
                      : entry.department?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditUser(entry)}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                      >
                        Edit
                      </button>
                      {/* Don't allow removing yourself */}
                      {entry.id !== user?.id && (
                        <button
                          onClick={() => setDeleteUser(entry)}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <CreateUserModal isOpen={createOpen} onClose={() => setCreateOpen(false)} onSuccess={loadUsers} />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={!!editUser}
        user={editUser}
        onClose={() => setEditUser(null)}
        onSuccess={loadUsers}
      />

      {/* Delete User Confirmation */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm bg-white rounded-xl border border-[#E5E2DA] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5E2DA] pb-3">
              <div className="flex items-center gap-2 text-red-600 font-bold">
                <Trash2 className="w-5 h-5" />
                <span>Remove User</span>
              </div>
              <button
                onClick={() => setDeleteUser(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-stone-500">
              Are you sure you want to remove <strong className="text-stone-800">{deleteUser.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDeleteUser(null)} className="text-stone-500 hover:text-stone-800 hover:bg-stone-100">
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteLoading} className="bg-red-600 hover:bg-red-700 text-white">
                {deleteLoading ? 'Removing...' : 'Remove User'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
