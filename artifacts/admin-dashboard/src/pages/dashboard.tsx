import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetDashboardStatsQueryKey, useGetDashboardStats } from "@workspace/api-client-react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { OrdersView } from "@/components/dashboard/orders-view";
import { RentalsView } from "@/components/dashboard/rentals-view";
import { VenueReservationsView } from "@/components/dashboard/venue-reservations-view";
import { VenueOwnersView } from "@/components/dashboard/venue-owners-view";
import { StoreOwnersView } from "@/components/dashboard/store-owners-view";
import { CustomersView } from "@/components/dashboard/customers-view";
import { CouponsView } from "@/components/dashboard/coupons-view";
import { ContentManagementView } from "@/components/dashboard/content-management-view";

type Tab =
  | "command"
  | "orders"
  | "rentals"
  | "venue-reservations"
  | "venue-owners"
  | "store-owners"
  | "customers"
  | "catalog"
  | "coupons";

type PartnerOwner = { id: number; status: string; businessName: string; createdAt: string };
type StoreOwnerLink = { id: number; nameAr: string; ownerUserId: number | null; ownerName: string | null };
type Reservation = { id: number; status: string; venueName: string | null; customerName: string | null; reservationAt: string };
type AdminFeed = { partnerOwners: PartnerOwner[]; storeOwners: StoreOwnerLink[]; reservations: Reservation[] };

const TAB_ROUTES: Record<Tab, string> = {
  command: "/",
  orders: "/orders",
  rentals: "/rentals",
  "venue-reservations": "/venue-reservations",
  "venue-owners": "/venue-owners",
  "store-owners": "/store-owners",
  customers: "/customers",
  catalog: "/products",
  coupons: "/coupons",
};

const ROUTE_TABS: Record<string, Tab> = Object.fromEntries(
  Object.entries(TAB_ROUTES).map(([tab, route]) => [route, tab]),
) as Record<string, Tab>;

const NAV_ITEMS: Array<{ id: Tab; label: string; hint: string; icon: typeof LayoutDashboard }> = [
  { id: "command", label: "مركز التشغيل", hint: "صورة حية للمنصة", icon: LayoutDashboard },
  { id: "orders", label: "طلبات العملاء", hint: "التجارة والتوصيل", icon: ShoppingBag },
  { id: "rentals", label: "طلبات التأجير", hint: "دورة الشريك", icon: Package },
  { id: "venue-reservations", label: "حجوزات القاعات", hint: "من العميل إلى الشريك", icon: CalendarDays },
  { id: "venue-owners", label: "اعتماد الشركاء", hint: "أصحاب القاعات", icon: Building2 },
  { id: "store-owners", label: "ملاك المتاجر", hint: "ربط المتجر بالحساب", icon: Store },
  { id: "customers", label: "العملاء", hint: "الحسابات والنشاط", icon: Users },
  { id: "catalog", label: "الكتالوج", hint: "منتجات ومتاجر وتصنيفات", icon: BarChart3 },
  { id: "coupons", label: "التسويق", hint: "كوبونات وبنرات", icon: Bell },
];

async function getAdminJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error(`admin request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

function formatCurrency(value: number): string {
  return `${Number(value || 0).toLocaleString("ar-YE")} ر.ي`;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "قيد المراجعة",
    received: "جديد",
    confirmed: "مؤكد",
    active: "نشط",
    rejected: "مرفوض",
    suspended: "موقوف",
    completed: "مكتمل",
  };
  return labels[status] ?? status;
}

function StatusPill({ status }: { status: string }) {
  const positive = ["active", "confirmed", "completed"].includes(status);
  const negative = ["rejected", "suspended"].includes(status);
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
      positive && "bg-emerald-100 text-emerald-700",
      negative && "bg-rose-100 text-rose-700",
      !positive && !negative && "bg-amber-100 text-amber-700",
    )}>
      {positive ? <CheckCircle2 className="h-3.5 w-3.5" /> : negative ? <XCircle className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
      {statusLabel(status)}
    </span>
  );
}

function MetricCard({ title, value, detail, icon: Icon, tone }: { title: string; value: string | number; detail: string; icon: typeof Users; tone: string }) {
  return (
    <Card className="relative overflow-hidden border-0 bg-white/90 shadow-sm ring-1 ring-black/[0.04]">
      <div className={cn("absolute inset-y-0 right-0 w-1", tone)} />
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{detail}</p>
        </div>
        <div className={cn("rounded-2xl p-3", tone.replace("bg-", "bg-") + "/10")}>
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </CardContent>
    </Card>
  );
}

function CommandCenter({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetDashboardStats({ query: { refetchInterval: 30000, queryKey: getGetDashboardStatsQueryKey() } });
  const [feed, setFeed] = useState<AdminFeed>({ partnerOwners: [], storeOwners: [], reservations: [] });
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);

  const loadFeed = async () => {
    setFeedLoading(true);
    setFeedError(false);
    try {
      const [partnerOwners, storeOwners, reservations] = await Promise.all([
        getAdminJson<PartnerOwner[]>("/api/admin/venue-owners"),
        getAdminJson<StoreOwnerLink[]>("/api/admin/store-owner-links"),
        getAdminJson<Reservation[]>("/api/admin/reservations"),
      ]);
      setFeed({ partnerOwners, storeOwners, reservations });
    } catch {
      setFeedError(true);
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => { void loadFeed(); }, []);

  const pendingPartners = feed.partnerOwners.filter((item) => item.status === "pending");
  const pendingReservations = feed.reservations.filter((item) => item.status === "pending");
  const unassignedStores = feed.storeOwners.filter((item) => !item.ownerUserId);
  const healthItems = [
    { label: "تطبيق العملاء", detail: `${stats?.totalUsers ?? 0} حساب مسجل`, ok: true },
    { label: "تطبيق الشركاء", detail: `${feed.partnerOwners.length} ملف شريك`, ok: !feedError },
    { label: "خدمة الطلبات", detail: `${stats?.totalOrders ?? 0} طلبًا في النظام`, ok: true },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl md:p-8">
        <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute -bottom-32 right-1/3 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-fuchsia-200"><Activity className="h-4 w-4" /> مركز تشغيل فوشيا</div>
            <h2 className="text-3xl font-black tracking-tight md:text-4xl">إدارة المنصة من شاشة واحدة</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">لوحة جديدة تربط نشاط تطبيق العملاء بتدفقات تطبيق الشركاء: الطلبات، الحجوزات، اعتماد الشركاء، والكتالوج.</p>
          </div>
          <Button variant="secondary" className="gap-2 self-start rounded-xl md:self-auto" onClick={() => { void refetchStats(); void loadFeed(); }}><RefreshCw className="h-4 w-4" /> تحديث البيانات</Button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="إيرادات الطلبات" value={statsLoading ? "…" : formatCurrency(stats?.totalRevenue ?? 0)} detail="من تطبيق العملاء" icon={CircleDollarSign} tone="bg-emerald-500" />
        <MetricCard title="طلبات بانتظار الإجراء" value={statsLoading ? "…" : (stats?.pendingOrders ?? 0)} detail="تحتاج متابعة فريق التشغيل" icon={ShoppingBag} tone="bg-amber-500" />
        <MetricCard title="طلبات اعتماد الشركاء" value={feedLoading ? "…" : pendingPartners.length} detail="من تطبيق الشركاء" icon={Building2} tone="bg-violet-500" />
        <MetricCard title="حجوزات تحتاج مراجعة" value={feedLoading ? "…" : pendingReservations.length} detail="قاعات ومناسبات" icon={CalendarDays} tone="bg-sky-500" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="border-0 shadow-sm ring-1 ring-black/[0.04]"><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-lg">آخر حجوزات القاعات</CardTitle><p className="mt-1 text-sm text-slate-500">تدفق مباشر من العميل إلى الشريك</p></div><Button variant="ghost" className="gap-1 text-fuchsia-700" onClick={() => onNavigate("venue-reservations")}>عرض الكل <ArrowLeft className="h-4 w-4" /></Button></CardHeader><CardContent>{feedLoading ? <div className="py-10 text-center text-sm text-slate-400">جارٍ تحميل بيانات الحجوزات…</div> : feed.reservations.slice(0, 5).map((reservation) => <div key={reservation.id} className="flex items-center justify-between gap-3 border-t py-4 first:border-0"><div className="min-w-0"><p className="truncate font-bold text-slate-800">{reservation.venueName || "قاعة غير مسماة"}</p><p className="mt-1 text-xs text-slate-500">{reservation.customerName || "عميل"} · {new Date(reservation.reservationAt).toLocaleDateString("ar-YE")}</p></div><StatusPill status={reservation.status} /></div>)}{!feedLoading && feed.reservations.length === 0 && <div className="py-10 text-center text-sm text-slate-400">لا توجد حجوزات حتى الآن</div>}</CardContent></Card>
        <Card className="border-0 shadow-sm ring-1 ring-black/[0.04]"><CardHeader><CardTitle className="text-lg">صحة التطبيقات والعمليات</CardTitle><p className="mt-1 text-sm text-slate-500">مؤشرات الاتصال بالمنظومة المشتركة</p></CardHeader><CardContent className="space-y-3">{healthItems.map((item) => <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><div><p className="font-bold text-slate-800">{item.label}</p><p className="mt-1 text-xs text-slate-500">{item.detail}</p></div><span className={cn("flex h-9 w-9 items-center justify-center rounded-full", item.ok ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600")}>{item.ok ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}</span></div>)}</CardContent></Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <ActionCard icon={Building2} title="اعتماد الشركاء" count={pendingPartners.length} description="طلبات أصحاب القاعات الجديدة" action="venue-owners" onNavigate={onNavigate} />
        <ActionCard icon={Store} title="ربط ملاك المتاجر" count={unassignedStores.length} description="متاجر تحتاج حساب شريك" action="store-owners" onNavigate={onNavigate} />
        <ActionCard icon={Users} title="نشاط العملاء" count={stats?.totalUsers ?? 0} description="إجمالي الحسابات المسجلة" action="customers" onNavigate={onNavigate} />
      </div>
    </div>
  );
}

function ActionCard({ icon: Icon, title, count, description, action, onNavigate }: { icon: typeof Users; title: string; count: number; description: string; action: Tab; onNavigate: (tab: Tab) => void }) {
  return <button className="group rounded-3xl border-0 bg-white p-5 text-right shadow-sm ring-1 ring-black/[0.04] transition hover:-translate-y-0.5 hover:shadow-lg" onClick={() => onNavigate(action)}><div className="flex items-start justify-between"><span className="rounded-2xl bg-fuchsia-50 p-3 text-fuchsia-700"><Icon className="h-5 w-5" /></span><ChevronLeft className="h-5 w-5 text-slate-300 transition group-hover:-translate-x-1 group-hover:text-fuchsia-600" /></div><p className="mt-5 text-lg font-black text-slate-900">{title}</p><p className="mt-1 text-sm text-slate-500">{description}</p><p className="mt-5 text-3xl font-black text-fuchsia-700">{count.toLocaleString("ar-YE")}</p></button>;
}

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const activeTab = ROUTE_TABS[location] ?? "command";
  const activeItem = NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0];

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/auth/me", { credentials: "include", cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error("unauthorized");
      if (mounted) setIsAuthenticated(true);
    }).catch(() => { if (mounted) setIsAuthenticated(false); });
    const handleUnauthorized = () => { queryClient.clear(); if (mounted) { setIsAuthenticated(false); toast.error("انتهت جلسة الإدارة. يرجى تسجيل الدخول مجددًا."); } };
    window.addEventListener("fuchsia-admin-unauthorized", handleUnauthorized);
    return () => { mounted = false; window.removeEventListener("fuchsia-admin-unauthorized", handleUnauthorized); };
  }, [queryClient]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const response = await fetch("/api/admin/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ email, password }) });
      if (!response.ok) throw new Error("invalid credentials");
      setIsAuthenticated(true); navigate("/"); toast.success("تم تسجيل الدخول إلى مركز التشغيل");
    } catch { toast.error("بيانات الدخول غير صحيحة"); }
  };

  const handleLogout = async () => { try { await fetch("/api/admin/auth/logout", { method: "POST", credentials: "include" }); } finally { queryClient.clear(); setIsAuthenticated(false); navigate("/"); } };
  const goTo = (tab: Tab) => { navigate(TAB_ROUTES[tab]); setIsSidebarOpen(false); };

  if (isAuthenticated === null) return <div className="min-h-[100dvh] bg-slate-950" />;
  if (!isAuthenticated) return <LoginScreen email={email} password={password} setEmail={setEmail} setPassword={setPassword} onSubmit={handleLogin} />;

  return <div className="min-h-[100dvh] bg-[#f6f7fb] text-slate-900" dir="rtl">
    {isSidebarOpen && <button aria-label="إغلاق القائمة" className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
    <aside className={cn("fixed inset-y-0 right-0 z-50 flex w-[292px] flex-col bg-slate-950 text-white transition-transform lg:static lg:translate-x-0", isSidebarOpen ? "translate-x-0" : "translate-x-full")}>
      <div className="border-b border-white/10 p-6"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-500 text-2xl font-black">ف</div><div><p className="text-lg font-black">فوشيا</p><p className="text-xs text-slate-400">مركز تشغيل المنصة</p></div></div><div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> متصل بتطبيقَي العملاء والشركاء</div></div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">{NAV_ITEMS.map((item) => { const Icon = item.icon; const selected = item.id === activeTab; return <button key={item.id} onClick={() => goTo(item.id)} className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-right transition", selected ? "bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-950/20" : "text-slate-300 hover:bg-white/10 hover:text-white")}><Icon className="h-5 w-5 shrink-0" /><span className="min-w-0"><span className="block text-sm font-bold">{item.label}</span><span className={cn("mt-0.5 block truncate text-[11px]", selected ? "text-fuchsia-100" : "text-slate-500")}>{item.hint}</span></span></button>; })}</nav>
      <div className="border-t border-white/10 p-4"><button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-rose-300 transition hover:bg-rose-400/10"><LogOut className="h-5 w-5" /> تسجيل الخروج</button></div>
    </aside>
    <main className="min-w-0 lg:mr-0"><header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 bg-[#f6f7fb]/90 px-4 backdrop-blur md:px-8"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(true)}><Menu className="h-6 w-6" /></Button><div><p className="text-xs font-bold text-fuchsia-700">FUCHSIA / CONTROL CENTER</p><h1 className="mt-1 text-xl font-black text-slate-900">{activeItem.label}</h1></div></div><div className="hidden items-center gap-3 sm:flex"><div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="h-10 w-52 rounded-xl border-0 bg-white pr-9 shadow-sm" placeholder="بحث سريع" /></div><button className="rounded-xl bg-white p-2.5 text-slate-500 shadow-sm hover:text-fuchsia-700"><Bell className="h-5 w-5" /></button><button className="rounded-xl bg-white p-2.5 text-slate-500 shadow-sm hover:text-fuchsia-700"><Settings2 className="h-5 w-5" /></button></div></header><div className="p-4 md:p-8"><div className="mx-auto max-w-[1500px]">{activeTab === "command" && <CommandCenter onNavigate={goTo} />}{activeTab === "orders" && <OrdersView />}{activeTab === "rentals" && <RentalsView />}{activeTab === "venue-reservations" && <VenueReservationsView />}{activeTab === "venue-owners" && <VenueOwnersView />}{activeTab === "store-owners" && <StoreOwnersView />}{activeTab === "customers" && <CustomersView />}{activeTab === "coupons" && <CouponsView />}{activeTab === "catalog" && <ContentManagementView section="products" />}</div></div></main>
  </div>;
}

function LoginScreen({ email, password, setEmail, setPassword, onSubmit }: { email: string; password: string; setEmail: (value: string) => void; setPassword: (value: string) => void; onSubmit: (event: FormEvent) => void }) {
  return <div className="flex min-h-[100dvh] items-center justify-center overflow-hidden bg-slate-950 p-4" dir="rtl"><div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl" /><div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" /><Card className="relative w-full max-w-md border-0 bg-white/95 shadow-2xl"><CardHeader className="space-y-4 p-8 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-3xl font-black text-fuchsia-400">ف</div><div><CardTitle className="text-2xl font-black text-slate-950">مركز تشغيل فوشيا</CardTitle><p className="mt-2 text-sm text-slate-500">إدارة تطبيق العملاء وتطبيق الشركاء</p></div></CardHeader><CardContent className="p-8 pt-0"><form onSubmit={onSubmit} className="space-y-5"><div className="space-y-2"><Label htmlFor="email">البريد الإلكتروني</Label><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 rounded-xl text-left" dir="ltr" required /></div><div className="space-y-2"><Label htmlFor="password">كلمة المرور</Label><Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 rounded-xl text-left" dir="ltr" required /></div><Button type="submit" className="h-12 w-full rounded-xl bg-slate-950 text-base font-black hover:bg-fuchsia-700"><ShieldCheck className="ml-2 h-5 w-5" /> دخول آمن</Button></form></CardContent></Card></div>;
}
