import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { toast } from "sonner";
import { CalendarDays, CheckCircle, Clock3, Package, RotateCcw, ShieldAlert } from "lucide-react";

type RentalItem = {
  id: number;
  productName: string;
  quantity: number;
  price: number;
  rentalStartDate: string | null;
  rentalEndDate: string | null;
  rentalDays: number | null;
  rentalDeposit: number;
  imageUrl: string;
};

type RentalOrder = {
  id: number;
  status: string;
  total: number;
  rentalDeposit: number;
  rentalDepositStatus: string;
  rentalDepositRefunded: number;
  rentalDamageDeduction: number;
  rentalLateFee: number;
  rentalDepositReason: string | null;
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  createdAt: string;
  items: RentalItem[];
};

const STATUS: Record<string, { label: string; className: string; next?: string; nextLabel?: string }> = {
  rental_pending_confirmation: { label: "بانتظار مراجعة التوفر", className: "bg-blue-100 text-blue-800", next: "rental_confirmed", nextLabel: "قبول التوفر" },
  rental_confirmed: { label: "تم قبول التوفر", className: "bg-green-100 text-green-800", next: "rental_preparing", nextLabel: "بدء التجهيز" },
  rental_rejected: { label: "غير متوفر / مرفوض", className: "bg-red-100 text-red-800" },
  rental_preparing: { label: "قيد التجهيز", className: "bg-amber-100 text-amber-800", next: "rental_out", nextLabel: "تم التسليم" },
  rental_out: { label: "مؤجر / لدى العميل", className: "bg-purple-100 text-purple-800", next: "rental_return_pending", nextLabel: "بانتظار الاسترجاع" },
  rental_return_pending: { label: "بانتظار الاسترجاع", className: "bg-orange-100 text-orange-800", next: "rental_returned", nextLabel: "تأكيد الاسترجاع" },
  rental_returned: { label: "تم الاسترجاع", className: "bg-green-100 text-green-800" },
  rental_late: { label: "متأخر", className: "bg-red-100 text-red-800", next: "rental_return_pending", nextLabel: "متابعة الاسترجاع" },
  rental_damaged: { label: "تلف / مراجعة التأمين", className: "bg-red-100 text-red-800" },
  cancelled: { label: "ملغي", className: "bg-gray-100 text-gray-800" },
};

function currency(amount: number) {
  return `${amount.toLocaleString("ar-YE")} ر.ي`;
}

export function RentalsView() {
  const [rentals, setRentals] = useState<RentalOrder[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [settlementDrafts, setSettlementDrafts] = useState<Record<number, { damage: string; late: string; reason: string }>>({});

  const loadRentals = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/rentals", { credentials: "include" });
      if (!response.ok) throw new Error("تعذر تحميل الإيجارات");
      setRentals(await response.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحميل الإيجارات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRentals();
    const timer = window.setInterval(() => void loadRentals(), 20_000);
    return () => window.clearInterval(timer);
  }, []);

  const visible = useMemo(() => filter === "all" ? rentals : rentals.filter((rental) => rental.status === filter), [rentals, filter]);
  const counts = useMemo(() => rentals.reduce<Record<string, number>>((acc, rental) => {
    acc[rental.status] = (acc[rental.status] ?? 0) + 1;
    return acc;
  }, { all: rentals.length }), [rentals]);

  const updateStatus = async (rental: RentalOrder, status: string) => {
    setBusyId(rental.id);
    try {
      const response = await fetch(`/api/admin/rentals/${rental.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "تعذر تحديث الحالة");
      }
      toast.success("تم تحديث حالة الإيجار");
      await loadRentals();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الحالة");
    } finally {
      setBusyId(null);
    }
  };

  const settleDeposit = async (rental: RentalOrder) => {
    const draft = settlementDrafts[rental.id] ?? { damage: "0", late: "0", reason: "" };
    setBusyId(rental.id);
    try {
      const response = await fetch(`/api/admin/rentals/${rental.id}/deposit`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ damageDeduction: Number(draft.damage || 0), lateFee: Number(draft.late || 0), reason: draft.reason }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "تعذر تسوية التأمين");
      }
      toast.success("تم تسجيل تسوية التأمين وإشعار العميل");
      await loadRentals();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تسوية التأمين");
    } finally {
      setBusyId(null);
    }
  };

  if (loading && rentals.length === 0) return <div className="p-8 text-center text-muted-foreground">جارٍ تحميل الإيجارات...</div>;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">إدارة الإيجارات</h2>
          <p className="text-muted-foreground mt-1">متابعة التسليم والاسترجاع والتأمين للعناصر المؤجرة.</p>
        </div>
        <Button variant="outline" onClick={() => void loadRentals()}>تحديث</Button>
      </div>

      <Tabs value={filter} onValueChange={setFilter} dir="rtl">
        <TabsList className="flex flex-wrap h-auto gap-2 p-1 bg-muted/50 rounded-xl justify-start">
          <TabsTrigger value="all">الكل <Badge variant="secondary" className="mr-2">{counts.all || 0}</Badge></TabsTrigger>
          {Object.entries(STATUS).map(([status, info]) => (
            <TabsTrigger key={status} value={status}>{info.label} <Badge variant="secondary" className="mr-2">{counts[status] || 0}</Badge></TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {visible.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Package /></EmptyMedia>
            <EmptyTitle>لا توجد إيجارات</EmptyTitle>
            <EmptyDescription>ستظهر هنا طلبات الكوش والطاولات المؤجرة بعد تأكيدها.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4">
          {visible.map((rental) => {
            const info = STATUS[rental.status] || { label: rental.status, className: "bg-gray-100 text-gray-800" };
            const next = STATUS[rental.status]?.next;
            const draft = settlementDrafts[rental.id] ?? { damage: "0", late: "0", reason: "" };
            const totalDeduction = Number(draft.damage || 0) + Number(draft.late || 0);
            return (
              <Card key={rental.id} className="p-5 space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-3 text-primary"><CalendarDays className="h-5 w-5" /></div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap"><span className="font-bold text-lg">إيجار #{rental.id}</span><Badge className={info.className}>{info.label}</Badge></div>
                      <p className="font-semibold mt-1">{rental.customerName || "عميل غير مسمى"} · {rental.customerPhone || "بدون هاتف"}</p>
                      <p className="text-sm text-muted-foreground">{rental.deliveryAddress || "لم يحدد العنوان"}</p>
                    </div>
                  </div>
                  <div className="text-right"><p className="text-sm text-muted-foreground">الإجمالي</p><p className="font-bold text-xl text-primary">{currency(rental.total)}</p></div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {rental.items.map((item) => (
                    <div key={item.id} className="rounded-xl border bg-muted/20 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2"><span className="font-bold">{item.productName}</span><Badge variant="outline">كمية {item.quantity}</Badge></div>
                      <p className="text-sm text-muted-foreground">{currency(item.price)} لليوم · {item.rentalDays || 1} أيام</p>
                      <p className="text-sm flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /> {item.rentalStartDate || "-"} إلى {item.rentalEndDate || "-"}</p>
                      <p className="text-sm flex items-center gap-2 text-amber-700"><ShieldAlert className="h-4 w-4" /> التأمين: {currency(item.rentalDeposit * item.quantity)}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-t pt-4">
                  <div className="text-sm text-muted-foreground">التأمين المسترد المتوقع: <strong className="text-foreground">{currency(rental.rentalDeposit)}</strong></div>
                  <div className="flex gap-2 flex-wrap">
                    {rental.status === "rental_pending_confirmation" && <Button variant="outline" className="gap-2 border-red-200 text-red-700" disabled={busyId === rental.id} onClick={() => void updateStatus(rental, "rental_rejected")}><ShieldAlert className="h-4 w-4" /> رفض لعدم التوفر</Button>}
                    {rental.status === "rental_return_pending" && <Button variant="outline" className="gap-2" disabled={busyId === rental.id} onClick={() => void updateStatus(rental, "rental_damaged")}><ShieldAlert className="h-4 w-4" /> تسجيل تلف</Button>}
                    {next && <Button className="gap-2" disabled={busyId === rental.id} onClick={() => void updateStatus(rental, next)}>{rental.status === "rental_return_pending" ? <RotateCcw className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}{busyId === rental.id ? "جارٍ الحفظ..." : info.nextLabel}</Button>}
                  </div>
                </div>
                {rental.rentalDeposit > 0 && rental.rentalDepositStatus === "pending" && ["rental_return_pending", "rental_returned", "rental_damaged"].includes(rental.status) && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                    <div><h4 className="font-bold text-amber-900">تسوية التأمين</h4><p className="text-xs text-amber-800">المتاح للخصم: {currency(rental.rentalDeposit)} · المبلغ المتوقع إعادته: {currency(Math.max(0, rental.rentalDeposit - totalDeduction))}</p></div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Input type="number" min="0" value={draft.damage} placeholder="خصم التلف" onChange={(e) => setSettlementDrafts((current) => ({ ...current, [rental.id]: { ...draft, damage: e.target.value } }))} />
                      <Input type="number" min="0" value={draft.late} placeholder="رسوم التأخير" onChange={(e) => setSettlementDrafts((current) => ({ ...current, [rental.id]: { ...draft, late: e.target.value } }))} />
                      <Input value={draft.reason} placeholder="سبب الخصم أو ملاحظة الاسترداد" onChange={(e) => setSettlementDrafts((current) => ({ ...current, [rental.id]: { ...draft, reason: e.target.value } }))} />
                    </div>
                    <Button variant="outline" disabled={busyId === rental.id || totalDeduction > rental.rentalDeposit || (totalDeduction > 0 && !draft.reason.trim())} onClick={() => void settleDeposit(rental)}>
                      {busyId === rental.id ? "جارٍ الحفظ..." : totalDeduction > 0 ? "تسجيل الخصم وإعادة الباقي" : "تأكيد استرداد التأمين كاملًا"}
                    </Button>
                  </div>
                )}
                {rental.rentalDepositStatus !== "pending" && (
                  <div className="rounded-xl border border-green-200 bg-green-50/60 p-4 text-sm text-green-900">تمت التسوية: أعيد للعميل {currency(rental.rentalDepositRefunded)} · خصم التلف {currency(rental.rentalDamageDeduction)} · رسوم التأخير {currency(rental.rentalLateFee)}{rental.rentalDepositReason ? ` · السبب: ${rental.rentalDepositReason}` : ""}</div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
