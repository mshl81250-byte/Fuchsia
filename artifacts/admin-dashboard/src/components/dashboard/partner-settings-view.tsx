import { useEffect, useState } from "react";
import { CheckCircle2, FileText, Moon, ShieldCheck, Sun, Truck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_PRIVACY = `نحترم خصوصية الشريك ونستخدم البيانات اللازمة لتشغيل خدمات فوشيا بوتيك فقط. قد تشمل البيانات اسم النشاط، بيانات التواصل، بيانات القاعات، صورها، الطلبات والحجوزات وحالة الحساب.

نستخدم هذه البيانات لإدارة القاعات والطلبات والحجوزات، التواصل بشأن العمليات، تحسين الخدمة، ومنع الاستخدام غير المصرح به. لا نبيع بيانات الشريك، ولا نشاركها إلا عند الحاجة لتقديم الخدمة أو تنفيذ المتطلبات النظامية.

يجب على الشريك عدم رفع صور أو بيانات لا يملك حق استخدامها، وعدم إدخال بيانات عملاء إلا لغرض تنفيذ الطلب. يمكنك طلب تصحيح بيانات نشاطك أو الاستفسار عن استخدامها عبر قنوات الدعم المعتمدة.`;

const DEFAULT_TERMS = `باستخدام تطبيق التاجر، يقر الشريك بأن البيانات التي يقدمها صحيحة ومحدثة، وأنه مسؤول عن الأسعار، التوفر، الصور، وصف القاعة، وسياسات التنفيذ التي يعرضها للعملاء.

يلتزم الشريك بتأكيد أو تحديث حالات الطلبات والحجوزات من التطبيق، وتقديم بيانات موصل صحيحة عند اختيار التوصيل، والمحافظة على سرية حسابه ورمز الدخول.

لا يجوز نشر محتوى مخالف أو مضلل أو صور لا يملك الشريك حقوق استخدامها. يحق للإدارة مراجعة المحتوى وتعليق الحساب عند وجود مخالفة أو إساءة استخدام، مع إشعار الشريك بحسب الإجراءات المعتمدة.

تظل شروط المنصة وسياسة الخصوصية قابلة للتحديث، ويظهر الإصدار الأحدث داخل التطبيق.`;

function loadText(key: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) || fallback;
}

export function PartnerSettingsView() {
  const [darkDefault, setDarkDefault] = useState(true);
  const [privacy, setPrivacy] = useState(DEFAULT_PRIVACY);
  const [terms, setTerms] = useState(DEFAULT_TERMS);

  useEffect(() => {
    setDarkDefault(loadText("fuchsia-partner-default-theme", "dark") !== "light");
    setPrivacy(loadText("fuchsia-partner-privacy", DEFAULT_PRIVACY));
    setTerms(loadText("fuchsia-partner-terms", DEFAULT_TERMS));
  }, []);

  const save = () => {
    window.localStorage.setItem("fuchsia-partner-default-theme", darkDefault ? "dark" : "light");
    window.localStorage.setItem("fuchsia-partner-privacy", privacy);
    window.localStorage.setItem("fuchsia-partner-terms", terms);
    toast.success("تم حفظ إعدادات تطبيق التاجر");
  };

  return (
    <div className="space-y-6">
      <div><h2 className="text-3xl font-black tracking-tight">إعدادات تطبيق التاجر</h2><p className="mt-2 text-sm text-muted-foreground">مرجع موحّد لإعدادات التطبيق، السياسات، والتوصيل. قسم الطلبات يبقى المصدر التشغيلي لتعيين الموصّل.</p></div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-sm ring-1 ring-black/[0.05]"><CardContent className="flex items-start gap-3 p-5"><span className="rounded-2xl bg-primary/10 p-3 text-primary"><Truck className="h-5 w-5" /></span><div><p className="font-bold">بيانات الموصّل</p><p className="mt-1 text-xs text-muted-foreground">الاسم والرقم يُداران من شاشة الطلب.</p></div></CardContent></Card>
        <Card className="border-0 shadow-sm ring-1 ring-black/[0.05]"><CardContent className="flex items-start gap-3 p-5"><span className="rounded-2xl bg-primary/10 p-3 text-primary"><ShieldCheck className="h-5 w-5" /></span><div><p className="font-bold">حماية البيانات</p><p className="mt-1 text-xs text-muted-foreground">السياسة والشروط ظاهرة للتاجر داخل التطبيق.</p></div></CardContent></Card>
        <Card className="border-0 shadow-sm ring-1 ring-black/[0.05]"><CardContent className="flex items-start gap-3 p-5"><span className="rounded-2xl bg-primary/10 p-3 text-primary"><CheckCircle2 className="h-5 w-5" /></span><div><p className="font-bold">حالات موحّدة</p><p className="mt-1 text-xs text-muted-foreground">مستلم، تجهيز، توصيل، وتسليم.</p></div></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Moon className="h-5 w-5 text-primary" /> الوضع الافتراضي</CardTitle><CardDescription>اختيار العرض الأول عند فتح تطبيق التاجر. يستطيع التاجر تغييره من إعدادات التطبيق.</CardDescription></CardHeader><CardContent className="flex items-center justify-between rounded-2xl bg-muted/40 p-4"><div className="flex items-center gap-3"><Sun className="h-4 w-4 text-muted-foreground" /><div><Label htmlFor="partner-theme">الوضع الليلي افتراضيًا</Label><p className="text-xs text-muted-foreground">الخلفية الليلية الرسمية #100B0F والعنابي #760032</p></div></div><Switch id="partner-theme" checked={darkDefault} onCheckedChange={setDarkDefault} /></CardContent></Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> سياسة الخصوصية للتاجر</CardTitle><CardDescription>النص الذي تتم مراجعته قبل نشره في تطبيق التاجر.</CardDescription></CardHeader><CardContent><Textarea value={privacy} onChange={e => setPrivacy(e.target.value)} className="min-h-72 leading-7" dir="rtl" /><Badge variant="outline" className="mt-3">نص قابل للمراجعة</Badge></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> شروط استخدام تطبيق التاجر</CardTitle><CardDescription>الشروط التشغيلية الخاصة بالشريك والتوصيل والمحتوى.</CardDescription></CardHeader><CardContent><Textarea value={terms} onChange={e => setTerms(e.target.value)} className="min-h-72 leading-7" dir="rtl" /><Badge variant="outline" className="mt-3">نص قابل للمراجعة</Badge></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>ضوابط بيانات الموصّل</CardTitle><CardDescription>تطبيق التاجر يطلب الاسم والرقم عند نقل الطلب إلى التوصيل أو التسليم.</CardDescription></CardHeader><CardContent className="grid gap-3 text-sm md:grid-cols-2"><div className="rounded-xl border bg-muted/20 p-4">يجب أن يحتوي الاسم على حرفين على الأقل.</div><div className="rounded-xl border bg-muted/20 p-4">رقم الهاتف من 7 إلى 20 خانة ويقبل + والمسافات والشرطات.</div><div className="rounded-xl border bg-muted/20 p-4">الحالات: مستلم، قيد التجهيز، مع الموصّل، تم التسليم.</div><div className="rounded-xl border bg-muted/20 p-4">الحفظ التشغيلي يتم من شاشة الطلبات مع سجل الحالة.</div></CardContent></Card>
      <div className="flex justify-end"><Button onClick={save} className="min-w-40">حفظ إعدادات التاجر</Button></div>
    </div>
  );
}
