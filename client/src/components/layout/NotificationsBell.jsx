import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../api/notifications';
import { useToast } from '../ui/Toast';
import { formatEAT } from '../../lib/datetime';

const POLL_MS = 30000;

export default function NotificationsBell() {
  const navigate = useNavigate();
  const { show } = useToast();

  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const lastSeenId = useRef(0);
  const initialized = useRef(false);
  const wrapRef = useRef(null);

  const poll = useCallback(async () => {
    try {
      const res = await getNotifications(20);
      const list = res.data.notifications;
      setItems(list);
      setUnread(res.data.unread);

      const maxId = list.reduce((m, n) => Math.max(m, n.id), 0);
      if (initialized.current) {
        // Toast any genuinely new notifications since the last poll.
        const fresh = list.filter((n) => n.id > lastSeenId.current);
        fresh.slice(0, 3).forEach((n) => show(n.title, 'info'));
      }
      lastSeenId.current = Math.max(lastSeenId.current, maxId);
      initialized.current = true;
    } catch {
      /* ignore poll errors (e.g. transient network) */
    }
  }, [show]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  // Close dropdown on outside click.
  useEffect(() => {
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function handleOpen(item) {
    if (!item.is_read) {
      try {
        await markNotificationRead(item.id);
        setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)));
        setUnread((u) => Math.max(0, u - 1));
      } catch {
        /* noop */
      }
    }
    setOpen(false);
    if (item.link) navigate(item.link);
  }

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {
      /* noop */
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-subtle hover:bg-hover hover:text-ink"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#dc2626] px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-display text-sm font-semibold text-ink">Notifications</span>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-subtle">No notifications yet</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleOpen(n)}
                  className={`flex w-full flex-col items-start gap-0.5 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-hover ${
                    n.is_read ? '' : 'bg-accentSoft'
                  }`}
                >
                  <span className="flex w-full items-center gap-2">
                    {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                    <span className="text-sm font-medium text-ink">{n.title}</span>
                  </span>
                  {n.body && <span className="text-xs text-subtle">{n.body}</span>}
                  <span className="text-[11px] text-subtle">{formatEAT(n.created_at)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
