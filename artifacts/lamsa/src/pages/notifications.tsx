import { Link } from "wouter";
import { Bell, CheckCheck, CreditCard, Package, Truck, XCircle, ChevronLeft } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { toArabicNumerals } from "@/lib/format";

const typeIcon: Record<string, typeof Bell> = {
  order_status: Truck,
  payment_verified: CreditCard,
  payment_rejected: XCircle,
  order_received: Package,
};

export default function Notifications() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3"><div className="relative"><Bell className="w-8 h-8 text-primary" />{unreadCount > 0 && <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">{toArabicNumerals(unreadCount)}</span>}</div><div><h1 className="text-3xl font-serif font-bold">الإشعارات</h1><p className="text-sm text-muted-foreground mt-1">آخر تحديثات طلباتك وعمليات الدفع</p></div></div>
        {unreadCount > 0 && <button type="button" onClick={() => void markAllRead()} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold text-muted-foreground hover:text-primary"><CheckCheck className="w-4 h-4" /> تحديد الكل كمقروء</button>}
      </div>
      {notifications.length === 0 ? <div className="bg-card border border-border rounded-2xl p-12 text-center"><Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><h2 className="text-xl font-bold mb-2">لا توجد إشعارات بعد</h2><p className="text-muted-foreground">سنخبرك عند استلام طلبك أو تحديث حالته أو مراجعة الدفع.</p></div> : <div className="space-y-3">{notifications.map(notification => { const Icon = typeIcon[notification.type] ?? Bell; return <div key={notification.id} onClick={() => !notification.isRead && void markRead(notification.id)} className={`rounded-2xl border p-4 transition-colors cursor-pointer ${notification.isRead ? "bg-card border-border" : "bg-primary/5 border-primary/20"}`}><div className="flex items-start gap-3"><div className={`rounded-xl p-3 ${notification.isRead ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}><Icon className="w-5 h-5" /></div><div className="flex-1 min-w-0"><div className="flex items-start justify-between gap-3"><h3 className="font-bold">{notification.title}</h3>{!notification.isRead && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}</div><p className="text-sm text-muted-foreground mt-1 leading-relaxed">{notification.message}</p><p className="text-xs text-muted-foreground mt-3" dir="ltr">{new Date(notification.createdAt).toLocaleString("ar-YE", { dateStyle: "medium", timeStyle: "short" })}</p>{notification.orderId && <Link href={`/order/${notification.orderId}`} onClick={() => void markRead(notification.id)} className="inline-flex items-center gap-1 text-sm font-bold text-primary mt-2 hover:underline">عرض الطلب <ChevronLeft className="w-4 h-4" /></Link>}</div></div></div> })}</div>}
    </div>
  );
}
