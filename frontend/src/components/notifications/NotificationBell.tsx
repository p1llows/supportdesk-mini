import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Bell, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationItem {
  id: number;
  ticket_id: number;
  type: string;
  message: string;
  read_at: string | null;
  is_read: boolean;
  actor: { id: number; name: string } | null;
  created_at: string;
}

const POLL_INTERVAL_MS = 30000;

function relativeTime(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toISOString().slice(0, 10);
}

export function NotificationBell({ className }: { className?: string }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${apiBaseUrl}/v1/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const result = await response.json();
      if (response.ok && result.status === 'success') {
        setNotifications(result.data.notifications ?? []);
        setUnreadCount(result.data.unread_count ?? 0);
      }
    } catch {
      // Polling errors are non-fatal; keep last known state
    }
  }, [apiBaseUrl, token]);

  // Initial fetch + polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const markRead = async (notification: NotificationItem) => {
    if (!notification.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      try {
        await fetch(`${apiBaseUrl}/v1/notifications/${notification.id}/read`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });
      } catch {
        // Non-fatal; optimistic update stands
      }
    }
    setIsOpen(false);
    navigate(`/tickets/${notification.ticket_id}`);
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
    try {
      await fetch(`${apiBaseUrl}/v1/notifications/read-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
    } catch {
      // Non-fatal; optimistic update stands
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => {
          setIsOpen((open) => !open);
          if (!isOpen && notifications.length === 0) {
            setLoading(true);
            fetchNotifications().finally(() => setLoading(false));
          }
        }}
        className="relative rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <span className="text-sm font-bold text-zinc-900">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-zinc-400">Loading notifications...</p>
            )}

            {!loading && notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-zinc-400">No notifications yet.</p>
            )}

            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => markRead(notification)}
                className={cn(
                  'block w-full border-b border-zinc-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-zinc-50',
                  !notification.is_read && 'bg-blue-50/70'
                )}
              >
                <div className="flex items-start gap-2.5">
                  {!notification.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                  <div className="min-w-0">
                    <p className={cn('text-xs leading-relaxed', notification.is_read ? 'text-zinc-500' : 'font-semibold text-zinc-800')}>
                      {notification.message}
                    </p>
                    <p className="mt-0.5 text-[10px] text-zinc-400">{relativeTime(notification.created_at)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
