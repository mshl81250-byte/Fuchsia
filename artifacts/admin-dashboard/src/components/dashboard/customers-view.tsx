import { useEffect, useState } from "react";
import { Award, CalendarDays, ChevronLeft, Clock3, Mail, Package, Phone, Search, UserRound, X } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Customer = { id: number; fullName: string; email: string; phone: string | null; isGuest: boolean; rewardPoints: number; createdAt: string };
type CustomerDetail = { user: Customer & { totalSpent: number; tier: string; address: string | null }; orders: Array<{ id: number; status: string; total: number; createdAt: string; paymentStatus: string | null }>; bookings: Array<{ id: number; venueName: string | null; status: string; reservationAt: string; paymentStatus: string | null }>; orderEvents: Array<{ id: number; orderId: number; status: string; message: string; createdAt: string }>; notifications: Array<{ id: number; title: string; message: string; isRead: boolean; createdAt: string }> };

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("تعذر تحميل البيانات");
  return response.json() as Promise<T>;
}

const statusLabels: Record<string, string> = { received: "جديد", preparing: "قيد التجهيز", delivering: "في الطريق", delivered: "تم التوصيل", cancelled: "ملغى", pending: "قيد المراجعة", confirmed: "مؤكد", completed: "مكتمل", rejected: "مرفوض" };

function CustomerStatus({ value }: { value: string }) {
  const good = ["delivered", "confirmed", "completed"].includes(value);
  const bad = ["cancelled", "rejected"].includes(value);
  return <Badge variant="outline" className={good ? "border-emerald-200 bg-emerald-50 text-emerald-700" : bad ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{statusLabels[value] ?? value}</Badge>;
}

export function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async (search = query) => {
    setLoading(true);
    try { setCustomers(await request<Customer[]>(`/api/admin/users?limit=200${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""}`)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحميل العملاء"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(""); }, []);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    try { setSelected(await request<CustomerDetail>(`/api/admin/users/${id}`)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحميل تفاصيل العميل"); }
    finally { setDetailLoading(false); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-bold text-fuchsia-700">تطبيق العملاء</p><h2 className="mt-1 text-3xl font-black tracking-tight">العملاء وحركة الحسابات</h2><p className="mt-2 text-sm text-slate-500">ابحث في الحسابات وافتح الطلبات والحجوزات والإشعارات المرتبطة بكل عميل.</p></div><form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void load(); }}><div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="اسم، بريد أو هاتف" className="h-11 w-64 rounded-xl bg-white pr-9" /></div><Button type="submit" className="h-11 rounded-xl">بحث</Button></form></div>
    <div className="grid gap-4 sm:grid-cols-3"><Card className="border-0 shadow-sm"><CardContent className="p-5"><p className="text-sm text-slate-500">نتائج البحث</p><p className="mt-2 text-3xl font-black">{customers.length}</p></CardContent></Card><Card className="border-0 shadow-sm"><CardContent className="p-5"><p className="text-sm text-slate-500">حسابات مسجلة</p><p className="mt-2 text-3xl font-black text-emerald-600">{customers.filter((customer) => !customer.isGuest).length}</p></CardContent></Card><Card className="border-0 shadow-sm"><CardContent className="p-5"><p className="text-sm text-slate-500">زوار</p><p className="mt-2 text-3xl font-black text-slate-500">{customers.filter((customer) => customer.isGuest).length}</p></CardContent></Card></div>
    <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-black/[0.04]"><CardHeader><CardTitle>قائمة العملاء</CardTitle></CardHeader><CardContent className="p-0">{loading ? <div className="space-y-3 p-6"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : <div className="overflow-x-auto"><Table dir="rtl"><TableHeader><TableRow><TableHead className="text-right">العميل</TableHead><TableHead className="text-right">التواصل</TableHead><TableHead className="text-right">الحساب</TableHead><TableHead className="text-right">النقاط</TableHead><TableHead className="text-right">الانضمام</TableHead><TableHead /></TableRow></TableHeader><TableBody>{customers.map((customer) => <TableRow key={customer.id} className="cursor-pointer hover:bg-fuchsia-50/40" onClick={() => void openDetail(customer.id)}><TableCell className="font-bold">{customer.fullName || "بدون اسم"}</TableCell><TableCell><div className="space-y-1 text-xs text-slate-500">{customer.email && <div className="flex items-center gap-1" dir="ltr"><Mail className="h-3 w-3" />{customer.email}</div>}{customer.phone && <div className="flex items-center gap-1" dir="ltr"><Phone className="h-3 w-3" />{customer.phone}</div>}</div></TableCell><TableCell><Badge variant={customer.isGuest ? "secondary" : "outline"}>{customer.isGuest ? "زائر" : "مسجل"}</Badge></TableCell><TableCell><span className="flex items-center gap-1 font-bold"><Award className="h-4 w-4 text-amber-500" />{customer.rewardPoints || 0}</span></TableCell><TableCell className="text-sm text-slate-500"><span className="flex items-center gap-1"><Clock3 className="h-4 w-4" />{format(new Date(customer.createdAt), "dd MMM yyyy", { locale: ar })}</span></TableCell><TableCell><ChevronLeft className="h-5 w-5 text-slate-300" /></TableCell></TableRow>)}</TableBody></Table>{customers.length === 0 && <div className="p-12 text-center text-sm text-slate-400">لا توجد نتائج مطابقة</div>}</div>}</CardContent></Card>
    {detailLoading && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30"><Card className="p-8"><p className="font-bold">جارٍ تحميل ملف العميل…</p></Card></div>}
    {selected && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30" onClick={() => setSelected(null)}><aside className="h-full w-full max-w-2xl overflow-y-auto bg-[#f8f9fc] p-5 shadow-2xl md:p-8" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-sm font-bold text-fuchsia-700">ملف العميل #{selected.user.id}</p><h3 className="mt-1 text-2xl font-black">{selected.user.fullName}</h3></div><Button variant="ghost" size="icon" onClick={() => setSelected(null)}><X className="h-5 w-5" /></Button></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><Card className="border-0 shadow-sm"><CardContent className="p-4"><UserRound className="h-4 w-4 text-fuchsia-700" /><p className="mt-2 text-xs text-slate-500">المستوى</p><p className="font-black">{selected.user.tier}</p></CardContent></Card><Card className="border-0 shadow-sm"><CardContent className="p-4"><Award className="h-4 w-4 text-amber-500" /><p className="mt-2 text-xs text-slate-500">النقاط</p><p className="font-black">{selected.user.rewardPoints}</p></CardContent></Card><Card className="border-0 shadow-sm"><CardContent className="p-4"><Package className="h-4 w-4 text-emerald-600" /><p className="mt-2 text-xs text-slate-500">إجمالي الإنفاق</p><p className="font-black">{Number(selected.user.totalSpent || 0).toLocaleString("ar-YE")} ر.ي</p></CardContent></Card></div><div className="mt-6 space-y-5"><Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">بيانات التواصل</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{selected.user.email && <p className="flex items-center gap-2" dir="ltr"><Mail className="h-4 w-4 text-slate-400" />{selected.user.email}</p>}{selected.user.phone && <p className="flex items-center gap-2" dir="ltr"><Phone className="h-4 w-4 text-slate-400" />{selected.user.phone}</p>}</CardContent></Card><Card className="border-0 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Package className="h-4 w-4" /> آخر الطلبات</CardTitle></CardHeader><CardContent className="space-y-3">{selected.orders.slice(0, 6).map((order) => <div key={order.id} className="flex items-center justify-between border-t pt-3 first:border-0"><div><p className="font-bold">طلب #{order.id}</p><p className="text-xs text-slate-500">{format(new Date(order.createdAt), "dd MMM yyyy", { locale: ar })} · {Number(order.total).toLocaleString("ar-YE")} ر.ي</p></div><CustomerStatus value={order.status} /></div>)}{selected.orders.length === 0 && <p className="text-sm text-slate-400">لا توجد طلبات</p>}</CardContent></Card><Card className="border-0 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4" /> حجوزات القاعات</CardTitle></CardHeader><CardContent className="space-y-3">{selected.bookings.slice(0, 6).map((booking) => <div key={booking.id} className="flex items-center justify-between border-t pt-3 first:border-0"><div><p className="font-bold">{booking.venueName || "قاعة"}</p><p className="text-xs text-slate-500">{format(new Date(booking.reservationAt), "dd MMM yyyy", { locale: ar })}</p></div><CustomerStatus value={booking.status} /></div>)}{selected.bookings.length === 0 && <p className="text-sm text-slate-400">لا توجد حجوزات</p>}</CardContent></Card></div></aside></div>}
  </div>;
}
