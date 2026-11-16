import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Lock, Minus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface UserSummary {
  id: number;
  role: string;
}

type PermissionCell = boolean | string;

interface PermissionRow {
  group: 'Tickets' | 'Comments & Notes' | 'Administration';
  capability: string;
  admin: PermissionCell;
  agent: PermissionCell;
  requester: PermissionCell;
}

const PERMISSION_MATRIX: PermissionRow[] = [
  { group: 'Tickets', capability: 'Submit new support tickets', admin: false, agent: false, requester: 'Dept required' },
  { group: 'Tickets', capability: 'View ticket queue', admin: 'All depts', agent: 'Own dept', requester: 'Own tickets' },
  { group: 'Tickets', capability: 'Edit ticket title, description & priority', admin: 'Active only', agent: 'Active only', requester: 'Own open only' },
  { group: 'Tickets', capability: 'Transition Open → In Progress → Resolved', admin: true, agent: 'Own dept', requester: false },
  { group: 'Tickets', capability: 'Close resolved tickets & reopen closed tickets', admin: true, agent: false, requester: false },
  { group: 'Tickets', capability: 'Assign / claim ticket owner', admin: true, agent: 'Own dept', requester: false },
  { group: 'Tickets', capability: 'Delete tickets', admin: true, agent: false, requester: false },

  { group: 'Comments & Notes', capability: 'Post public comments & replies', admin: 'Active only', agent: 'Active only', requester: 'Active only' },
  { group: 'Comments & Notes', capability: 'Post & view internal agent notes', admin: true, agent: 'Own dept', requester: false },
  { group: 'Comments & Notes', capability: 'Edit comments', admin: true, agent: 'Own only', requester: 'Own only' },
  { group: 'Comments & Notes', capability: 'Delete comments', admin: true, agent: false, requester: false },

  { group: 'Administration', capability: 'Manage departments & create dept agents', admin: true, agent: false, requester: false },
  { group: 'Administration', capability: 'Manage users & role assignments', admin: true, agent: false, requester: false },
  { group: 'Administration', capability: 'View system-wide activity logs', admin: true, agent: false, requester: false },
];

function CellValue({ value }: { value: PermissionCell }) {
  if (value === true) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0F766E]/10 text-[#0F766E]">
        <Check className="h-3.5 w-3.5" aria-label="Allowed" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center text-stone-300">
        <Minus className="h-3.5 w-3.5" aria-label="Not allowed" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-[#E5E2DA] bg-[#FAF9F6] px-2.5 py-0.5 text-[11px] font-medium text-stone-700">
      {value}
    </span>
  );
}

export function RolesPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/', { replace: true });
      return;
    }
    if (!token) return;

    fetch(`${apiBaseUrl}/v1/users`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          setUsers(data.data.users ?? []);
        }
      })
      .catch(() => {});
  }, [user, token, apiBaseUrl, navigate]);

  const roleCount = (role: string) => users.filter((u) => u.role === role).length;
  const groups: PermissionRow['group'][] = ['Tickets', 'Comments & Notes', 'Administration'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-stone-900">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-stone-500">
            Fixed access-control matrix across SupportDesk Mini&apos;s three system roles.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E2DA] bg-white px-3 py-1 text-xs font-medium text-stone-600">
          <Lock className="h-3.5 w-3.5 text-stone-400" />
          3 locked system roles
        </span>
      </div>

      {/* Role Summary Strip */}
      <section
        aria-label="System roles summary"
        className="grid grid-cols-1 divide-y divide-[#E5E2DA] overflow-hidden rounded-xl border border-[#E5E2DA] bg-white md:grid-cols-3 md:divide-x md:divide-y-0"
      >
        {[
          {
            role: 'admin',
            title: 'Administrator',
            dot: 'bg-stone-900',
            desc: 'Full system access, ticket lifecycle closure, user & department management.',
          },
          {
            role: 'agent',
            title: 'Support Agent',
            dot: 'bg-[#0F766E]',
            desc: 'Department-scoped triage, status transitions, assignment, and internal notes.',
          },
          {
            role: 'requester',
            title: 'Requester',
            dot: 'bg-stone-400',
            desc: 'Submit tickets to a department, track own requests, and reply to agents.',
          },
        ].map((item) => (
          <div key={item.role} className="px-5 py-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold text-stone-700">
                <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                {item.title}
              </span>
              <span className="font-mono text-xs font-semibold tabular-nums text-stone-500">
                {roleCount(item.role)} {roleCount(item.role) === 1 ? 'user' : 'users'}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-stone-500">{item.desc}</p>
          </div>
        ))}
      </section>

      {/* Permission Matrix */}
      <div className="overflow-hidden rounded-xl border border-[#E5E2DA] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5E2DA] bg-[#FAF9F6] text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-5 py-3.5">Capability</th>
                <th className="px-4 py-3.5 text-center">Administrator</th>
                <th className="px-4 py-3.5 text-center">Support Agent</th>
                <th className="px-5 py-3.5 text-center">Requester</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFECE6]">
              {groups.map((group) => (
                <Fragment key={group}>
                  <tr className="bg-[#FAF9F6]/50">
                    <td
                      colSpan={4}
                      className="px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-stone-400"
                    >
                      {group}
                    </td>
                  </tr>
                  {PERMISSION_MATRIX.filter((row) => row.group === group).map((row) => (
                    <tr key={row.capability} className="transition-colors hover:bg-[#FAF9F6]">
                      <td className="px-5 py-3 text-[13px] font-medium text-stone-800">
                        {row.capability}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <CellValue value={row.admin} />
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <CellValue value={row.agent} />
                      </td>
                      <td className="px-5 py-3 text-center whitespace-nowrap">
                        <CellValue value={row.requester} />
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
