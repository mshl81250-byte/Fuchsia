import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Building2, CalendarDays, ChevronLeft, CircleDollarSign, Phone, RefreshCw, ShieldOff, UserRoundCheck, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type OwnerRequest = {
  id: number;
  userId: number;
  businessName: string;
  contactPhone: string;
  status: "pending" | "active" | "suspended";
  venueAccess: boolean;
  createdAt: string;
};

type OwnerDetails = {
  owner: OwnerRequest & { updatedAt: string };
  stats: { venues: number; totalBookings: number; confirmedBookings: number; pendingBookings: number; totalRevenue: number };
  venues: Array<{ id: number; nameAr: string; city: string; address: string; isPublished: boolean; totalBookings: number; confirmedBookings: number; pendingBookings: number; totalRevenue: number; upcomingBookings: number }>;
  bookings: Array<{ id: number; venueName: string | null; customerName: string; customerPhone: string; reservationAt: string; bookingDays: number; status: string; totalAmount: number; paymentStatus: string; audience: string }>;
};

const statusLabel: Record<OwnerRequest["status"], string> = {
  pending: "بانتظار الاعتماد",
  active: "معتمد",
  suspended: "موقوف",
};
const bookingLabel: Record<string, string> = { pending: "قيد المراجعة", confirmed: "مؤكد", completed: "مكتمل", rejected: "مرفوض", cancelled: "ملغى" };
const money = (value: number) => `${Number(value || 0).toLocaleString("ar-YE")} ر.ي`;
const emptyCreateForm = { fullName: "", email: "", password: "", phone: "", businessName: "", venueName: "", city: "", address: "", capacity: "", dailyPrice: "", primaryImageUrl: "", description: "" };
export function VenueOwnersView() {
  const [owners, setOwners] = useState<OwnerRequest[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OwnerDetails | null>(null);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createBusy, setCreateBusy] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; temporaryPassword: string; venueId: number } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/venue-owners", { credentials: "include", cache: "no-store" });
    if (!response.ok) throw new Error("تعذر تحميل طلبات الشراكة");
    setOwners(await response.json());
  }, []);

  const openDetails = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/venue-owners/${id}/details`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("تعذر تحميل تفاصيل الشريك");
      setSelected(await response.json());
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحميل التفاصيل"); }
  };

  useEffect(() => {
    void load().catch((error) => toast.error(error instanceof Error ? error.message : "حدث خطأ"))
      .finally(() => setLoading(false));
  }, [load]);

  const setStatus = async (id: number, status: OwnerRequest["status"]) => {
    setBusy(id);
    try {
      const response = await fetch(`/api/admin/venue-owners/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("تعذر تحديث اعتماد الشريك");
      await load();
      toast.success(status === "active" ? "تم اعتماد الشريك وتفعيل إدارة القاعات" : status === "suspended" ? "تم إيقاف الشريك وتعطيل إدارة القاعات" : "تم تحديث الحالة");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ");
    } finally {
      setBusy(null);
    }
  };
  const updateCreateForm = (key: keyof typeof emptyCreateForm, value: string) => setCreateForm((form) => ({ ...form, [key]: value }));
  const createVenueOwner = async () => {
    setCreateBusy(true);
    try {
      const response = await fetch("/api/admin/venue-owner-accounts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...createForm, capacity: Number(createForm.capacity), dailyPrice: Number(createForm.dailyPrice) }),
      });
      const payload = await response.json() as { error?: string; username?: string; temporaryPassword?: string; venueId?: number };
      if (!response.ok || !payload.username || !payload.temporaryPassword || !payload.venueId) throw new Error(payload.error || "تعذر إنشاء الحساب");
      setCreatedCredentials({ username: payload.username, temporaryPassword: payload.temporaryPassword, venueId: payload.venueId });
      setCreateForm(emptyCreateForm);
      await load();
      toast.success("تم إنشاء حساب مالك القاعة وتفعيل دخوله لتطبيق الأعمال");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إنشاء الحساب");
    } finally {
      setCreateBusy(false);
    }
  };

  return <div className="space-y-6">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-2xl font-bold">أصحاب القاعات</h2><p className="text-muted-foreground">اعتماد مالك القاعة يفعّل إدارة القاعات في Fuchsia Booking بشكل مستقل عن صلاحيات المتجر.</p></div>
      <Button variant="outline" onClick={() => void load()} disabled={loading} className="gap-2"><RefreshCw className="h-4 w-4" /> تحديث</Button>
    </div>
    <Card>
      <CardHeader><CardTitle>إضافة مالك قاعة وحساب تطبيق الأعمال</CardTitle><p className="text-sm text-muted-foreground">ينشئ الحساب كمالك قاعة معتمد، ويربط به القاعة مباشرة. احفظ بيانات الدخول للمالك بعد الإنشاء.</p></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {([ ["fullName", "اسم المالك"], ["businessName", "اسم النشاط"], ["phone", "رقم الهاتف"], ["email", "البريد أو اسم المستخدم"], ["password", "كلمة المرور (8 أحرف على الأقل)"], ["venueName", "اسم القاعة"], ["city", "المدينة"], ["address", "العنوان"], ["capacity", "السعة"], ["dailyPrice", "السعر اليومي"], ["primaryImageUrl", "رابط صورة القاعة"] ] as Array<[keyof typeof emptyCreateForm, string]>).map(([key, label]) => <div className="space-y-2" key={key}><Label>{label}</Label><Input type={key === "password" ? "password" : key === "capacity" || key === "dailyPrice" ? "number" : key === "email" ? "text" : "text"} value={createForm[key]} onChange={(event) => updateCreateForm(key, event.target.value)} /></div>)}
        </div>
        <div className="space-y-2"><Label>وصف القاعة (اختياري)</Label><Input value={createForm.description} onChange={(event) => updateCreateForm("description", event.target.value)} /></div>
        <div className="flex justify-end"><Button onClick={() => void createVenueOwner()} disabled={createBusy || !createForm.fullName || !createForm.email || createForm.password.length < 8 || !createForm.businessName || !createForm.venueName || !createForm.city || !createForm.address || !createForm.capacity || !createForm.dailyPrice || !createForm.primaryImageUrl}>{createBusy ? "جارٍ الإنشاء…" : "إنشاء الحساب والقاعة"}</Button></div>
        {createdCredentials && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><p className="font-bold">تم الإنشاء — أرسل هذه البيانات للمالك مرة واحدة:</p><p className="mt-2">اسم المستخدم: <b dir="ltr">{createdCredentials.username}</b></p><p>كلمة المرور المؤقتة: <b dir="ltr">{createdCredentials.temporaryPassword}</b></p><p>معرف القاعة: <b>{createdCredentials.venueId}</b></p><p className="mt-2 text-xs">لا تظهر كلمة المرور مرة أخرى بعد مغادرة الصفحة.</p></div>}
      </CardContent>
    </Card>
    <div className="grid gap-4">
      {owners.map((owner) => <Card key={owner.id} className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md" onClick={() => void openDetails(owner.id)}><CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2"><Building2 className="h-5 w-5 text-primary" /><h3 className="font-bold text-lg">{owner.businessName}</h3><Badge variant={owner.status === "active" ? "default" : "secondary"}>{statusLabel[owner.status]}</Badge><Badge variant={owner.venueAccess ? "outline" : "secondary"}>{owner.venueAccess ? "إدارة القاعات مفعلة" : "إدارة القاعات غير مفعلة"}</Badge></div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1"><Phone className="h-4 w-4" />{owner.contactPhone}</span><span>حساب المستخدم #{owner.userId}</span><span>{new Date(owner.createdAt).toLocaleDateString("ar-YE")}</span></div>
        </div>
        <div className="flex items-center gap-2"><div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
          {owner.status !== "active" && <Button disabled={busy === owner.id} onClick={() => void setStatus(owner.id, "active")} className="gap-2"><UserRoundCheck className="h-4 w-4" /> اعتماد</Button>}
          {owner.status === "active" && <Button disabled={busy === owner.id} variant="outline" onClick={() => void setStatus(owner.id, "suspended")} className="gap-2 text-red-700"><ShieldOff className="h-4 w-4" /> إيقاف</Button>}
          {owner.status === "suspended" && <Badge variant="outline" className="gap-1"><BadgeCheck className="h-4 w-4" /> يمكن إعادة الاعتماد</Badge>}
        </div><ChevronLeft className="h-5 w-5 text-slate-300" /></div>
      </CardContent></Card>)}
      {!loading && owners.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد طلبات شراكة بعد.</CardContent></Card>}
    </div>
    {selected && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30" onClick={() => setSelected(null)}><aside className="h-full w-full max-w-3xl overflow-y-auto bg-[#f8f9fc] p-5 shadow-2xl md:p-8" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-sm font-bold text-fuchsia-700">ملف الشريك #{selected.owner.id}</p><h3 className="mt-1 text-2xl font-black">{selected.owner.businessName}</h3><p className="mt-2 text-sm text-slate-500">{selected.owner.contactPhone} · {statusLabel[selected.owner.status]}</p></div><Button variant="ghost" size="icon" onClick={() => setSelected(null)}><X className="h-5 w-5" /></Button></div><div className="mt-6 grid gap-3 sm:grid-cols-4"><Card><CardContent className="p-4"><Building2 className="h-4 w-4 text-fuchsia-700" /><p className="mt-2 text-xs text-slate-500">القاعات</p><p className="text-2xl font-black">{selected.stats.venues}</p></CardContent></Card><Card><CardContent className="p-4"><CalendarDays className="h-4 w-4 text-sky-600" /><p className="mt-2 text-xs text-slate-500">الحجوزات</p><p className="text-2xl font-black">{selected.stats.totalBookings}</p></CardContent></Card><Card><CardContent className="p-4"><Users className="h-4 w-4 text-amber-600" /><p className="mt-2 text-xs text-slate-500">المؤكدة</p><p className="text-2xl font-black">{selected.stats.confirmedBookings}</p></CardContent></Card><Card><CardContent className="p-4"><CircleDollarSign className="h-4 w-4 text-emerald-600" /><p className="mt-2 text-xs text-slate-500">الإيرادات</p><p className="text-lg font-black">{money(selected.stats.totalRevenue)}</p></CardContent></Card></div><Card className="mt-6"><CardHeader><CardTitle>القاعات التابعة للشريك</CardTitle></CardHeader><CardContent className="space-y-3">{selected.venues.map((venue) => <div key={venue.id} className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{venue.nameAr}</p><p className="mt-1 text-xs text-slate-500">{venue.city} · {venue.address}</p></div><Badge variant={venue.isPublished ? "default" : "secondary"}>{venue.isPublished ? "منشورة" : "مسودة"}</Badge></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-4"><span>الحجوزات: <b className="text-slate-900">{venue.totalBookings}</b></span><span>المؤكدة: <b className="text-slate-900">{venue.confirmedBookings}</b></span><span>القادمة: <b className="text-slate-900">{venue.upcomingBookings}</b></span><span>الإيراد: <b className="text-slate-900">{money(venue.totalRevenue)}</b></span></div></div>)}{selected.venues.length === 0 && <p className="py-5 text-center text-sm text-slate-400">لم تتم إضافة قاعات لهذا الشريك بعد.</p>}</CardContent></Card><Card className="mt-6"><CardHeader><CardTitle>آخر حجوزات الشريك</CardTitle></CardHeader><CardContent className="space-y-3">{selected.bookings.slice(0, 12).map((booking) => <div key={booking.id} className="flex items-center justify-between gap-3 border-t pt-3 first:border-0"><div><p className="font-bold">{booking.venueName || "قاعة"} · {booking.customerName}</p><p className="mt-1 text-xs text-slate-500">{new Date(booking.reservationAt).toLocaleDateString("ar-YE")} · {booking.bookingDays} يوم · {money(booking.totalAmount)}</p></div><Badge>{bookingLabel[booking.status] || booking.status}</Badge></div>)}{selected.bookings.length === 0 && <p className="py-5 text-center text-sm text-slate-400">لا توجد حجوزات حتى الآن.</p>}</CardContent></Card></aside></div>}
  </div>;
}
