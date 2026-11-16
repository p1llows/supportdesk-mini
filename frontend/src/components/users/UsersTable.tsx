import React from 'react';
import { SupportBadge } from '@/components/ui/status-badges';
import { Users as UsersIcon } from 'lucide-react';

export interface UserData {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'agent' | 'requester' | string;
  created_at: string;
  updated_at: string;
}

interface UsersTableProps {
  users: UserData[];
  loading: boolean;
}

export const UsersTable: React.FC<UsersTableProps> = ({ users, loading }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-36 bg-zinc-200 rounded animate-pulse" />
          <div className="h-6 w-24 bg-zinc-200 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 w-full bg-zinc-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center shadow-sm space-y-3">
        <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
          <UsersIcon className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-zinc-800 text-base">No Users Found</h3>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          There are currently no registered users matching your criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="p-4 md:p-5 border-b border-zinc-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-zinc-900 text-base flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-blue-700" />
            System User Directory
          </h3>
          <p className="text-xs text-zinc-500">
            Displaying {users.length} registered user{users.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 text-zinc-600 font-semibold uppercase tracking-wider border-b border-zinc-100">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">User Name</th>
              <th className="px-4 py-3">Email Address</th>
              <th className="px-4 py-3">System Role</th>
              <th className="px-4 py-3 text-right">Registered Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-zinc-50/80 transition-colors">
                <td className="px-4 py-3 font-mono font-bold text-zinc-500">
                  #{u.id}
                </td>
                <td className="px-4 py-3 font-bold text-zinc-900">
                  {u.name}
                </td>
                <td className="px-4 py-3 font-mono text-zinc-600">
                  {u.email}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <SupportBadge category="role" value={u.role} />
                </td>
                <td className="px-4 py-3 text-right text-zinc-500 whitespace-nowrap">
                  {formatDate(u.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
