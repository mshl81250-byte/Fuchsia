import { useGetCart, getGetCartQueryKey, useCreateOrder } from "@workspace/api-client-react";
import { OrderInputPaymentMethod } from "@workspace/api-client-react";
import { useSession } from "@/hooks/use-session";
import { formatCurrency } from "@/lib/format";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const checkoutSchema = z.object({
  customerName: z.string().min(2, "يرجى إدخال الاسم كاملاً"),
  customerPhone: z.string().min(9, "يرجى إدخال رقم هاتف صحيح"),
  deliveryAddress: z.string().min(10, "يرجى إدخال عنوان التوصيل بالتفصيل"),
  paymentMethod: z.enum([OrderInputPaymentMethod.cash_on_delivery, OrderInputPaymentMethod.bank_transfer]),
  notes: z.string().optional()
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const { sessionId, isReady } = useSession();
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
      customerName: "",
      customerPhone: "",
      deliveryAddress: "",
      paymentMethod: OrderInputPaymentMethod.cash_on_delivery,
      notes: ""
    }
  });

  const onSubmit = async (values: CheckoutFormValues) => {
    if (!cart || cart.items.length === 0) return;
    
    try {
      const order = await createOrderMutation.mutateAsync({
        data: {
          sessionId,
          ...values,
          couponCode: cart.couponCode
        }
      });
      
      // Invalidate cart to show it empty next time
      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey({ sessionId }) });
      
      toast({
        title: "تم استلام طلبك!",
        description: "شكراً لتسوقك من لمسة. سيتم التواصل معك قريباً.",
      });
      
      setLocation(`/order/${order.id}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء إتمام الطلب",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="flex flex-col gap-6">
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold font-serif mb-4">عذراً، سلتك فارغة</h2>
        <Button asChild>
          <Link href="/">العودة للرئيسية</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-serif font-bold text-foreground mb-8">إتمام الطلب</h1>
      
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="flex-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                <h3 className="font-bold text-xl font-serif text-primary border-b border-border pb-4">معلومات التوصيل</h3>
                
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-muted-foreground">الاسم الكامل</Label>
                      <FormControl>
                        <Input placeholder="الاسم ثلاثي" className="bg-background border-border" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-muted-foreground">رقم الهاتف للتواصل</Label>
                      <FormControl>
                        <Input placeholder="77X XXX XXX" dir="ltr" className="text-right bg-background border-border" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="deliveryAddress"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-muted-foreground">عنوان التوصيل في صنعاء</Label>
                      <FormControl>
                        <Textarea 
                          placeholder="المنطقة، الشارع، أقرب معلم بارز..." 
                          className="resize-none bg-background border-border" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                <h3 className="font-bold text-xl font-serif text-primary border-b border-border pb-4">طريقة الدفع</h3>
                
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col gap-4"
                        >
                          <div className="flex items-center space-x-2 space-x-reverse border border-border p-4 rounded-lg bg-background has-[:checked]:border-primary transition-colors cursor-pointer">
                            <RadioGroupItem value={OrderInputPaymentMethod.cash_on_delivery} id="r1" />
                            <Label htmlFor="r1" className="flex-1 cursor-pointer font-bold">الدفع عند الاستلام</Label>
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse border border-border p-4 rounded-lg bg-background has-[:checked]:border-primary transition-colors cursor-pointer">
                            <RadioGroupItem value={OrderInputPaymentMethod.bank_transfer} id="r2" />
                            <Label htmlFor="r2" className="flex-1 cursor-pointer font-bold flex justify-between items-center">
                              <span>تحويل بنكي / كريمي</span>
                              <span className="text-xs text-muted-foreground font-normal">سيتم التواصل معك لتأكيد التحويل</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-muted-foreground">ملاحظات إضافية للطلب (اختياري)</Label>
                      <FormControl>
                        <Textarea 
                          placeholder="أي تعليمات خاصة بالتوصيل أو الطلب..." 
                          className="resize-none bg-background border-border" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 text-lg font-bold lg:hidden"
                disabled={createOrderMutation.isPending}
              >
                {createOrderMutation.isPending ? "جاري الإرسال..." : "تأكيد الطلب"}
              </Button>
            </form>
          </Form>
        </div>

        {/* Order Summary Sticky Sidebar */}
        <div className="w-full lg:w-96 shrink-0">
          <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
            <h3 className="font-bold text-lg mb-6 border-b border-border pb-4">ملخص الطلب</h3>
            
            <div className="flex flex-col gap-4 mb-6 max-h-60 overflow-y-auto pr-2">
              {cart.items.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-muted rounded overflow-hidden shrink-0 border border-border">
                    <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <span className="text-sm font-medium line-clamp-1">{item.productName}</span>
                    <span className="text-xs text-muted-foreground">الكمية: {item.quantity}</span>
                  </div>
                  <span className="text-sm font-bold text-primary shrink-0">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            
            <div className="flex flex-col gap-3 text-sm mb-6 border-t border-border pt-4">
              <div className="flex justify-between text-muted-foreground">
                <span>المجموع الفرعي</span>
                <span className="text-foreground">{formatCurrency(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>رسوم التوصيل</span>
                <span className="text-foreground">{formatCurrency(cart.deliveryFee)}</span>
              </div>
              {cart.discount ? (
                <div className="flex justify-between text-accent">
                  <span>الخصم</span>
                  <span>-{formatCurrency(cart.discount)}</span>
                </div>
              ) : null}
              
              <div className="pt-3 mt-1 border-t border-border flex justify-between items-center text-xl font-bold text-primary">
                <span>الإجمالي</span>
                <span>{formatCurrency(cart.total)}</span>
              </div>
            </div>

            <Button 
              className="w-full h-14 text-lg font-bold hidden lg:flex"
              onClick={form.handleSubmit(onSubmit)}
              disabled={createOrderMutation.isPending}
            >
              {createOrderMutation.isPending ? "جاري الإرسال..." : "تأكيد الطلب"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
