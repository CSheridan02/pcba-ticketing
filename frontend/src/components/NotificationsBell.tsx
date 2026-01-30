import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

type NotificationRow = {
  id: string;
  read_at: string | null;
  created_at: string;
  event?: {
    type: string;
    entity_type: string;
    entity_id: string;
    payload?: any;
    created_at: string;
  } | null;
};

function getWorkOrderIdFromNotification(n: NotificationRow): string | null {
  const p = (n.event as any)?.payload;
  return p?.work_order_id ?? (n.event?.entity_type === 'work_order' ? n.event.entity_id : null);
}

function getNotificationTitle(n: NotificationRow): string {
  const type = n.event?.type ?? 'notification';
  const p = (n.event as any)?.payload ?? {};

  if (type === 'ticket.comment_added') return 'New comment on ticket';
  if (type === 'ticket.status_changed') return 'Ticket status changed';
  if (type === 'ticket.created') return 'New ticket created';

  if (type === 'quality_ticket.comment_added') return 'New comment on quality ticket';
  if (type === 'quality_ticket.status_changed') return 'Quality ticket status changed';
  if (type === 'quality_ticket.created') return 'New quality ticket created';

  if (type === 'rework.review_requested') return `Rework requested review${p?.serial_number ? ` (${p.serial_number})` : ''}`;
  if (type === 'quality.reviewed') return `Quality reviewed${p?.serial_number ? ` (${p.serial_number})` : ''}`;

  if (type === 'work_order.quality_result_changed') return 'Work order quality result changed';
  if (type === 'work_order.status_changed') return 'Work order status changed';
  if (type === 'work_order.updated') return 'Work order updated';

  return type;
}

function getNotificationSubtitle(n: NotificationRow): string | null {
  const p = (n.event as any)?.payload ?? {};
  if (p?.ticket_number) return `Ticket ${p.ticket_number}`;
  if (p?.quality_ticket_number) return `Quality Ticket ${p.quality_ticket_number}`;
  if (p?.serial_number) return `Serial ${p.serial_number}`;
  return null;
}

export function NotificationsBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', { unreadOnly: false, limit: 25 }],
    queryFn: () => api.getNotifications({ unreadOnly: false, limit: 25 }),
    refetchInterval: 15000,
  });

  const unreadCount = useMemo(
    () => (notifications as NotificationRow[]).filter((n) => !n.read_at).length,
    [notifications],
  );

  const markRead = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleClickNotification = async (n: NotificationRow) => {
    // Mark read first (best-effort)
    if (!n.read_at) {
      try {
        await markRead.mutateAsync(n.id);
      } catch {
        // ignore
      }
    }

    const workOrderId = getWorkOrderIdFromNotification(n);
    if (workOrderId) {
      navigate(`/work-orders/${workOrderId}`);
    }

    setOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <span className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </span>
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] rounded-md border bg-white shadow-lg z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="text-sm font-medium">Notifications</div>
            <button
              className="text-xs text-gray-600 hover:text-gray-900"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-auto">
            {(notifications as NotificationRow[]).length === 0 ? (
              <div className="px-3 py-6 text-sm text-gray-500">No notifications yet.</div>
            ) : (
              (notifications as NotificationRow[]).map((n) => (
                <button
                  key={n.id}
                  className={`w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-gray-50 ${
                    n.read_at ? '' : 'bg-blue-50/40'
                  }`}
                  onClick={() => handleClickNotification(n)}
                >
                  <div className="text-sm font-medium">
                    {getNotificationTitle(n)}
                  </div>
                  <div className="text-xs text-gray-600">
                    {getNotificationSubtitle(n)}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}


