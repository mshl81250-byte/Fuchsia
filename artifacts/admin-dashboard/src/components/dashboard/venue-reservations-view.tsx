import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle, ExternalLink, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Reservation = {
  id: number; storeName: string | null; reservationAt: string; partySize: number; customerName: string; customerPhone: string;
  status: string; paymentType: string; paymentAmount: number; platformFee: number; paymentWalletId: number | null;
  transactionReference: string | null; paymentReceiptUrl: string | null; paymentStatus: string;
};
const labels: Record<string, string> = { pending: "بانتظار المراجعة", confirmed: "مقبول", rejected: "مرفوض", cancelled: "ملغي", completed: "مكتمل" };
const money = (value: number) => `${Number(value || 0).toLocaleString("ar-YE")} ريال`;

export function VenueReservationsView() {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const load = async () => { const r = await fetch("/api/admin/reservations", { credentials: "include" }); if (!r.ok) throw new Error("تعذر تحميل الحجوزات"); setRows(await r.json()); };
  useEffect(() => { void load().catch((e) => toast.error(e.message)); }, []);
  const reservedDates = useMemo(() => [...new Set(rows.filter((r) => r.status === "confirmed").map((r) => new Date(r.reservationAt).toLocaleDateString("ar-YE")))], [rows]);
  const update = async (id: number, status: string) => { setBusy(id); try { const r = await fetch(`/api/admin/reservations/${id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); if (!r.ok) throw new Error("تعذر تحديث الحجز"); await load(); toast.success(status === "confirmed" ? "تم قبول الحجز" : "تم رفض/إلغاء الحجز"); } catch (e) { toast.error(e instanceof Error ? e.message : "حدث خطأ"); } finally { setBusy(null); } };
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">حجوزات القاعات والدفع</h2><p className="text-muted-foreground">راجع التوفر، العربون أو الدفع الكامل، ثم اعتمد الحجز أو ارفضه.</p></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> الأيام المحجوزة المؤكدة ({reservedDates.length})</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-2">{reservedDates.length ? reservedDates.map((d) => <Badge key={d} variant="secondary">{d}</Badge>) : <span className="text-sm text-muted-foreground">لا توجد أيام مؤكدة بعد.</span>}</div></CardContent></Card>
    <div className="grid gap-4">{rows.map((r) => <Card key={r.id}><CardContent className="p-5 space-y-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-lg">{r.storeName || "قاعة أعراس"}</h3><p className="text-sm text-muted-foreground">{new Date(r.reservationAt).toLocaleString("ar-YE")} · {r.partySize} ضيف · {r.customerName} · {r.customerPhone}</p></div><Badge>{labels[r.status] || r.status}</Badge></div><div className="rounded-xl bg-muted/50 p-4 grid sm:grid-cols-3 gap-2 text-sm"><span>الدفع: <b>{r.paymentType === "full" ? "كامل" : "عربون"}</b></span><span>المبلغ: <b>{money(r.paymentAmount)}</b></span><span>العمولة: <b>{money(r.platformFee)}</b></span><span>رقم العملية: <b>{r.transactionReference || "—"}</b></span><span>حالة الدفع: <b>{r.paymentStatus}</b></span></div>{r.paymentReceiptUrl && <a className="inline-flex items-center gap-2 text-primary underline" href={r.paymentReceiptUrl} target="_blank" rel="noreferrer">فتح إيصال التحويل <ExternalLink className="h-4 w-4" /></a>}<div className="flex flex-wrap gap-2">{r.status === "pending" && <><Button disabled={busy === r.id} onClick={() => void update(r.id, "confirmed")} className="gap-2"><CheckCircle className="h-4 w-4" /> قبول الحجز والدفع</Button><Button disabled={busy === r.id} variant="outline" className="gap-2 text-red-700" onClick={() => void update(r.id, "rejected")}><XCircle className="h-4 w-4" /> رفض الإيصال/عدم التوفر</Button></>}{r.status === "confirmed" && <Button disabled={busy === r.id} variant="outline" className="gap-2 text-red-700" onClick={() => void update(r.id, "cancelled")}><XCircle className="h-4 w-4" /> إلغاء الحجز</Button>}</div></CardContent></Card>)}{rows.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد حجوزات قاعات حاليًا.</CardContent></Card>}</div>
  </div>;
}
