import { useGetCart, getGetCartQueryKey, useValidateCoupon } from "@workspace/api-client-react";
import { useSession } from "@/hooks/use-session";
import { useCartActions } from "@/hooks/use-cart-actions";
import { formatCurrency, toArabicNumerals } from "@/lib/format";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, ShoppingBag, ArrowLeft, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Cart() {
  const { sessionId, isReady } = useSession();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { updateQuantity, removeItem, isUpdating, isRemoving } = useCartActions();
  
  const [couponCode, setCouponCode] = useState("");
  
  const validateCouponMutation = useValidateCoupon();

  const { data: cart, isLoading } = useGetCart(
    { sessionId },
    { query: { enabled: isReady, queryKey: getGetCartQueryKey({ sessionId }) } }
  );

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !cart) return;
    
    try {
      const result = await validateCouponMutation.mutateAsync({
        data: { code: couponCode, cartTotal: cart.subtotal }
      });
      
      if (result.valid) {
        toast({
          title: "تم تطبيق الكوبون",
          description: result.message || "تم الحصول على الخصم",
        });
        // Refetch cart to reflect discount
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey({ sessionId }) });
      } else {
        toast({
          variant: "destructive",
          title: "كوبون غير صالح",
          description: result.message || "تأكد من صحة الكود والمحاولة مرة أخرى",
        });
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء تطبيق الكوبون",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        <div className="flex-1 flex flex-col gap-4">
          <Skeleton className="h-10 w-48 mb-4" />
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
        <Skeleton className="w-full lg:w-96 h-96 rounded-xl" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center gap-6 min-h-[60vh]">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
          <ShoppingBag className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold font-serif">السلة فارغة</h2>
        <p className="text-muted-foreground mb-4">أضف بعض المنتجات الفاخرة لتجربة تسوق فريدة</p>
        <Button asChild size="lg" className="px-8 font-bold">
          <Link href="/">تصفح المنتجات</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-serif font-bold text-foreground mb-8">سلة المشتريات</h1>
      
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="flex-1 flex flex-col gap-4">
          <AnimatePresence>
            {cart.items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, height: 0 }}
                className="flex flex-col sm:flex-row gap-4 bg-card border border-border p-4 rounded-xl relative"
              >
                <Link href={`/product/${item.productId}`} className="w-full sm:w-28 h-28 shrink-0 bg-muted rounded-lg overflow-hidden block">
                  <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                </Link>
                
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-start gap-4 pr-6 sm:pr-0">
                    <Link href={`/product/${item.productId}`} className="font-bold text-lg hover:text-primary transition-colors line-clamp-2">
                      {item.productName}
                    </Link>
                    <span className="font-bold text-primary shrink-0">{formatCurrency(item.price)}</span>
                  </div>
                  
                  {item.giftWrapping && (
                    <div className="flex items-center gap-2 mt-2 text-xs font-medium text-accent bg-accent/10 w-fit px-2 py-1 rounded">
                      <Gift className="w-3.5 h-3.5" />
                      تغليف كهدية
                    </div>
                  )}
                  
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <div className="flex items-center border border-border rounded-lg bg-background h-10 w-28 shrink-0">
                      <button 
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        disabled={isUpdating || item.quantity <= 1}
                        className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-50"
                      >-</button>
                      <div className="flex-1 h-full flex items-center justify-center font-bold text-sm">
                        {toArabicNumerals(item.quantity)}
                      </div>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={isUpdating}
                        className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-50"
                      >+</button>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={isRemoving}
                  className="absolute top-4 left-4 sm:relative sm:top-auto sm:left-auto text-muted-foreground hover:text-destructive transition-colors p-2 -m-2 sm:m-0 sm:self-start sm:mt-1 disabled:opacity-50"
                  aria-label="حذف"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Order Summary */}
        <div className="w-full lg:w-96 shrink-0">
          <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
            <h3 className="font-bold text-lg mb-6">ملخص الطلب</h3>
            
            <div className="flex flex-col gap-4 text-sm mb-6">
              <div className="flex justify-between text-muted-foreground">
                <span>المجموع الفرعي</span>
                <span className="text-foreground font-medium">{formatCurrency(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>رسوم التوصيل</span>
                <span className="text-foreground font-medium">{formatCurrency(cart.deliveryFee)}</span>
              </div>
              {cart.discount ? (
                <div className="flex justify-between text-accent font-medium">
                  <span>الخصم</span>
                  <span>-{formatCurrency(cart.discount)}</span>
                </div>
              ) : null}
              
              <div className="pt-4 mt-2 border-t border-border flex justify-between items-center text-lg font-bold text-primary">
                <span>الإجمالي</span>
                <span>{formatCurrency(cart.total)}</span>
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              <Input 
                placeholder="كود الخصم" 
                className="font-mono bg-background text-left" 
                dir="ltr"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
              <Button 
                variant="outline" 
                className="shrink-0"
                onClick={handleApplyCoupon}
                disabled={validateCouponMutation.isPending || !couponCode.trim()}
              >
                تطبيق
              </Button>
            </div>

            <Button 
              className="w-full h-14 text-lg font-bold flex items-center justify-center gap-2"
              onClick={() => setLocation('/checkout')}
            >
              إتمام الطلب
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
