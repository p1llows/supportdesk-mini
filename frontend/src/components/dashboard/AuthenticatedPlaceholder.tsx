import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Server, RefreshCw, CheckCircle2, AlertCircle, LogOut, User as UserIcon } from 'lucide-react';

interface HealthData {
  status: string;
  timestamp: string;
  services: {
    database: string;
    php_version: string;
  };
}

export const AuthenticatedPlaceholder = () => {
  const { user, logout } = useAuth();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/v1/health`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await res.json();
      setHealth(data);

      if (!res.ok) {
        setError(`Service degraded (HTTP ${res.status})`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect to API backend');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{user?.name}</h2>
                <Badge variant={user?.role === 'admin' ? 'destructive' : user?.role === 'agent' ? 'secondary' : 'outline'}>
                  {user?.role}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="shrink-0 text-slate-700 hover:text-slate-900">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </header>

        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Server className="w-5 h-5 text-slate-700" />
                  Authenticated Destination Placeholder
                </CardTitle>
                <CardDescription>
                  Issue #3 Routing Verification (Dashboard & Ticket Features in Issue #5+)
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchHealth}
                disabled={loading}
                aria-label="Refresh Health Status"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && (
              <div className="p-4 text-center text-sm text-slate-500 animate-pulse">
                Checking API connection...
              </div>
            )}

            {!loading && error && !health && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold">Backend Unreachable:</span> {error}
                  <p className="text-xs text-red-500 mt-1">
                    API Target: <code className="bg-red-100 px-1 py-0.5 rounded">{apiBaseUrl}</code>
                  </p>
                </div>
              </div>
            )}

            {health && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    API Status
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-slate-900 capitalize">
                      {health.status}
                    </span>
                    <Badge variant={health.status === 'ok' ? 'success' : 'destructive'}>
                      {health.status === 'ok' ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Healthy
                        </span>
                      ) : (
                        'Degraded'
                      )}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Database className="w-3.5 h-3.5 text-slate-400" />
                    Database
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-slate-900 capitalize">
                      {health.services.database}
                    </span>
                    <Badge variant={health.services.database === 'connected' ? 'success' : 'destructive'}>
                      {health.services.database}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    PHP Runtime
                  </span>
                  <div className="text-base font-semibold text-slate-900">
                    PHP {health.services.php_version}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Authenticated User
                  </span>
                  <div className="text-xs font-mono text-slate-700 truncate" title={user?.email}>
                    {user?.email} ({user?.role})
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-4 text-xs text-slate-500 space-y-1">
              <p><span className="font-semibold text-slate-700">Client Routing:</span> React Router (`/login` ↔ `/register` ↔ `/`)</p>
              <p><span className="font-semibold text-slate-700">Docker Architecture:</span> React SPA (Node 22) → Laravel 12 API (PHP 8.3) → MySQL 8.0</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};
