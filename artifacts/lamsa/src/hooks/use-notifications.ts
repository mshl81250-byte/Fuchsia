import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "./use-session";

export type CustomerNotification = {
  id: number;
  orderId: number | null;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export function useNotifications() {
  const { sessionId, isReady } = useSession();
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await fetch(`/api/notifications?sessionId=${encodeURIComponent(sessionId)}`);
      if (response.ok) setNotifications(await response.json());
    } catch {
      // Notification polling is intentionally non-blocking for shopping.
    }
  }, [sessionId]);

  useEffect(() => {
    if (!isReady) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [isReady, refresh]);

  const markRead = useCallback(async (id: number) => {
    if (!sessionId) return;
    setNotifications(current => current.map(item => item.id === id ? { ...item, isRead: true } : item));
    await fetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => undefined);
  }, [sessionId]);

  const markAllRead = useCallback(async () => {
    if (!sessionId) return;
    setNotifications(current => current.map(item => ({ ...item, isRead: true })));
    await fetch("/api/notifications/read-all", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => undefined);
  }, [sessionId]);

  return { notifications, unreadCount: useMemo(() => notifications.filter(item => !item.isRead).length, [notifications]), refresh, markRead, markAllRead };
}
