import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Store, UserRoundCheck, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type StoreOwnerLink = {
  id: number;
  nameAr: string;
  ownerUserId: number | null;
  ownerName: string | null;
  ownerEmail: string | null;
};

export function StoreOwnersView() {
  const [stores, setStores] = useState<StoreOwnerLink[]>([]);
  const [ownerIds, setOwnerIds] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/store-owner-links", { credentials: "include", cache: "no-store" });
    if (!response.ok) throw new Error("تعذر تحميل متاجر التأجير");
    const rows = await response.json() as StoreOwnerLink[];
    setStores(rows);
    setOwnerIds(Object.fromEntries(rows.map((store) => [store.id, store.ownerUserId ? String(store.ownerUserId) : ""])));
  }, []);

  useEffect(() => {
    void load().catch((error) => toast.error(error instanceof Error ? error.message : "حدث خطأ"))
      .finally(() => setLoading(false));
  }, [load]);

  const assign = async (storeId: number, forcedOwnerId?: number | null) => {
    const raw = ownerIds[storeId]?.trim() || "";
    if (forcedOwnerId === undefined && !raw) { toast.error("أدخل رقم حساب المالك؛ استخدم زر فك الربط لإزالة المالك الحالي"); return; }
    const ownerUserId = forcedOwnerId !== undefined ? forcedOwnerId : raw ? Number(raw) : null;
    if (ownerUserId !== null && (!Number.isInteger(ownerUserId) || ownerUserId < 1)) {
      toast.error("أدخل رقم حساب صحيحًا من تبويب العملاء أو اتركه فارغًا لفك الربط");
      return;
    }
    setBusy(storeId);
    try {
      const response = await fetch(`/api/admin/stores/${storeId}/owner`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerUserId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || "تعذر ربط مالك المتجر");
      }
      await load();
      toast.success(ownerUserId === null ? "تم فك ربط المتجر" : "تم ربط المتجر بحساب المالك");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ");
    } finally {
      setBusy(null);
    }
  };

  return <div className="space-y-6">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-2xl font-bold">ملاك متاجر التأجير</h2><p className="text-muted-foreground">اربط متجر الكوش أو الطاولات بحساب مستخدم موثّق حتى يتمكن صاحبه من إدارة كتالوجه.</p></div>
      <Button variant="outline" onClick={() => void load()} disabled={loading} className="gap-2"><RefreshCw className="h-4 w-4" /> تحديث</Button>
    </div>
    <div className="grid gap-4">
      {stores.map((store) => <Card key={store.id}><CardContent className="p-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-[220px] space-y-2">
          <div className="flex items-center gap-2"><Store className="h-5 w-5 text-primary" /><h3 className="text-lg font-bold">{store.nameAr}</h3></div>
          <p className="text-sm text-muted-foreground">{store.ownerUserId ? `المالك الحالي: ${store.ownerName || "مستخدم"} · حساب #${store.ownerUserId}${store.ownerEmail ? ` · ${store.ownerEmail}` : ""}` : "لا يوجد مالك مرتبط بهذا المتجر بعد."}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1"><Label htmlFor={`owner-${store.id}`}>رقم حساب المالك</Label><Input id={`owner-${store.id}`} inputMode="numeric" value={ownerIds[store.id] || ""} onChange={(event) => setOwnerIds((current) => ({ ...current, [store.id]: event.target.value.replace(/\D/g, "") }))} placeholder="معرّف المستخدم" className="w-44" /></div>
          <Button disabled={busy === store.id} onClick={() => void assign(store.id)} className="gap-2"><UserRoundCheck className="h-4 w-4" /> ربط المالك</Button>
          {store.ownerUserId && <Button disabled={busy === store.id} variant="outline" onClick={() => { setOwnerIds((current) => ({ ...current, [store.id]: "" })); void assign(store.id, null); }} className="gap-2 text-red-700"><Unlink className="h-4 w-4" /> فك الربط</Button>}
        </div>
      </CardContent></Card>)}
      {!loading && stores.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد متاجر لربطها.</CardContent></Card>}
    </div>
  </div>;
}
