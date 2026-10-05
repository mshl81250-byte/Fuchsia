import { useGetCart, getGetCartQueryKey, useCreateOrder } from "@workspace/api-client-react";
import { useSession } from "@/hooks/use-session";
import { getStoredUser } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/format";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Wallet, Upload, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

const checkoutSchema = z.object({
  customerName: z.string().min(2, "يرجى إدخال الاسم كاملاً"),
  customerPhone: z.string().min(9, "يرجى إدخال رقم هاتف صحيح"),
  deliveryAddress: z.string().min(10, "يرجى إدخال عنوان التوصيل بالتفصيل"),
  paymentMethod: z.string().min(1),
  notes: z.string().optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;
type PaymentWallet = { id: number; nameAr: string; accountNumber: string; instructions?: string | null; iconUrl?: string | null };

export default function Checkout() {
  const { sessionId, isReady } = useSession();
  const user = getStoredUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createOrderMutation = useCreateOrder();
  const [wallets, setWallets] = useState<PaymentWallet[]>([]);
  const [paymentType, setPaymentType] = useState<"cash_on_delivery" | "full" | "partial">("cash_on_delivery");
  const [walletId, setWalletId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState("");
  const [receiptFileName, setReceiptFileName] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [giftRecipientName, setGiftRecipientName] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [giftCardStyle, setGiftCardStyle] = useState("elegant");
  const [hidePrice, setHidePrice] = useState(true);
  const [scheduledDelivery, setScheduledDelivery] = useState("");

  useEffect(() => {
    fetch("/api/payment-wallets").then(r => r.ok ? r.json() : []).then(setWallets).catch(() => setWallets([]));
  }, []);

  const { data: cart, isLoading } = useGetCart(
    { sessionId },
    { query: { enabled: isReady, queryKey: getGetCartQueryKey({ sessionId }) } }
  );

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: user?.fullName ?? "",
      customerPhone: user?.phone ?? "",
      deliveryAddress: user?.address ?? "",
      paymentMethod: "cash_on_delivery",
      notes: "",
    },
  });

  const onSubmit = async (values: CheckoutFormValues) => {
    if (!cart || cart.items.length === 0) return;
    if (paymentType !== "cash_on_delivery" && (!walletId || !transactionReference || !paymentReceiptUrl)) {
      toast({ variant: "destructive", title: "بيانات الدفع ناقصة", description: "اختر المحفظة وأدخل رقم العملية وأرفق الإيصال" });
      return;
    }
    if (paymentType === "partial" && (!paymentAmount || Number(paymentAmount) <= 0 || Number(paymentAmount) > cart.total)) {
      toast({ variant: "destructive", title: "مبلغ غير صحيح", description: "أدخل مبلغاً جزئياً صحيحاً" });
      return;
    }
    if (isGift && !giftRecipientName.trim()) {
      toast({ variant: "destructive", title: "بيانات الهدية ناقصة", description: "أدخل اسم مستلم الهدية" });
      return;
    }
    try {
      const order = await createOrderMutation.mutateAsync({
        data: {
          sessionId,
          customerName: values.customerName,
          customerPhone: values.customerPhone,
          deliveryAddress: values.deliveryAddress,
          paymentMethod: paymentType === "cash_on_delivery" ? "cash_on_delivery" : `wallet_${walletId}`,
          paymentType,
          paymentWalletId: walletId ? Number(walletId) : null,
          paymentAmount: paymentType === "full" ? cart.total : Number(paymentAmount || 0),
          transactionReference: transactionReference || null,
          paymentReceiptUrl: paymentReceiptUrl || null,
          isGift,
          giftRecipientName: isGift ? giftRecipientName.trim() : null,
          giftMessage: isGift ? giftMessage.trim() || null : null,
          giftCardStyle: isGift ? giftCardStyle : null,
          hidePrice: isGift ? hidePrice : false,
          scheduledDelivery: scheduledDelivery || null,
          notes: values.notes ?? null,
          couponCode: cart.couponCode,
          userId: user?.id ?? null,
        } as any,
      });
      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey({ sessionId }) });
      toast({ title: "تم استلام طلبك!", description: "شكراً لاختيارك فوشيا. سيتم التواصل معك قريباً." });
      setLocation(`/order/${order.id}`);
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ أثناء إتمام الطلب" });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-10 w-48 mb-8" />
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4 text-[#1A1A1A]">عذراً، سلتك فارغة</h2>
        <Button asChild style={{ background: "linear-gradient(135deg, #D81B60, #F48FB1)" }} className="text-white">
          <Link href="/">العودة للرئيسية</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-serif font-bold text-[#1A1A1A] mb-8">إتمام الطلب</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#F0D4E5] p-6 shadow-sm space-y-5">
                <h3 className="font-bold text-lg text-[#1A1A1A] border-b border-[#F0D4E5] pb-4">معلومات التوصيل</h3>
                <FormField control={form.control} name="customerName" render={({ field }) => (
                  <FormItem>
                    <Label className="text-[#1A1A1A] font-medium">الاسم الكامل</Label>
                    <FormControl><Input placeholder="الاسم ثلاثي" className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-12" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="customerPhone" render={({ field }) => (
                  <FormItem>
                    <Label className="text-[#1A1A1A] font-medium">رقم الهاتف</Label>
                    <FormControl><Input placeholder="77X XXX XXX" dir="ltr" className="text-right bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-12" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="deliveryAddress" render={({ field }) => (
                  <FormItem>
                    <Label className="text-[#1A1A1A] font-medium">عنوان التوصيل في صنعاء</Label>
                    <FormControl><Textarea placeholder="المنطقة، الشارع، أقرب معلم بارز..." className="resize-none bg-[#FFF0F6] border-[#F0D4E5] rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="bg-[#FFF0F6] border border-[#F0D4E5] rounded-2xl p-4 flex items-start gap-3">
                <Wallet className="w-5 h-5 text-[#D81B60] mt-0.5 shrink-0" />
                <div><p className="font-bold text-[#1A1A1A]">اختر طريقة السداد المناسبة</p><p className="text-sm text-[#6B6B6B] mt-1">يمكنك الدفع كاملاً عبر محفظة إلكترونية، أو دفع عربون وتكملة الباقي عند التوصيل.</p></div>
              </div>

              <div className="bg-white rounded-2xl border border-[#F0D4E5] p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-lg text-[#1A1A1A] border-b border-[#F0D4E5] pb-4">تفاصيل التحويل والدفع</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[["cash_on_delivery", "الدفع عند التوصيل"], ["full", "دفع كامل الآن"], ["partial", "دفع جزء الآن"]].map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setPaymentType(value as typeof paymentType)}
                      className={`rounded-xl border-2 p-3 text-sm font-bold ${paymentType === value ? "border-[#D81B60] bg-[#FFF0F6] text-[#D81B60]" : "border-[#F0D4E5]"}`}>{label}</button>
                  ))}
                </div>
                {paymentType !== "cash_on_delivery" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {wallets.map(wallet => (
                        <button key={wallet.id} type="button" onClick={() => setWalletId(String(wallet.id))}
                          className={`text-right rounded-xl border-2 p-3 ${walletId === String(wallet.id) ? "border-[#D81B60] bg-[#FFF0F6]" : "border-[#F0D4E5]"}`}>
                          <div className="flex items-center gap-3">
                            {wallet.iconUrl ? <img src={wallet.iconUrl} alt="" className="w-10 h-10 rounded-lg object-contain" /> : <div className="w-10 h-10 rounded-lg bg-[#D81B60] text-white flex items-center justify-center font-bold">{wallet.nameAr.slice(0, 1)}</div>}
                            <div><p className="font-bold">{wallet.nameAr}</p><p className="text-xs text-[#6B6B6B]" dir="ltr">{wallet.accountNumber}</p></div>
                          </div>
                          {wallet.instructions && <p className="text-xs text-[#6B6B6B] mt-2">{wallet.instructions}</p>}
                        </button>
                      ))}
                    </div>
                    {wallets.length === 0 && <p className="text-sm text-amber-700 bg-amber-50 rounded-xl p-3">لا توجد محافظ متاحة حالياً. اختر الدفع عند التوصيل أو تواصل معنا.</p>}
                    {paymentType === "partial" && <div><Label>مبلغ العربون المدفوع الآن</Label><Input type="number" min="1" max={cart.total} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder={String(Math.ceil(cart.total / 2))} dir="ltr" className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-12" /><p className="text-xs text-[#6B6B6B] mt-1">المتبقي عند التوصيل: {formatCurrency(Math.max(0, cart.total - Number(paymentAmount || 0)))}</p></div>}
                    {paymentType === "full" && <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-100 p-3 text-sm text-green-800"><CheckCircle2 className="w-4 h-4" /> سيتم تسجيل كامل الإجمالي: {formatCurrency(cart.total)}</div>}
                    <div><Label>رقم العملية</Label><Input value={transactionReference} onChange={e => setTransactionReference(e.target.value)} placeholder="أدخل رقم العملية" dir="ltr" className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-12" /></div>
                    <div><Label>إيصال التحويل <span className="text-xs text-[#6B6B6B]">(صورة أو PDF، حد أقصى 5MB)</span></Label><label className="mt-1 flex items-center gap-3 cursor-pointer rounded-xl border-2 border-dashed border-[#D81B60]/40 bg-[#FFF0F6] p-4 hover:border-[#D81B60]"><Upload className="w-5 h-5 text-[#D81B60]" /><span className="text-sm">{receiptFileName || "اضغط لاختيار الإيصال"}</span><Input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { toast({ variant: "destructive", title: "الملف كبير", description: "الحد الأقصى لحجم الإيصال هو 5MB" }); e.target.value = ""; return; } setReceiptFileName(file.name); const reader = new FileReader(); reader.onload = () => setPaymentReceiptUrl(String(reader.result)); reader.readAsDataURL(file); }} /></label></div>
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-3">سيتم مراجعة التحويل يدوياً، وبعد اعتماده تتغير حالة الدفع في طلبك.</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-[#F0D4E5] p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div><h3 className="font-bold text-lg text-[#1A1A1A]">هل الطلب هدية؟</h3><p className="text-sm text-[#6B6B6B]">سنجهزها ونوصلها باسم الشخص الذي تختاره</p></div>
                  <button type="button" onClick={() => setIsGift(v => !v)} aria-pressed={isGift} className={`relative w-14 h-8 rounded-full transition-colors ${isGift ? "bg-[#D81B60]" : "bg-[#E8D9E2]"}`}><span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${isGift ? "right-1" : "left-1"}`} /></button>
                </div>
                {isGift && <div className="space-y-4 border-t border-[#F0D4E5] pt-4">
                  <div><Label>اسم مستلم الهدية</Label><Input required value={giftRecipientName} onChange={e => setGiftRecipientName(e.target.value)} placeholder="مثال: سارة محمد" className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-12" /></div>
                  <div><Label>رسالة بطاقة الهدية <span className="text-xs text-[#6B6B6B]">(اختياري)</span></Label><Textarea value={giftMessage} onChange={e => setGiftMessage(e.target.value)} placeholder="اكتب رسالة جميلة مع الهدية..." className="resize-none bg-[#FFF0F6] border-[#F0D4E5] rounded-xl" /></div>
                  <div><Label>تصميم البطاقة</Label><select value={giftCardStyle} onChange={e => setGiftCardStyle(e.target.value)} className="w-full h-12 rounded-xl border border-[#F0D4E5] bg-[#FFF0F6] px-3"><option value="elegant">أنيق وناعم</option><option value="celebration">احتفالي</option><option value="floral">ورود فاخرة</option></select></div>
                  <div><Label>موعد التوصيل <span className="text-xs text-[#6B6B6B]">(اختياري)</span></Label><Input type="datetime-local" value={scheduledDelivery} onChange={e => setScheduledDelivery(e.target.value)} className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-12" /></div>
                  <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={hidePrice} onChange={e => setHidePrice(e.target.checked)} className="accent-[#D81B60] w-4 h-4" /> إخفاء السعر عن مستلم الهدية</label>
                </div>}
              </div>

              <div className="bg-white rounded-2xl border border-[#F0D4E5] p-6 shadow-sm">
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <Label className="text-[#1A1A1A] font-medium">ملاحظات إضافية <span className="text-[#6B6B6B] font-normal text-sm">(اختياري)</span></Label>
                    <FormControl><Textarea placeholder="أي تعليمات خاصة..." className="resize-none bg-[#FFF0F6] border-[#F0D4E5] rounded-xl" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full h-14 rounded-2xl text-white text-lg font-bold lg:hidden"
                style={{ background: "linear-gradient(135deg, #D81B60, #F48FB1 150%)", boxShadow: "0 4px 16px #D81B6040" }}
                disabled={createOrderMutation.isPending}
              >
                {createOrderMutation.isPending ? "جاري الإرسال..." : "تأكيد الطلب"}
              </motion.button>
            </form>
          </Form>
        </div>

        <div className="w-full lg:w-96 shrink-0">
          <div className="bg-white rounded-2xl border border-[#F0D4E5] p-6 sticky top-24 shadow-sm">
            <h3 className="font-bold text-lg mb-5 border-b border-[#F0D4E5] pb-4 text-[#1A1A1A]">ملخص الطلب</h3>
            <div className="flex flex-col gap-3 mb-5 max-h-52 overflow-y-auto">
              {cart.items.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#FFF0F6] rounded-xl overflow-hidden shrink-0 border border-[#F0D4E5]">
                    <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1 text-[#1A1A1A]">{item.productName}</p>
                    <p className="text-xs text-[#6B6B6B]">الكمية: {item.quantity}</p>
                  </div>
                  <span className="text-sm font-bold text-[#D81B60] shrink-0">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 text-sm border-t border-[#F0D4E5] pt-4 mb-5">
              <div className="flex justify-between text-[#6B6B6B]"><span>المجموع الفرعي</span><span>{formatCurrency(cart.subtotal)}</span></div>
              <div className="flex justify-between text-[#6B6B6B]"><span>رسوم التوصيل</span><span>{formatCurrency(cart.deliveryFee)}</span></div>
              {(cart.discount ?? 0) > 0 && <div className="flex justify-between text-green-600"><span>الخصم</span><span>-{formatCurrency(cart.discount ?? 0)}</span></div>}
              <div className="flex justify-between text-xl font-bold text-[#D81B60] pt-2 border-t border-[#F0D4E5]">
                <span>الإجمالي</span><span>{formatCurrency(cart.total)}</span>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              className="w-full h-14 rounded-2xl text-white text-base font-bold hidden lg:flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #D81B60, #F48FB1 150%)", boxShadow: "0 4px 16px #D81B6040" }}
              onClick={form.handleSubmit(onSubmit)}
              disabled={createOrderMutation.isPending}
            >
              {createOrderMutation.isPending ? "جاري الإرسال..." : "تأكيد الطلب"}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
