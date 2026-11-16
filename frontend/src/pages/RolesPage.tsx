import { Fragment, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Check, CheckCircle2, Loader2, Lock, Minus, RotateCcw, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

interface UserSummary {
  id: number;
  role: string;
}

type RoleKey = 'admin' | 'agent' | 'requester';

interface PermissionRow {
  key: string;
  group: 'Tickets' | 'Comments & Notes' | 'Administration' | string;
  label: string;
  admin: boolean;
  agent: boolean;
  requester: boolean;
  locked?: Partial<Record<RoleKey, boolean>>;
}

function PermissionToggle({
  checked,
  locked,
  label,
  onToggle,
}: {
  checked: boolean;
  locked?: boolean;
  label: string;
  onToggle: () => void;
}) {
  if (locked) {
    return (
      <span
        title="Locked system rule"
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
          checked ? 'bg-[#0F766E]/10 text-[#0F766E]' : 'text-stone-300'
        }`}
      >
        {checked ? <Check className="h-3.5 w-3.5" aria-label={`${label}: Allowed (locked)`} /> : <Minus className="h-3.5 w-3.5" aria-label={`${label}: Disabled (locked)`} />}
      </span>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-1 ${
        checked
          ? 'border-[#0F766E] bg-[#0F766E]'
          : 'border-[#D6D3CB] bg-[#EFECE6]'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export function RolesPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState<string>('[]');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
      const [permRes, usersRes] = await Promise.all([
        fetch(`${apiBaseUrl}/v1/roles/permissions`, { headers }),
        fetch(`${apiBaseUrl}/v1/users`, { headers }),
      ]);
      const permData = await permRes.json();
      const usersData = await usersRes.json();

      if (permRes.ok && permData.status === 'success') {
        const list: PermissionRow[] = permData.data.permissions ?? [];
        setPermissions(list);
        setSavedSnapshot(JSON.stringify(list));
      } else {
        setError(permData.message || 'Failed to load role permissions.');
      }

      if (usersRes.ok && usersData.status === 'success') {
        setUsers(usersData.data.users ?? []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error loading roles.');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, token]);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/', { replace: true });
      return;
    }
    loadData();
  }, [user, navigate, loadData]);

  const togglePermission = (permKey: string, role: RoleKey) => {
    setSuccess(null);
    setPermissions((prev) =>
      prev.map((row) => {
        if (row.key !== permKey || row.locked?.[role]) return row;
        return { ...row, [role]: !row[role] };
      })
    );
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${apiBaseUrl}/v1/roles/permissions`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permissions: permissions.map((p) => ({
            key: p.key,
            admin: p.admin,
            agent: p.agent,
            requester: p.requester,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        const updated: PermissionRow[] = data.data.permissions ?? [];
        setPermissions(updated);
        setSavedSnapshot(JSON.stringify(updated));
        setSuccess('Role permissions saved.');
      } else {
        setError(data.message || 'Failed to save permissions.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error saving permissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setPermissions(JSON.parse(savedSnapshot));
    setError(null);
    setSuccess(null);
  };

  const isDirty = JSON.stringify(permissions) !== savedSnapshot;
  const roleCount = (role: string) => users.filter((u) => u.role === role).length;
  const groups = Array.from(new Set(permissions.map((p) => p.group)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-stone-900">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-stone-500">
            Configure capabilities across SupportDesk Mini&apos;s three system roles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isDirty ? (
            <>
              <Button variant="outline" size="sm" onClick={handleDiscard} disabled={saving}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Discard
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                Save Permissions
              </Button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E2DA] bg-white px-3 py-1 text-xs font-medium text-stone-600">
              <Lock className="h-3.5 w-3.5 text-stone-400" />
              3 locked system roles
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

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

      {/* Editable Permission Matrix */}
      <div className="overflow-hidden rounded-xl border border-[#E5E2DA] bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading permissions...
          </div>
        ) : (
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
                    {permissions
                      .filter((row) => row.group === group)
                      .map((row) => (
                        <tr key={row.key} className="transition-colors hover:bg-[#FAF9F6]">
                          <td className="px-5 py-3 text-[13px] font-medium text-stone-800">
                            {row.label}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <PermissionToggle
                              checked={row.admin}
                              locked={row.locked?.admin}
                              label={`${row.label} for Administrator`}
                              onToggle={() => togglePermission(row.key, 'admin')}
                            />
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <PermissionToggle
                              checked={row.agent}
                              locked={row.locked?.agent}
                              label={`${row.label} for Support Agent`}
                              onToggle={() => togglePermission(row.key, 'agent')}
                            />
                          </td>
                          <td className="px-5 py-3 text-center whitespace-nowrap">
                            <PermissionToggle
                              checked={row.requester}
                              locked={row.locked?.requester}
                              label={`${row.label} for Requester`}
                              onToggle={() => togglePermission(row.key, 'requester')}
                            />
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
