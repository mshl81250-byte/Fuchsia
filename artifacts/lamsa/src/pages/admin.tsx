import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetDashboardStats, getGetDashboardStatsQueryKey,
  useAdminListUsers, getAdminListUsersQueryKey,
  useAdminListOrders, getAdminListOrdersQueryKey,
  useAdminListCoupons, getAdminListCouponsQueryKey,
  useAdminCreateCoupon, useAdminUpdateOrderStatus, useAdminLogin, useAdminLogout,
} from "@workspace/api-client-react";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, ShoppingBag, Tag, LogOut,
  Package, TrendingUp, Phone, MapPin, CreditCard, FileText,
  ChevronDown, ChevronUp, RefreshCw, Clock, CheckCircle2,
  Truck, Star, Bell, X, Filter, Settings,
} from "lucide-react";
import { formatCurrency, toArabicNumerals } from "@/lib/format";

type Section = "overview" | "orders" | "users" | "coupons" | "wallets" | "notification-settings";
type StatusFilter = "all" | "received" | "preparing" | "delivering" | "delivered";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: typeof Clock; next?: string; nextLabel?: string }> = {
  received:   { label: "وصل جديد",      bg: "bg-blue-50",   text: "text-blue-700",   icon: Bell,         next: "preparing",  nextLabel: "ابدأ التجهيز" },
  preparing:  { label: "جاري التجهيز",  bg: "bg-amber-50",  text: "text-amber-700",  icon: Clock,        next: "delivering", nextLabel: "أرسل للتوصيل" },
  delivering: { label: "في الطريق",     bg: "bg-purple-50", text: "text-purple-700", icon: Truck,        next: "delivered",  nextLabel: "تم التسليم" },
  delivered:  { label: "تم التسليم",   bg: "bg-green-50",  text: "text-green-700",  icon: CheckCircle2 },
};

const PAYMENT_LABELS: Record<string, string> = {
  cash_on_delivery: "عند الاستلام", jaib: "محفظة جيب", flousy: "فلوسك",
  mobile_money: "موبايل موني", jawali: "جوالي", cash: "كاش",
  one_cash: "ون كاش", bank_transfer: "تحويل بنكي",
};

export default function Admin() {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("fuchsia_admin") || "");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [section, setSection] = useState<Section>("orders");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [couponForm, setCouponForm] = useState({ code: "", discountType: "percentage", discountValue: "" });
  const [walletForm, setWalletForm] = useState({ nameAr: "", nameEn: "", accountNumber: "", instructions: "", iconUrl: "" });
  const [adminWallets, setAdminWallets] = useState<any[]>([]);
  const [channelSettings, setChannelSettings] = useState<Record<string, any>>({});
  const [lastOrderCount, setLastOrderCount] = useState<number>(0);
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const prevOrderIds = useRef<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = !!adminToken;

  // Auto-refresh orders every 20 seconds
  const ordersQuery = useAdminListOrders({
    query: {
      enabled: isAdmin,
      queryKey: getAdminListOrdersQueryKey(),
      refetchInterval: 20_000,
    },
  });

  const statsQuery = useGetDashboardStats({ query: { enabled: isAdmin && section === "overview", queryKey: getGetDashboardStatsQueryKey() } });
  const usersQuery = useAdminListUsers({ query: { enabled: isAdmin && section === "users", queryKey: getAdminListUsersQueryKey() } });
  const couponsQuery = useAdminListCoupons({ query: { enabled: isAdmin && section === "coupons", queryKey: getAdminListCouponsQueryKey() } });
  const updateStatus = useAdminUpdateOrderStatus();
  const createCoupon = useAdminCreateCoupon();
  const adminLoginMutation = useAdminLogin();
  const adminLogoutMutation = useAdminLogout();

  // Detect new orders
  useEffect(() => {
    if (!ordersQuery.data) return;
    const ids = new Set(ordersQuery.data.map(o => o.id));
    if (prevOrderIds.current.size > 0) {
      const hasNew = ordersQuery.data.some(o => !prevOrderIds.current.has(o.id));
      if (hasNew) {
        setNewOrderAlert(true);
        toast({ title: "🛍️ طلب جديد!", description: "وصل طلب جديد من عميل", duration: 5000 });
      }
    }
    prevOrderIds.current = ids;
    setLastOrderCount(ordersQuery.data.length);
  }, [ordersQuery.data]);
  useEffect(() => {
    if (!isAdmin || (section !== "wallets" && section !== "notification-settings")) return;
    if (section === "wallets") fetch("/api/payment-wallets/all").then(r => r.ok ? r.json() : []).then(setAdminWallets).catch(() => undefined);
    fetch("/api/admin/notification-settings").then(r => r.ok ? r.json() : { settings: [], credentials: {} }).then((payload: any) => setChannelSettings({ ...Object.fromEntries((payload.settings ?? []).map((item: any) => [item.channel, item])), credentials: payload.credentials ?? {} })).catch(() => undefined);
  }, [isAdmin, section]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      await adminLoginMutation.mutateAsync({ data: { email: loginEmail, password: loginPassword } });
      localStorage.setItem("fuchsia_admin", "session");
      setAdminToken("session");
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "بيانات الدخول غير صحيحة" });
    }
  }

  async function handleStatusUpdate(orderId: number, newStatus: string) {
    try {
      await updateStatus.mutateAsync({ id: orderId, data: { status: newStatus as any } });
      queryClient.invalidateQueries({ queryKey: getAdminListOrdersQueryKey() });
      const cfg = STATUS_CONFIG[newStatus];
      toast({ title: "تم التحديث ✓", description: `الطلب #${orderId} — ${cfg?.label}` });
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "لم يتم التحديث" });
    }
  }

  async function handleCreateCoupon(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createCoupon.mutateAsync({ data: { code: couponForm.code.toUpperCase(), discountType: couponForm.discountType, discountValue: parseFloat(couponForm.discountValue) } });
      toast({ title: "تم", description: "تم إنشاء الكوبون" });
      queryClient.invalidateQueries();
      setCouponForm({ code: "", discountType: "percentage", discountValue: "" });
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ" });
    }
  }

  async function handleCreateWallet(e: React.FormEvent) {
    e.preventDefault();
    try {
      const response = await fetch("/api/payment-wallets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...walletForm, sortOrder: adminWallets.length + 1 }) });
      if (!response.ok) throw new Error();
      const wallet = await response.json();
      setAdminWallets(current => [...current, wallet]);
      setWalletForm({ nameAr: "", nameEn: "", accountNumber: "", instructions: "", iconUrl: "" });
      toast({ title: "تمت الإضافة", description: "تمت إضافة المحفظة إلى خيارات الدفع" });
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "تعذر إضافة المحفظة" });
    }
  }
  async function handleWalletPatch(id: number, changes: Record<string, unknown>) {
    try {
      const response = await fetch(`/api/payment-wallets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) });
      if (!response.ok) throw new Error();
      const updated = await response.json();
      setAdminWallets(current => current.map(wallet => wallet.id === id ? updated : wallet).sort((a, b) => a.sortOrder - b.sortOrder));
      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات المحفظة" });
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "تعذر تحديث المحفظة" });
    }
  }
  function handleEditWallet(wallet: any) {
    const nameAr = window.prompt("اسم المحفظة", wallet.nameAr);
    if (!nameAr?.trim()) return;
    const accountNumber = window.prompt("رقم الحساب أو نقطة البيع", wallet.accountNumber);
    if (!accountNumber?.trim()) return;
    const instructions = window.prompt("تعليمات الدفع", wallet.instructions ?? "") ?? "";
    const iconUrl = window.prompt("رابط أيقونة المحفظة", wallet.iconUrl ?? "") ?? "";
    void handleWalletPatch(wallet.id, { nameAr: nameAr.trim(), accountNumber: accountNumber.trim(), instructions: instructions.trim() || null, iconUrl: iconUrl.trim() || null });
  }
  async function handlePaymentReview(orderId: number, status: "verified" | "rejected") {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/payment`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!response.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: getAdminListOrdersQueryKey() });
      toast({ title: status === "verified" ? "تم اعتماد الدفع" : "تم رفض الإيصال", description: `تم تحديث حالة الدفع للطلب #${orderId}` });
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "تعذر تحديث حالة الدفع" });
    }
  }
  async function handleChannelSave(channel: "whatsapp" | "email", changes: any) {
    const current = { ...(channelSettings[channel] ?? {}), ...changes, channel };
    const response = await fetch(`/api/admin/notification-settings/${channel}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(current) });
    if (!response.ok) { toast({ variant: "destructive", title: "خطأ", description: "تعذر حفظ إعدادات القناة" }); return; }
    const saved = await response.json();
    setChannelSettings(value => ({ ...value, [channel]: saved }));
    toast({ title: "تم الحفظ", description: `تم تحديث إعدادات ${channel === "whatsapp" ? "واتساب" : "البريد الإلكتروني"}` });
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#FFF0F6] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-[#F0D4E5] p-8">
          <div className="flex flex-col items-center mb-8">
            <Logo className="w-16 h-16 mb-4" />
            <h1 className="font-serif text-2xl font-bold text-[#D81B60]">لوحة الإدارة</h1>
            <p className="text-[#6B6B6B] text-sm mt-1">فوشيا — إدارة الطلبات والمبيعات</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label>البريد الإلكتروني</Label>
              <Input value={loginEmail} onChange={e => setLoginEmail(e.target.value)} type="email"
                className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-12" dir="ltr" required placeholder="admin@fuchsia.ye" />
            </div>
            <div className="space-y-1.5">
              <Label>كلمة المرور</Label>
              <Input value={loginPassword} onChange={e => setLoginPassword(e.target.value)} type="password"
                className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-12" required />
            </div>
            <button type="submit" className="w-full h-12 rounded-2xl text-white font-bold text-base"
              style={{ background: "linear-gradient(135deg, #D81B60, #F48FB1 150%)" }}>
              دخول
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Derived data
  const allOrders = ordersQuery.data ?? [];
  const filteredOrders = statusFilter === "all" ? allOrders : allOrders.filter(o => o.status === statusFilter);
  const pendingCount = allOrders.filter(o => o.status === "received").length;
  const preparingCount = allOrders.filter(o => o.status === "preparing").length;
  const stats = statsQuery.data;

  const STATUS_TABS: { value: StatusFilter; label: string; color: string }[] = [
    { value: "all",        label: "الكل",          color: "text-[#1A1A1A]" },
    { value: "received",   label: "جديدة",         color: "text-blue-600" },
    { value: "preparing",  label: "تجهيز",         color: "text-amber-600" },
    { value: "delivering", label: "توصيل",         color: "text-purple-600" },
    { value: "delivered",  label: "مكتملة",        color: "text-green-600" },
  ];

  const navItems: { id: Section; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { id: "orders",   label: "الطلبات",     icon: ShoppingBag, badge: pendingCount },
    { id: "overview", label: "نظرة عامة",  icon: LayoutDashboard },
    { id: "users",    label: "العملاء",    icon: Users },
    { id: "coupons",  label: "الكوبونات",  icon: Tag },
    { id: "wallets",   label: "المحافظ",    icon: CreditCard },
    { id: "notification-settings", label: "قنوات التنبيه", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#FFF0F6] flex" dir="rtl">

      {/* Sidebar */}
      <aside className="w-60 bg-white border-l border-[#F0D4E5] flex flex-col shadow-sm sticky top-0 h-screen shrink-0">
        <div className="flex items-center gap-3 p-5 border-b border-[#F0D4E5]">
          <Logo className="w-9 h-9" />
          <div>
            <p className="font-bold text-[#D81B60] font-serif text-base">فوشيا</p>
            <p className="text-[#6B6B6B] text-xs">لوحة الإدارة</p>
          </div>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button key={item.id} onClick={() => { setSection(item.id); if (item.id === "orders") setNewOrderAlert(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-right relative ${
                  active ? "bg-[#FFF0F6] text-[#D81B60] shadow-sm" : "text-[#6B6B6B] hover:bg-[#FFF0F6]/70"
                }`}>
                {active && <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#D81B60] rounded-l-full" />}
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="bg-[#D81B60] text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {toArabicNumerals(item.badge)}
                  </span>
                )}
                {item.id === "orders" && newOrderAlert && !active && (
                  <span className="w-2 h-2 bg-[#D81B60] rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick stats in sidebar */}
        <div className="p-3 border-t border-[#F0D4E5] space-y-2">
          <div className="bg-[#FFF0F6] rounded-xl p-3">
            <p className="text-xs text-[#6B6B6B] mb-1">طلبات تحتاج اهتمام</p>
            <div className="flex gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600">{toArabicNumerals(pendingCount)}</p>
                <p className="text-[10px] text-[#6B6B6B]">جديدة</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-600">{toArabicNumerals(preparingCount)}</p>
                <p className="text-[10px] text-[#6B6B6B]">تجهيز</p>
              </div>
            </div>
          </div>
        </div>

        <button onClick={async () => { await adminLogoutMutation.mutateAsync(); localStorage.removeItem("fuchsia_admin"); setAdminToken(""); }}
          className="flex items-center gap-3 px-4 py-3 text-[#6B6B6B] hover:text-red-500 text-sm m-3 rounded-xl hover:bg-red-50 transition-colors">
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">

        {/* ══════════ ORDERS SECTION ══════════ */}
        {section === "orders" && (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#1A1A1A]">إدارة الطلبات</h2>
                <p className="text-[#6B6B6B] text-sm mt-0.5">
                  {toArabicNumerals(allOrders.length)} طلب إجمالاً — يتجدد كل ٢٠ ثانية
                </p>
              </div>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: getAdminListOrdersQueryKey() })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#F0D4E5] text-[#6B6B6B] hover:text-[#D81B60] text-sm transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${ordersQuery.isFetching ? "animate-spin text-[#D81B60]" : ""}`} />
                تحديث
              </button>
            </div>

            {/* Status filter tabs */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
              {STATUS_TABS.map(tab => {
                const count = tab.value === "all" ? allOrders.length : allOrders.filter(o => o.status === tab.value).length;
                return (
                  <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
                      statusFilter === tab.value
                        ? "bg-white border-[#D81B60] text-[#D81B60] shadow-sm"
                        : "bg-white/50 border-transparent text-[#6B6B6B] hover:bg-white"
                    }`}>
                    <span>{tab.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                      statusFilter === tab.value ? "bg-[#FFF0F6] text-[#D81B60]" : "bg-[#F0D4E5]/50 text-[#6B6B6B]"
                    }`}>
                      {toArabicNumerals(count)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Orders list */}
            {ordersQuery.isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-[#F0D4E5]" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#F0D4E5]">
                <ShoppingBag className="w-12 h-12 text-[#F0D4E5] mb-3" />
                <p className="text-[#6B6B6B]">لا توجد طلبات في هذا القسم</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {filteredOrders.map(order => {
                    const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.received;
                    const Icon = cfg.icon;
                    const isExpanded = expandedOrder === order.id;

                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="bg-white rounded-2xl border border-[#F0D4E5] overflow-hidden shadow-sm"
                      >
                        {/* Order row */}
                        <button
                          className="w-full text-right p-4 flex items-center gap-4 hover:bg-[#FFF0F6]/40 transition-colors"
                          onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                        >
                          {/* Status badge */}
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 ${cfg.bg} ${cfg.text}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {cfg.label}
                          </div>

                          {/* Order number */}
                          <div className="text-[#D81B60] font-bold text-sm shrink-0">
                            #{toArabicNumerals(order.id)}
                          </div>

                          {/* Customer */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#1A1A1A] text-sm truncate">{order.customerName ?? "عميل"}</p>
                            <p className="text-xs text-[#6B6B6B] truncate">{order.deliveryAddress}</p>
                          </div>

                          {/* Total + time */}
                          <div className="text-left shrink-0">
                            <p className="font-bold text-[#1A1A1A] text-sm">{formatCurrency(order.total)}</p>
                            <p className="text-xs text-[#6B6B6B]">
                              {new Date(order.createdAt).toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>

                          {isExpanded ? <ChevronUp className="w-4 h-4 text-[#6B6B6B] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#6B6B6B] shrink-0" />}
                        </button>

                        {/* Expanded details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-[#F0D4E5] p-5 space-y-5">

                                {/* Customer info row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div className="bg-[#FFF0F6] rounded-xl p-3">
                                    <div className="flex items-center gap-1.5 text-[#D81B60] mb-1">
                                      <Phone className="w-3.5 h-3.5" />
                                      <span className="text-xs font-semibold">الهاتف</span>
                                    </div>
                                    <p className="text-sm font-bold" dir="ltr">{order.customerPhone ?? "—"}</p>
                                  </div>
                                  <div className="bg-[#FFF0F6] rounded-xl p-3 col-span-1 md:col-span-2">
                                    <div className="flex items-center gap-1.5 text-[#D81B60] mb-1">
                                      <MapPin className="w-3.5 h-3.5" />
                                      <span className="text-xs font-semibold">العنوان</span>
                                    </div>
                                    <p className="text-sm">{order.deliveryAddress}</p>
                                  </div>
                                  <div className="bg-[#FFF0F6] rounded-xl p-3">
                                    <div className="flex items-center gap-1.5 text-[#D81B60] mb-1">
                                      <CreditCard className="w-3.5 h-3.5" />
                                      <span className="text-xs font-semibold">الدفع</span>
                                    </div>
                                    <p className="text-sm font-bold">{PAYMENT_LABELS[order.paymentMethod ?? ""] ?? order.paymentMethod}</p>
                                  </div>
                                </div>

                                {/* Notes */}
                                {order.notes && (
                                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
                                    <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-sm text-amber-800">{order.notes}</p>
                                  </div>
                                )}

                                {(order as any).paymentType !== "cash_on_delivery" && (
                                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
                                    <p className="text-sm font-bold text-blue-800">الدفع الإلكتروني: {(order as any).paymentStatus === "pending_review" ? "بانتظار مراجعة الإيصال" : (order as any).paymentStatus}</p>
                                    <p className="text-sm text-blue-800">المدفوع: {formatCurrency((order as any).paymentAmount ?? 0)} — المتبقي: {formatCurrency((order as any).remainingAmount ?? 0)}</p>
                                    {(order as any).transactionReference && <p className="text-sm text-blue-800">رقم العملية: <span dir="ltr">{(order as any).transactionReference}</span></p>}
                                    {(order as any).paymentReceiptUrl && <a href={(order as any).paymentReceiptUrl} target="_blank" rel="noreferrer" className="inline-block text-sm font-bold text-[#D81B60] underline">فتح إيصال التحويل</a>}
                                    {(order as any).paymentStatus === "pending_review" && <div className="flex gap-2 pt-2"><button type="button" onClick={() => handlePaymentReview(order.id, "verified")} className="flex-1 rounded-lg bg-green-600 text-white py-2 text-sm font-bold hover:bg-green-700">اعتماد الدفع</button><button type="button" onClick={() => handlePaymentReview(order.id, "rejected")} className="flex-1 rounded-lg bg-red-50 text-red-700 border border-red-200 py-2 text-sm font-bold hover:bg-red-100">رفض الإيصال</button></div>}
                                  </div>
                                )}

                                {/* Order items */}
                                {(order as any).items && (order as any).items.length > 0 && (
                                  <div>
                                    <p className="text-sm font-bold text-[#1A1A1A] mb-2">المنتجات المطلوبة</p>
                                    <div className="space-y-2">
                                      {(order as any).items.map((item: any) => (
                                        <div key={item.id} className="flex items-center gap-3 bg-[#FFF0F6]/50 rounded-xl p-3">
                                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-[#F0D4E5]">
                                            <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{item.productName}</p>
                                            <p className="text-xs text-[#6B6B6B]">الكمية: {toArabicNumerals(item.quantity)}</p>
                                          </div>
                                          <p className="text-sm font-bold text-[#D81B60] shrink-0">
                                            {formatCurrency(item.price * item.quantity)}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#F0D4E5]">
                                      <span className="text-sm text-[#6B6B6B]">الإجمالي</span>
                                      <span className="font-bold text-[#1A1A1A]">{formatCurrency(order.total)}</span>
                                    </div>
                                  </div>
                                )}

                                {/* Action buttons */}
                                {cfg.next && (
                                  <div className="flex gap-3 pt-1">
                                    <motion.button
                                      whileTap={{ scale: 0.97 }}
                                      onClick={() => handleStatusUpdate(order.id, cfg.next!)}
                                      disabled={updateStatus.isPending}
                                      className="flex-1 h-11 rounded-xl text-white font-bold text-sm"
                                      style={{ background: "linear-gradient(135deg, #D81B60, #F48FB1 150%)" }}
                                    >
                                      {updateStatus.isPending ? "جاري التحديث..." : `✓ ${cfg.nextLabel}`}
                                    </motion.button>
                                    <a href={`tel:${order.customerPhone}`}
                                      className="flex items-center gap-2 px-5 h-11 rounded-xl bg-green-50 border border-green-200 text-green-700 font-bold text-sm hover:bg-green-100 transition-colors">
                                      <Phone className="w-4 h-4" />
                                      اتصل
                                    </a>
                                  </div>
                                )}
                                {!cfg.next && (
                                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                                    <CheckCircle2 className="w-4 h-4" />
                                    الطلب مكتمل ✓
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* ══════════ OVERVIEW SECTION ══════════ */}
        {section === "overview" && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-6">نظرة عامة</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {[
                { label: "إجمالي المستخدمين", value: toArabicNumerals(stats?.totalUsers ?? 0), icon: Users, color: "#D81B60" },
                { label: "إجمالي الطلبات", value: toArabicNumerals(stats?.totalOrders ?? 0), icon: ShoppingBag, color: "#7C3AED" },
                { label: "إجمالي المنتجات", value: toArabicNumerals(stats?.totalProducts ?? 0), icon: Package, color: "#D81B60" },
                { label: "الطلبات المعلقة", value: toArabicNumerals(stats?.pendingOrders ?? 0), icon: Clock, color: "#F59E0B" },
                { label: "إجمالي المتاجر", value: toArabicNumerals(stats?.totalStores ?? 0), icon: LayoutDashboard, color: "#D81B60" },
                { label: "إجمالي الإيرادات", value: formatCurrency(stats?.totalRevenue ?? 0), icon: TrendingUp, color: "#16A34A" },
              ].map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="bg-white rounded-2xl p-5 border border-[#F0D4E5] shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[#6B6B6B] text-sm">{card.label}</p>
                        <p className="text-2xl font-bold mt-1" style={{ color: card.color }}>{card.value}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.color + "15" }}>
                        <Icon className="w-5 h-5" style={{ color: card.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════ USERS SECTION ══════════ */}
        {section === "users" && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-6">العملاء ({toArabicNumerals(usersQuery.data?.length ?? 0)})</h2>
            <div className="bg-white rounded-2xl border border-[#F0D4E5] overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-[#FFF0F6] border-b border-[#F0D4E5]">
                  <tr>
                    <th className="text-right p-4 font-medium text-[#6B6B6B]">الاسم</th>
                    <th className="text-right p-4 font-medium text-[#6B6B6B]">الهاتف</th>
                    <th className="text-right p-4 font-medium text-[#6B6B6B]">البريد</th>
                    <th className="text-right p-4 font-medium text-[#6B6B6B]">النقاط</th>
                    <th className="text-right p-4 font-medium text-[#6B6B6B]">النوع</th>
                  </tr>
                </thead>
                <tbody>
                  {usersQuery.isLoading
                    ? [...Array(5)].map((_, i) => (
                        <tr key={i}><td colSpan={5} className="p-4"><div className="h-5 bg-[#FFF0F6] rounded animate-pulse" /></td></tr>
                      ))
                    : usersQuery.data?.map(user => (
                        <tr key={user.id} className="border-b border-[#F0D4E5]/50 hover:bg-[#FFF0F6]/40">
                          <td className="p-4 font-medium">{user.fullName}</td>
                          <td className="p-4 text-[#6B6B6B]" dir="ltr">{(user as any).phone ?? "—"}</td>
                          <td className="p-4 text-[#6B6B6B] text-xs" dir="ltr">{user.email}</td>
                          <td className="p-4 text-[#D81B60] font-bold">{toArabicNumerals(user.rewardPoints)}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isGuest ? "bg-gray-100 text-gray-500" : "bg-[#FFF0F6] text-[#D81B60]"}`}>
                              {user.isGuest ? "زائر" : "مسجل"}
                            </span>
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════ WALLETS SECTION ══════════ */}
        {section === "wallets" && (
          <div className="p-6 flex flex-col gap-8">
            <div>
              <div className="flex items-center justify-between mb-5"><div><h2 className="text-xl font-bold text-[#1A1A1A]">المحافظ وطرق الدفع اليدوية</h2><p className="text-sm text-[#6B6B6B] mt-1">أدر الحسابات التي تظهر للعملاء عند التحويل اليدوي</p></div><span className="text-xs bg-[#FFF0F6] text-[#D81B60] px-3 py-2 rounded-full">{adminWallets.filter(w => w.isActive).length} فعالة</span></div>
              <form onSubmit={handleCreateWallet} className="bg-white rounded-2xl border border-[#F0D4E5] p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl shadow-sm">
                <div><Label>اسم المحفظة</Label><Input required value={walletForm.nameAr} onChange={e => setWalletForm(f => ({ ...f, nameAr: e.target.value }))} placeholder="مثال: جيب" className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-11" /></div>
                <div><Label>الاسم بالإنجليزية</Label><Input value={walletForm.nameEn} onChange={e => setWalletForm(f => ({ ...f, nameEn: e.target.value }))} placeholder="Jaib" dir="ltr" className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-11" /></div>
                <div><Label>رقم الحساب أو نقطة البيع</Label><Input required value={walletForm.accountNumber} onChange={e => setWalletForm(f => ({ ...f, accountNumber: e.target.value }))} dir="ltr" className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-11" /></div>
                <div><Label>رابط الأيقونة</Label><Input value={walletForm.iconUrl} onChange={e => setWalletForm(f => ({ ...f, iconUrl: e.target.value }))} placeholder="https://..." dir="ltr" className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-11" /></div>
                <div className="md:col-span-2"><Label>تعليمات الدفع</Label><Input value={walletForm.instructions} onChange={e => setWalletForm(f => ({ ...f, instructions: e.target.value }))} placeholder="حوّل المبلغ ثم أرفق الإيصال" className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-11" /></div>
                <button type="submit" className="md:col-span-2 h-11 rounded-xl text-white font-bold" style={{ background: "linear-gradient(135deg, #D81B60, #F48FB1 150%)" }}>إضافة طريقة دفع</button>
              </form>
            </div>
            <div><h3 className="text-lg font-bold text-[#1A1A1A] mb-4">طرق الدفع الحالية</h3><div className="space-y-3">
              {adminWallets.map((wallet, index) => <div key={wallet.id} className={`bg-white rounded-2xl border p-4 ${wallet.isActive ? "border-[#F0D4E5]" : "border-gray-200 opacity-70"}`}>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {wallet.iconUrl ? <img src={wallet.iconUrl} alt="" className="w-12 h-12 object-contain rounded-xl border border-[#F0D4E5]" /> : <div className="w-12 h-12 rounded-xl bg-[#FFF0F6] text-[#D81B60] flex items-center justify-center font-bold text-xl">{wallet.nameAr.slice(0, 1)}</div>}
                  <div className="flex-1"><div className="flex items-center gap-2"><p className="font-bold">{wallet.nameAr}</p><span className={`text-xs px-2 py-1 rounded-full ${wallet.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{wallet.isActive ? "فعالة" : "معطلة"}</span></div><p className="text-sm text-[#6B6B6B]" dir="ltr">{wallet.accountNumber}</p><p className="text-xs text-[#6B6B6B]">الترتيب: {toArabicNumerals(wallet.sortOrder)}</p></div>
                  <div className="flex items-center gap-2"><button type="button" onClick={() => handleWalletPatch(wallet.id, { isActive: !wallet.isActive })} className="px-3 py-2 rounded-lg border border-[#F0D4E5] text-xs font-bold hover:text-[#D81B60]">{wallet.isActive ? "تعطيل" : "تفعيل"}</button><button type="button" onClick={() => handleEditWallet(wallet)} className="px-3 py-2 rounded-lg border border-[#F0D4E5] text-xs font-bold hover:text-[#D81B60]">تعديل البيانات</button><button type="button" disabled={index === 0} onClick={() => handleWalletPatch(wallet.id, { sortOrder: Math.max(0, wallet.sortOrder - 1) })} className="px-2 py-2 rounded-lg border border-[#F0D4E5] text-xs disabled:opacity-30">↑</button><button type="button" disabled={index === adminWallets.length - 1} onClick={() => handleWalletPatch(wallet.id, { sortOrder: wallet.sortOrder + 1 })} className="px-2 py-2 rounded-lg border border-[#F0D4E5] text-xs disabled:opacity-30">↓</button></div>
                </div>
                {wallet.instructions && <p className="text-xs text-[#6B6B6B] mt-3 border-t border-[#F0D4E5] pt-3">{wallet.instructions}</p>}
              </div>)}
            </div></div>
          </div>
        )}
        {section === "notification-settings" && (
          <div className="p-6 max-w-4xl space-y-6">
            <div><h2 className="text-xl font-bold text-[#1A1A1A]">قنوات إشعارات العملاء</h2><p className="text-sm text-[#6B6B6B] mt-1">فعّل واتساب والبريد لإرسال تحديثات حالة الطلب ومراجعة الإيصالات.</p></div>
            {[
              { channel: "whatsapp" as const, title: "واتساب", description: "رسائل WhatsApp Business للعملاء", configured: channelSettings.credentials?.whatsapp, providers: ["WhatsApp Business Cloud API", "Twilio WhatsApp"], placeholder: "مثال: +967777000000", defaultTemplate: "مرحباً {name}، تم تحديث طلبك رقم {order} إلى: {status}." },
              { channel: "email" as const, title: "البريد الإلكتروني", description: "رسائل بريدية لتأكيدات الطلب والدفع", configured: channelSettings.credentials?.email, providers: ["Resend", "SMTP"], placeholder: "مثال: notifications@fuchsia.ye", defaultTemplate: "مرحباً {name}، تم تحديث طلبك رقم {order} إلى: {status}." },
            ].map(item => { const value = channelSettings[item.channel] ?? { enabled: true, provider: item.providers[0], sender: "", template: item.defaultTemplate }; return <div key={item.channel} className="bg-white rounded-2xl border border-[#F0D4E5] p-5 shadow-sm space-y-4"><div className="flex items-start justify-between gap-4"><div><h3 className="font-bold text-lg">{item.title}</h3><p className="text-sm text-[#6B6B6B]">{item.description}</p></div><button type="button" onClick={() => void handleChannelSave(item.channel, { ...value, enabled: !value.enabled })} className={`relative w-14 h-8 rounded-full transition-colors ${value.enabled ? "bg-[#D81B60]" : "bg-[#E8D9E2]"}`} aria-label={`تفعيل ${item.title}`}><span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${value.enabled ? "right-1" : "left-1"}`} /></button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label>مزود الخدمة</Label><select value={value.provider} onChange={e => setChannelSettings(current => ({ ...current, [item.channel]: { ...value, provider: e.target.value } }))} className="w-full h-11 rounded-xl border border-[#F0D4E5] bg-[#FFF0F6] px-3">{item.providers.map(provider => <option key={provider}>{provider}</option>)}</select></div><div><Label>{item.channel === "whatsapp" ? "رقم واتساب المرسل" : "بريد المرسل"}</Label><Input value={value.sender ?? ""} onChange={e => setChannelSettings(current => ({ ...current, [item.channel]: { ...value, sender: e.target.value } }))} placeholder={item.placeholder} dir="ltr" className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-11" /></div></div><div><Label>قالب الرسالة</Label><Textarea value={value.template ?? item.defaultTemplate} onChange={e => setChannelSettings(current => ({ ...current, [item.channel]: { ...value, template: e.target.value } }))} className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl" /><p className="text-xs text-[#6B6B6B] mt-1">المتغيرات المتاحة: {'{name}'}، {'{order}'}، {'{status}'}</p></div><div className="flex items-center justify-between gap-3 border-t border-[#F0D4E5] pt-3"><span className={`text-xs px-2.5 py-1.5 rounded-full ${item.configured ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{item.configured ? "بيانات الربط متوفرة" : "بانتظار مفاتيح الربط في الخادم"}</span><button type="button" onClick={() => void handleChannelSave(item.channel, value)} className="px-5 h-10 rounded-xl bg-[#D81B60] text-white font-bold text-sm">حفظ إعدادات {item.title}</button></div></div> })}
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800">لا يتم حفظ مفاتيح API أو كلمات مرور SMTP في قاعدة البيانات أو عرضها في اللوحة. بعد إضافة المفاتيح إلى بيئة الخادم ستتحول حالة القناة إلى جاهزة للإرسال.</div>
          </div>
        )}
        {/* ══════════ COUPONS SECTION ══════════ */}
        {section === "coupons" && (
          <div className="p-6 flex flex-col gap-8">
            <div>
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-5">إنشاء كوبون خصم</h2>
              <form onSubmit={handleCreateCoupon} className="bg-white rounded-2xl border border-[#F0D4E5] p-6 flex flex-col gap-4 max-w-lg shadow-sm">
                <div className="space-y-1.5">
                  <Label>كود الكوبون</Label>
                  <Input value={couponForm.code} onChange={e => setCouponForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="FUCHSIA20" className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-11" required dir="ltr" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>نوع الخصم</Label>
                    <select value={couponForm.discountType} onChange={e => setCouponForm(f => ({ ...f, discountType: e.target.value }))}
                      className="w-full h-11 rounded-xl border border-[#F0D4E5] bg-[#FFF0F6] px-3 text-sm">
                      <option value="percentage">نسبة مئوية %</option>
                      <option value="fixed">مبلغ ثابت ر.ي</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>قيمة الخصم</Label>
                    <Input type="number" value={couponForm.discountValue} onChange={e => setCouponForm(f => ({ ...f, discountValue: e.target.value }))}
                      placeholder="10" className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-11" required dir="ltr" />
                  </div>
                </div>
                <button type="submit" className="h-11 rounded-xl text-white font-bold"
                  style={{ background: "linear-gradient(135deg, #D81B60, #F48FB1 150%)" }}>
                  إنشاء الكوبون
                </button>
              </form>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-4">الكوبونات الحالية</h3>
              <div className="bg-white rounded-2xl border border-[#F0D4E5] overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-[#FFF0F6] border-b border-[#F0D4E5]">
                    <tr>
                      <th className="text-right p-4 font-medium text-[#6B6B6B]">الكود</th>
                      <th className="text-right p-4 font-medium text-[#6B6B6B]">الخصم</th>
                      <th className="text-right p-4 font-medium text-[#6B6B6B]">الاستخدامات</th>
                      <th className="text-right p-4 font-medium text-[#6B6B6B]">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {couponsQuery.data?.map(c => (
                      <tr key={c.id} className="border-b border-[#F0D4E5]/50">
                        <td className="p-4 font-mono font-bold text-[#D81B60] text-base" dir="ltr">{c.code}</td>
                        <td className="p-4 font-semibold">{c.discountValue}{c.discountType === "percentage" ? "%" : " ر.ي"}</td>
                        <td className="p-4 text-[#6B6B6B]">{toArabicNumerals(c.usageCount ?? 0)} مرة</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {c.isActive ? "فعال" : "معطل"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
