import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Users as UsersIcon, ShieldCheck, User as UserIcon, ShieldAlert } from 'lucide-react';

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
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <Badge variant="destructive" className="bg-purple-600 hover:bg-purple-700">
            <ShieldAlert className="w-3 h-3 mr-1 inline" />
            Administrator
          </Badge>
        );
      case 'agent':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 font-medium">
            <ShieldCheck className="w-3 h-3 mr-1 inline text-blue-600" />
            Support Agent
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 font-medium">
            <UserIcon className="w-3 h-3 mr-1 inline text-slate-500" />
            Requester
          </Badge>
        );
    }
  };

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
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-36 bg-slate-200 rounded animate-pulse" />
          <div className="h-6 w-24 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 w-full bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <UsersIcon className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-800 text-base">No Users Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          There are currently no registered users matching your criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-purple-600" />
            System User Directory
          </h3>
          <p className="text-xs text-slate-500">
            Displaying {users.length} registered user{users.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">User Name</th>
              <th className="px-4 py-3">Email Address</th>
              <th className="px-4 py-3">System Role</th>
              <th className="px-4 py-3 text-right">Registered Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3 font-mono font-bold text-slate-500">
                  #{u.id}
                </td>
                <td className="px-4 py-3 font-bold text-slate-900">
                  {u.name}
                </td>
                <td className="px-4 py-3 font-mono text-slate-600">
                  {u.email}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {getRoleBadge(u.role)}
                </td>
                <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
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
