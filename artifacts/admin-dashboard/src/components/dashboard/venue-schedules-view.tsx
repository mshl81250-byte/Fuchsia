import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, Clock3, LockKeyhole, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type Venue = { id: number; nameAr: string; city: string; address: string; audienceScope: string; isPublished: boolean; ownerName: string | null };
type Slot = { id?: number; audienceScope: string; weekDay: number; period: string; isOpen: boolean; startTime: string | null; endTime: string | null };
type Blackout = { id: number; audienceScope: string; startDate: string; endDate: string; reason: string | null };
type ScheduleResponse = { venue: Venue; availability: Slot[]; blackouts: Blackout[] };
const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: "include", headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "تعذر تنفيذ العملية");
  return body as T;
}

export function VenueSchedulesView() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedId, setSelectedId] = useState<number>();
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blackout, setBlackout] = useState({ startDate: "", endDate: "", audienceScope: "both", reason: "" });

  const loadVenues = async () => {
    setLoading(true);
    try {
      const rows = await request<Venue[]>("/api/admin/venues");
      setVenues(rows);
      if (!selectedId && rows[0]) setSelectedId(rows[0].id);
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحميل القاعات"); }
    finally { setLoading(false); }
  };
  const loadSchedule = async (id: number) => {
    try { setSchedule(await request<ScheduleResponse>(`/api/admin/venues/${id}/schedule`)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحميل الجدول"); }
  };
  useEffect(() => { void loadVenues(); }, []);
  useEffect(() => { if (selectedId) void loadSchedule(selectedId); }, [selectedId]);

  const scope = schedule?.venue.audienceScope === "both" ? "both" : (schedule?.venue.audienceScope || "both");
  const slots = useMemo(() => days.map((_, weekDay) => schedule?.availability.find((slot) => slot.weekDay === weekDay && slot.audienceScope === scope) || { audienceScope: scope, weekDay, period: "all_day", isOpen: false, startTime: "09:00", endTime: "22:00" }), [schedule, scope]);
  const updateSlot = (weekDay: number, updates: Partial<Slot>) => setSchedule((current) => current ? { ...current, availability: current.availability.filter((slot) => !(slot.weekDay === weekDay && slot.audienceScope === scope)).concat({ ...slots[weekDay], ...updates }) } : current);
  const saveSchedule = async () => {
    if (!selectedId) return;
    setSaving(true);
    try { await request(`/api/admin/venues/${selectedId}/schedule`, { method: "PUT", body: JSON.stringify({ slots }) }); toast.success("تم حفظ جدول القاعة"); await loadSchedule(selectedId); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر حفظ الجدول"); }
    finally { setSaving(false); }
  };
  const addBlackout = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId) return;
    try { await request(`/api/admin/venues/${selectedId}/blackouts`, { method: "POST", body: JSON.stringify(blackout) }); toast.success("تمت إضافة فترة الإغلاق"); setBlackout({ startDate: "", endDate: "", audienceScope: "both", reason: "" }); await loadSchedule(selectedId); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر إضافة الإغلاق"); }
  };
  const deleteBlackout = async (id: number) => { if (!selectedId || !window.confirm("هل تريد حذف فترة الإغلاق؟")) return; try { await request(`/api/admin/venues/${selectedId}/blackouts/${id}`, { method: "DELETE" }); toast.success("تم فتح الفترة"); await loadSchedule(selectedId); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر حذف الإغلاق"); } };

  if (loading) return <div className="space-y-4"><Skeleton className="h-14 w-full" /><Skeleton className="h-64 w-full" />;</div>;
  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-bold text-fuchsia-700">إدارة الشركاء</p><h2 className="mt-1 text-3xl font-black">جداول القاعات والتوفر</h2><p className="mt-2 text-sm text-slate-500">تحكم في أيام وساعات العمل والإغلاقات الاستثنائية لكل قاعة.</p></div><Button variant="outline" className="gap-2 rounded-xl" onClick={() => void loadVenues()}><RefreshCw className="h-4 w-4" /> تحديث القاعات</Button></div><div className="grid gap-6 lg:grid-cols-[280px_1fr]"><Card className="h-fit border-0 shadow-sm"><CardHeader><CardTitle className="text-base">القاعات</CardTitle></CardHeader><CardContent className="space-y-2">{venues.map((venue) => <button key={venue.id} className={`w-full rounded-xl border p-3 text-right transition ${selectedId === venue.id ? "border-fuchsia-500 bg-fuchsia-50" : "border-slate-100 hover:bg-slate-50"}`} onClick={() => setSelectedId(venue.id)}><p className="font-bold">{venue.nameAr}</p><p className="mt-1 text-xs text-slate-500">{venue.city} · {venue.ownerName || "بدون شريك"}</p><Badge variant={venue.isPublished ? "default" : "secondary"} className="mt-2">{venue.isPublished ? "منشورة" : "مسودة"}</Badge></button>)}{venues.length === 0 && <p className="py-8 text-center text-sm text-slate-400">لا توجد قاعات</p>}</CardContent></Card><div className="space-y-6">{schedule && <><Card className="border-0 shadow-sm"><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-fuchsia-700" /> {schedule.venue.nameAr}</CardTitle><p className="mt-1 text-sm text-slate-500">نطاق الحضور: {schedule.venue.audienceScope}</p></div><Button className="gap-2" disabled={saving} onClick={() => void saveSchedule()}><Save className="h-4 w-4" />{saving ? "جارٍ الحفظ…" : "حفظ الجدول"}</Button></CardHeader><CardContent className="space-y-3">{slots.map((slot, index) => <div key={slot.weekDay} className="grid items-center gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-[120px_100px_1fr_1fr]"><div className="font-bold">{days[index]}</div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={slot.isOpen} onChange={(event) => updateSlot(index, { isOpen: event.target.checked })} /><Check className="h-4 w-4 text-emerald-600" /> مفتوح</label><label className="flex items-center gap-2 text-sm text-slate-500"><Clock3 className="h-4 w-4" /><Input type="time" disabled={!slot.isOpen} value={slot.startTime || "09:00"} onChange={(event) => updateSlot(index, { startTime: event.target.value })} /></label><label className="flex items-center gap-2 text-sm text-slate-500"><Clock3 className="h-4 w-4" /><Input type="time" disabled={!slot.isOpen} value={slot.endTime || "22:00"} onChange={(event) => updateSlot(index, { endTime: event.target.value })} /></label></div>)}</CardContent></Card><Card className="border-0 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><LockKeyhole className="h-5 w-5 text-amber-600" /> الإغلاقات الاستثنائية</CardTitle></CardHeader><CardContent><form onSubmit={addBlackout} className="grid gap-3 md:grid-cols-5"><div><Label>من</Label><Input required type="date" value={blackout.startDate} onChange={(event) => setBlackout({ ...blackout, startDate: event.target.value })} /></div><div><Label>إلى</Label><Input required type="date" value={blackout.endDate} onChange={(event) => setBlackout({ ...blackout, endDate: event.target.value })} /></div><div><Label>القسم</Label><select className="h-10 w-full rounded-md border bg-background px-3" value={blackout.audienceScope} onChange={(event) => setBlackout({ ...blackout, audienceScope: event.target.value })}><option value="both">الكل</option><option value="women">نساء</option><option value="men">رجال</option></select></div><div><Label>السبب</Label><Input value={blackout.reason} onChange={(event) => setBlackout({ ...blackout, reason: event.target.value })} placeholder="اختياري" /></div><div className="flex items-end"><Button type="submit" className="w-full">إضافة إغلاق</Button></div></form><div className="mt-5 space-y-2">{schedule.blackouts.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><div><p className="font-bold">{item.startDate} — {item.endDate}</p><p className="text-xs text-slate-500">{item.reason || "بدون سبب"} · {item.audienceScope}</p></div><Button variant="ghost" size="icon" className="text-rose-600" onClick={() => void deleteBlackout(item.id)}><Trash2 className="h-4 w-4" /></Button></div>)}{schedule.blackouts.length === 0 && <p className="py-5 text-center text-sm text-slate-400">لا توجد إغلاقات استثنائية</p>}</div></CardContent></Card></>}</div></div></div>;
}
