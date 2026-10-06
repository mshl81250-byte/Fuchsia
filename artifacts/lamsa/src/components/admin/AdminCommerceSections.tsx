import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, MapPin, PackageCheck, Phone, RefreshCw, Search, ShoppingCart, UsersRound } from "lucide-react";
import { formatCurrency, toArabicNumerals } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

type ReservationStatus = "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
type Reservation = {
  id: number;
  storeId: number;
  storeName: string | null;
  reservationAt: string;
  partySize: number;
  customerName: string;
  customerPhone: string;
  occasion: string | null;
  notes: string | null;
  status: ReservationStatus;
  createdAt: string;
};

const RESERVATION_STATUS: Record<ReservationStatus, { label: string; className: string }> = {
  pending: { label: "بانتظار التأكيد", className: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmed: { label: "مؤكد", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "تعذر التأكيد", className: "bg-rose-50 text-rose-700 border-rose-200" },
  cancelled: { label: "ملغي", className: "bg-slate-100 text-slate-600 border-slate-200" },
  completed: { label: "مكتمل", className: "bg-violet-50 text-violet-700 border-violet-200" },
};
const RESERVATION_FILTERS: Array<{ value: "all" | ReservationStatus; label: string }> = [
  { value: "all", label: "الكل" },
  { value: "pending", label: "بانتظار التأكيد" },
  { value: "confirmed", label: "مؤكدة" },
  { value: "completed", label: "مكتملة" },
  { value: "rejected", label: "معتذر عنها" },
  { value: "cancelled", label: "ملغاة" },
];

function dateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("ar-YE", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function SectionHeader({ title, subtitle, busy, onRefresh }: { title: string; subtitle: string; busy: boolean; onRefresh: () => void }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#FCE8F1] text-[#A00052]"><CalendarDays className="h-5 w-5" /></span><h2 className="text-xl font-bold text-[#321525]">{title}</h2></div>
        <p className="mt-2 text-sm text-[#786773]">{subtitle}</p>
      </div>
      <button onClick={onRefresh} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#F0D4E5] bg-white px-4 text-sm font-semibold text-[#6B5662] transition hover:border-[#C00061] hover:text-[#A00052]">
        <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> تحديث
      </button>
    </div>
  );
}

function ErrorNotice({ message, retry }: { message: string; retry: () => void }) {
  return <div className="rounded-2xl border border-rose-200 bg-white p-6 text-center"><p className="text-sm text-rose-700">{message}</p><button onClick={retry} className="mt-3 rounded-xl bg-[#A00052] px-4 py-2 text-sm font-bold text-white">إعادة المحاولة</button></div>;
}

export function ReservationsSection() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | ReservationStatus>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const response = await fetch("/api/admin/reservations", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 ? "انتهت جلسة الإدارة؛ سجّل الدخول مجددًا." : "تعذر تحميل طلبات الحجز.");
      setRows(await response.json());
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "تعذر تحميل طلبات الحجز.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
    const timer = window.setInterval(() => void load(true), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const updateStatus = async (row: Reservation, status: ReservationStatus) => {
    setBusyId(row.id);
    try {
      const response = await fetch(`/api/admin/reservations/${row.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("تعذر تحديث حالة الحجز.");
      const updated = await response.json() as Reservation;
      setRows((current) => current.map((item) => item.id === row.id ? updated : item));
      toast({ title: "تم تحديث الحجز", description: `الحجز #${toArabicNumerals(row.id)} — ${RESERVATION_STATUS[status].label}` });
    } catch (failure) {
      toast({ variant: "destructive", title: "لم يتم التحديث", description: failure instanceof Error ? failure.message : "حاول مجددًا." });
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => rows.filter((row) => {
    const matchesStatus = filter === "all" || row.status === filter;
    const needle = query.trim().toLowerCase();
    const matchesQuery = !needle || [row.customerName, row.customerPhone, row.storeName ?? "", row.occasion ?? "", String(row.id)].some((value) => value.toLowerCase().includes(needle));
    return matchesStatus && matchesQuery;
  }), [filter, query, rows]);

  const pendingCount = rows.filter((row) => row.status === "pending").length;
  const confirmedCount = rows.filter((row) => row.status === "confirmed").length;
  const upcomingCount = rows.filter((row) => row.status === "confirmed" && new Date(row.reservationAt).getTime() >= Date.now()).length;

  return (
    <div className="p-5 md:p-7">
      <SectionHeader title="إدارة الحجوزات" subtitle="طلبات الطاولات، الفرع، الموعد، وعدد الضيوف — تتحدث تلقائيًا كل ٣٠ ثانية." busy={refreshing} onRefresh={() => void load()} />
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "بانتظار التأكيد", value: pendingCount, tone: "text-amber-700", icon: Clock3 },
          { label: "حجوزات مؤكدة", value: confirmedCount, tone: "text-emerald-700", icon: CalendarDays },
          { label: "مواعيد قادمة", value: upcomingCount, tone: "text-[#A00052]", icon: UsersRound },
        ].map((card) => { const Icon = card.icon; return <div key={card.label} className="rounded-2xl border border-[#F0D4E5] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm text-[#786773]">{card.label}</span><Icon className={`h-4 w-4 ${card.tone}`} /></div><p className={`mt-2 text-2xl font-extrabold ${card.tone}`}>{toArabicNumerals(card.value)}</p></div>; })}
      </div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">{RESERVATION_FILTERS.map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={`whitespace-nowrap rounded-full border px-3 py-2 text-xs font-bold transition ${filter === item.value ? "border-[#A00052] bg-[#A00052] text-white" : "border-[#F0D4E5] bg-white text-[#786773] hover:border-[#C00061]"}`}>{item.label}{item.value === "pending" ? ` · ${toArabicNumerals(pendingCount)}` : ""}</button>)}</div>
        <label className="relative block w-full lg:max-w-xs"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A38F9B]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث بالاسم أو الهاتف أو الفرع" className="h-10 w-full rounded-xl border border-[#F0D4E5] bg-white pr-9 pl-3 text-sm outline-none transition focus:border-[#C00061]" /></label>
      </div>
      {loading ? <div className="grid gap-3 lg:grid-cols-2">{[0, 1, 2, 3].map((key) => <div key={key} className="h-44 animate-pulse rounded-2xl border border-[#F0D4E5] bg-white" />)}</div>
        : error ? <ErrorNotice message={error} retry={() => void load()} />
        : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-[#E6CBD8] bg-white/70 py-16 text-center"><CalendarDays className="mx-auto h-9 w-9 text-[#D7B6C8]" /><p className="mt-3 font-semibold text-[#6B5662]">لا توجد حجوزات مطابقة</p><p className="mt-1 text-sm text-[#9A8791]">ستظهر طلبات الطاولات الجديدة هنا.</p></div>
        : <div className="grid gap-3 lg:grid-cols-2">{filtered.map((row) => {
          const status = RESERVATION_STATUS[row.status] ?? RESERVATION_STATUS.pending;
          return <article key={row.id} className="rounded-2xl border border-[#F0D4E5] bg-white p-4 shadow-sm transition hover:border-[#E4B7CD] hover:shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><div className="flex items-center gap-2"><h3 className="font-bold text-[#321525]">{row.customerName}</h3><span className="text-xs text-[#9A8791]">#{toArabicNumerals(row.id)}</span></div><a className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-[#8F1855] hover:underline" href={`tel:${row.customerPhone}`}><Phone className="h-3.5 w-3.5" /><span dir="ltr">{row.customerPhone}</span></a></div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl bg-[#FFF8FB] p-3 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2 text-[#5F4A56]"><CalendarDays className="h-4 w-4 shrink-0 text-[#A00052]" /><span>{dateTime(row.reservationAt)}</span></div>
              <div className="flex items-center gap-2 text-[#5F4A56]"><UsersRound className="h-4 w-4 shrink-0 text-[#A00052]" /><span>{toArabicNumerals(row.partySize)} أشخاص</span></div>
              <div className="flex items-center gap-2 text-[#5F4A56] sm:col-span-2"><MapPin className="h-4 w-4 shrink-0 text-[#A00052]" /><span>{row.storeName || `فرع ${toArabicNumerals(row.storeId)}`}</span></div>
              {row.occasion && <p className="text-xs text-[#786773] sm:col-span-2">المناسبة: {row.occasion}</p>}
              {row.notes && <p className="text-xs text-[#786773] sm:col-span-2">ملاحظات: {row.notes}</p>}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#F5E6EE] pt-3">
              <span className="text-[11px] text-[#9A8791]">تاريخ الإرسال: {dateTime(row.createdAt)}</span>
              <select aria-label={`تحديث حالة الحجز ${row.id}`} value={row.status} disabled={busyId === row.id} onChange={(event) => void updateStatus(row, event.target.value as ReservationStatus)} className="h-9 rounded-xl border border-[#EAD3DF] bg-white px-3 text-xs font-bold text-[#6A2949] outline-none focus:border-[#C00061] disabled:opacity-60">
                {Object.entries(RESERVATION_STATUS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
              </select>
            </div>
          </article>;
        })}</div>}
    </div>
  );
}

type ActiveCartItem = { id: number; productId: number; productName: string; price: number; quantity: number; imageUrl: string; giftWrapping: boolean; createdAt: string };
type ActiveCart = { sessionId: string; itemCount: number; totalQuantity: number; subtotal: number; lastActivityAt: string; items: ActiveCartItem[] };

export function ActiveCartsSection() {
  const [carts, setCarts] = useState<ActiveCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [truncated, setTruncated] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const response = await fetch("/api/admin/carts", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 ? "انتهت جلسة الإدارة؛ سجّل الدخول مجددًا." : "تعذر تحميل السلال النشطة.");
      const payload = await response.json();
      setCarts(payload.carts ?? []);
      setTruncated(Boolean(payload.truncated));
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "تعذر تحميل السلال النشطة.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
    const timer = window.setInterval(() => void load(true), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return carts;
    return carts.filter((cart) => cart.items.some((item) => item.productName.toLowerCase().includes(needle)) || cart.sessionId.toLowerCase().includes(needle));
  }, [carts, query]);
  const totalUnits = carts.reduce((sum, cart) => sum + cart.totalQuantity, 0);
  const estimatedValue = carts.reduce((sum, cart) => sum + cart.subtotal, 0);

  return (
    <div className="p-5 md:p-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><div className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#FCE8F1] text-[#A00052]"><ShoppingCart className="h-5 w-5" /></span><h2 className="text-xl font-bold text-[#321525]">السلال النشطة</h2></div><p className="mt-2 text-sm text-[#786773]">عرض إجمالي المنتجات قبل إتمام الطلب؛ لا تغيّر هذه الصفحة سلة العميل. تحديث تلقائي كل ٣٠ ثانية.</p></div>
        <button onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#F0D4E5] bg-white px-4 text-sm font-semibold text-[#6B5662] transition hover:border-[#C00061] hover:text-[#A00052]"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> تحديث</button>
      </div>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "سلال نشطة", value: carts.length, icon: ShoppingCart, tone: "text-[#A00052]" },
          { label: "قطع في السلال", value: totalUnits, icon: PackageCheck, tone: "text-violet-700" },
          { label: "قيمة المنتجات التقديرية", value: formatCurrency(estimatedValue), icon: Clock3, tone: "text-emerald-700" },
        ].map((card) => { const Icon = card.icon; return <div key={card.label} className="rounded-2xl border border-[#F0D4E5] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm text-[#786773]">{card.label}</span><Icon className={`h-4 w-4 ${card.tone}`} /></div><p className={`mt-2 text-xl font-extrabold ${card.tone}`}>{typeof card.value === "number" ? toArabicNumerals(card.value) : card.value}</p></div>; })}
      </div>
      <label className="relative mb-4 block max-w-md"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A38F9B]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث باسم منتج أو معرّف جلسة" className="h-10 w-full rounded-xl border border-[#F0D4E5] bg-white pr-9 pl-3 text-sm outline-none focus:border-[#C00061]" /></label>
      {truncated && <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">يتم عرض أحدث ٢٠٠ سلة فقط بسبب كثافة البيانات.</p>}
      {loading ? <div className="grid gap-3 lg:grid-cols-2">{[0, 1, 2, 3].map((key) => <div key={key} className="h-40 animate-pulse rounded-2xl border border-[#F0D4E5] bg-white" />)}</div>
        : error ? <ErrorNotice message={error} retry={() => void load()} />
        : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-[#E6CBD8] bg-white/70 py-16 text-center"><ShoppingCart className="mx-auto h-9 w-9 text-[#D7B6C8]" /><p className="mt-3 font-semibold text-[#6B5662]">لا توجد سلال مطابقة</p><p className="mt-1 text-sm text-[#9A8791]">تظهر السلة هنا ما دامت تحتوي منتجات قبل إتمام الطلب.</p></div>
        : <div className="grid gap-3 xl:grid-cols-2">{filtered.map((cart) => <article key={cart.sessionId} className="rounded-2xl border border-[#F0D4E5] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F5E6EE] pb-3"><div><p className="font-bold text-[#321525]">سلة نشطة <span className="text-xs font-normal text-[#9A8791]">·••{cart.sessionId.slice(-4)}</span></p><p className="mt-1 flex items-center gap-1.5 text-xs text-[#8A7782]"><Clock3 className="h-3.5 w-3.5" />آخر نشاط: {dateTime(cart.lastActivityAt)}</p></div><div className="text-left"><p className="text-lg font-extrabold text-[#A00052]">{formatCurrency(cart.subtotal)}</p><p className="text-xs text-[#8A7782]">{toArabicNumerals(cart.totalQuantity)} قطعة</p></div></div>
          <div className="mt-3 space-y-2">{cart.items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl bg-[#FFF8FB] p-2.5"><div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#FCE8F1]">{item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <PackageCheck className="h-4 w-4 text-[#A00052]" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#4A2D3C]">{item.productName}</p><p className="mt-0.5 text-xs text-[#8A7782]">الكمية {toArabicNumerals(item.quantity)}{item.giftWrapping ? " · تغليف هدية" : ""}</p></div><p className="shrink-0 text-sm font-bold text-[#5F4A56]">{formatCurrency(item.price * item.quantity)}</p></div>)}</div>
        </article>)}</div>}
    </div>
  );
}
