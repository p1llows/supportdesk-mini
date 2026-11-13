import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Trash2, X, ShieldCheck, Headset, UserRound } from 'lucide-react';
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
function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

function nameColor(name: string): string {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const roleStyles: Record<string, string> = {
  admin: 'text-indigo-600',
  agent: 'text-blue-600',
  requester: 'text-emerald-600',
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

  const filtered = users.filter((entry) =>
    `${entry.name} ${entry.email}`.toLowerCase().includes(query.toLowerCase())
  );
  const count = (role: string) => users.filter((entry) => entry.role === role).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Users</h1>
          <p className="mt-1 text-sm text-slate-500">{users.length} users across all roles</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { role: 'admin', label: 'Administrators', color: 'text-indigo-600', iconBg: 'bg-indigo-50 text-indigo-600', Icon: ShieldCheck },
          { role: 'agent', label: 'Support Agents', color: 'text-blue-600', iconBg: 'bg-blue-50 text-blue-600', Icon: Headset },
          { role: 'requester', label: 'Requesters', color: 'text-emerald-600', iconBg: 'bg-emerald-50 text-emerald-600', Icon: UserRound },
        ].map(({ role, label, color, iconBg, Icon }) => (
          <div key={role} className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className={`mt-3 text-3xl font-extrabold tabular-nums tracking-tight ${color}`}>{count(role)}</p>
          </div>
        ))}
      </div>

      {/* Unified Search + Users Table Card */}
      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/70 px-4 py-3.5 sm:px-5">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users..."
              className="h-9 w-full rounded-lg border border-slate-300/90 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-shadow focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-200/70 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-600">
            {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200/80 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((entry) => (
                <tr key={entry.id} className="transition-colors hover:bg-slate-50/90">
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Avatar name={entry.name} color={nameColor(entry.name)} />
                      <span className="font-semibold text-slate-900">{entry.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">{entry.email}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`text-sm font-semibold ${roleStyles[entry.role] ?? 'text-slate-500'}`}>
                      {roleLabels[entry.role] ?? entry.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">
                    {entry.role === 'admin'
                      ? 'All departments'
                      : entry.department?.name ?? '—'}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => setEditUser(entry)}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-red-600 font-bold">
                <Trash2 className="w-5 h-5" />
                <span>Remove User</span>
              </div>
              <button
                onClick={() => setDeleteUser(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-500">
              Are you sure you want to remove <strong className="text-slate-800">{deleteUser.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDeleteUser(null)} className="text-slate-500 hover:text-slate-800 hover:bg-slate-100">
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
