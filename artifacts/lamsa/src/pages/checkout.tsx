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
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CreditCard, Wallet, Building2, Banknote } from "lucide-react";

const PAYMENT_METHODS = [
  { value: "cash_on_delivery", label: "الدفع عند الاستلام", icon: Banknote },
  { value: "jaib", label: "محفظة جيب", icon: Wallet },
  { value: "flousy", label: "محفظة فلوسك", icon: Wallet },
  { value: "mobile_money", label: "موبايل موني", icon: CreditCard },
  { value: "jawali", label: "محفظة جوالي", icon: Wallet },
  { value: "cash", label: "كاش", icon: Banknote },
  { value: "one_cash", label: "ون كاش", icon: CreditCard },
  { value: "bank_transfer", label: "التحويل البنكي", icon: Building2 },
] as const;

const checkoutSchema = z.object({
  customerName: z.string().min(2, "يرجى إدخال الاسم كاملاً"),
  customerPhone: z.string().min(9, "يرجى إدخال رقم هاتف صحيح"),
  deliveryAddress: z.string().min(10, "يرجى إدخال عنوان التوصيل بالتفصيل"),
  paymentMethod: z.string().min(1),
  notes: z.string().optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const { sessionId, isReady } = useSession();
  const user = getStoredUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createOrderMutation = useCreateOrder();

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
    try {
      const order = await createOrderMutation.mutateAsync({
        data: {
          sessionId,
          customerName: values.customerName,
          customerPhone: values.customerPhone,
          deliveryAddress: values.deliveryAddress,
          paymentMethod: values.paymentMethod as any,
          notes: values.notes ?? null,
          couponCode: cart.couponCode,
          userId: user?.id ?? null,
        },
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

              <div className="bg-white rounded-2xl border border-[#F0D4E5] p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-lg text-[#1A1A1A] border-b border-[#F0D4E5] pb-4">طريقة الدفع</h3>
                <Controller control={form.control} name="paymentMethod" render={({ field }) => (
                  <div className="grid grid-cols-2 gap-3">
                    {PAYMENT_METHODS.map(method => {
                      const Icon = method.icon;
                      const isSelected = field.value === method.value;
                      return (
                        <motion.button
                          key={method.value}
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={() => field.onChange(method.value)}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-right ${
                            isSelected
                              ? "border-[#D81B60] bg-[#FFF0F6]"
                              : "border-[#F0D4E5] bg-white hover:border-[#D81B60]/50"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? "bg-[#D81B60]" : "bg-[#FFF0F6]"}`}>
                            <Icon className={`w-4 h-4 ${isSelected ? "text-white" : "text-[#6B6B6B]"}`} />
                          </div>
                          <span className={`text-sm font-medium ${isSelected ? "text-[#D81B60]" : "text-[#1A1A1A]"}`}>
                            {method.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                )} />
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
