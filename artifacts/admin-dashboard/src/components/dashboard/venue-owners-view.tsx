import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Building2, Phone, RefreshCw, ShieldOff, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type OwnerRequest = {
  id: number;
  userId: number;
  businessName: string;
  contactPhone: string;
  status: "pending" | "active" | "suspended";
  createdAt: string;
};

const statusLabel: Record<OwnerRequest["status"], string> = {
  pending: "بانتظار الاعتماد",
  active: "معتمد",
  suspended: "موقوف",
};

export function VenueOwnersView() {
  const [owners, setOwners] = useState<OwnerRequest[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/venue-owners", { credentials: "include", cache: "no-store" });
    if (!response.ok) throw new Error("تعذر تحميل طلبات الشراكة");
    setOwners(await response.json());
  }, []);

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
      toast.success(status === "active" ? "تم اعتماد الشريك" : status === "suspended" ? "تم إيقاف الشريك" : "تم تحديث الحالة");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ");
    } finally {
      setBusy(null);
    }
  };

  return <div className="space-y-6">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-2xl font-bold">أصحاب القاعات</h2><p className="text-muted-foreground">راجع طلبات الشراكة واعتمد الحسابات قبل السماح بإضافة القاعات.</p></div>
      <Button variant="outline" onClick={() => void load()} disabled={loading} className="gap-2"><RefreshCw className="h-4 w-4" /> تحديث</Button>
    </div>
    <div className="grid gap-4">
      {owners.map((owner) => <Card key={owner.id}><CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2"><Building2 className="h-5 w-5 text-primary" /><h3 className="font-bold text-lg">{owner.businessName}</h3><Badge variant={owner.status === "active" ? "default" : "secondary"}>{statusLabel[owner.status]}</Badge></div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1"><Phone className="h-4 w-4" />{owner.contactPhone}</span><span>حساب المستخدم #{owner.userId}</span><span>{new Date(owner.createdAt).toLocaleDateString("ar-YE")}</span></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {owner.status !== "active" && <Button disabled={busy === owner.id} onClick={() => void setStatus(owner.id, "active")} className="gap-2"><UserRoundCheck className="h-4 w-4" /> اعتماد</Button>}
          {owner.status === "active" && <Button disabled={busy === owner.id} variant="outline" onClick={() => void setStatus(owner.id, "suspended")} className="gap-2 text-red-700"><ShieldOff className="h-4 w-4" /> إيقاف</Button>}
          {owner.status === "suspended" && <Badge variant="outline" className="gap-1"><BadgeCheck className="h-4 w-4" /> يمكن إعادة الاعتماد</Badge>}
        </div>
      </CardContent></Card>)}
      {!loading && owners.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد طلبات شراكة بعد.</CardContent></Card>}
    </div>
  </div>;
}
