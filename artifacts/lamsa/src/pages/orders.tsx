import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import { OrderStatus } from "@workspace/api-client-react";
import { useSession } from "@/hooks/use-session";
import { Link } from "wouter";
import { formatCurrency, toArabicNumerals } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ChevronLeft, Calendar, Gift, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

const statusConfig: Record<string, { label: string, colorClass: string }> = {
  [OrderStatus.received]: { label: "تم الاستلام", colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  [OrderStatus.preparing]: { label: "جاري التجهيز", colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  [OrderStatus.delivering]: { label: "في الطريق", colorClass: "text-primary bg-primary/10 border-primary/20" },
  [OrderStatus.delivered]: { label: "مكتمل", colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
};
const trackingSteps = [OrderStatus.received, OrderStatus.preparing, OrderStatus.delivering, OrderStatus.delivered];

export default function Orders() {
  const { sessionId, isReady } = useSession();

  const { data: orders, isLoading } = useListOrders(
    { sessionId },
    { query: { enabled: isReady, queryKey: getListOrdersQueryKey({ sessionId }), refetchInterval: 15000 } }
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3"><Package className="w-8 h-8 text-primary" /><div><h1 className="text-3xl font-serif font-bold text-foreground">طلباتي</h1><p className="text-sm text-muted-foreground mt-1">تابع تجهيز هداياك وتوصيلها لحظة بلحظة</p></div></div>
        <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold text-muted-foreground hover:text-primary"><RefreshCw className="w-4 h-4" /> تحديث</button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : orders && orders.length > 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col gap-4"
        >
          {orders.map((order, index) => {
            const config = statusConfig[order.status] || { label: order.status, colorClass: "text-muted-foreground bg-muted border-border" };
            
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/order/${order.id}`} className="block">
                  <div className="bg-card border border-border hover:border-primary transition-colors rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between group">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg font-serif">طلب #{toArabicNumerals(order.id)}</span>
                        {(order as any).isGift && <span className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full"><Gift className="w-3.5 h-3.5" /> هدية</span>}
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${config.colorClass}`}>
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span dir="ltr">{new Date(order.createdAt).toLocaleDateString('ar-YE', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3 border-t md:border-t-0 border-border pt-4 md:pt-0 md:min-w-[300px]">
                      <div className="flex items-center justify-between gap-6">
                      <div className="flex -space-x-2 space-x-reverse overflow-hidden">
                        {order.items.slice(0, 3).map((item, i) => (
                          <div key={i} className="w-10 h-10 rounded-full border-2 border-card bg-muted overflow-hidden shrink-0 z-10 relative">
                            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="w-10 h-10 rounded-full border-2 border-card bg-muted flex items-center justify-center text-xs font-bold shrink-0 z-0 relative">
                            +{toArabicNumerals(order.items.length - 3)}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-primary text-lg">{formatCurrency(order.total)}</span>
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                          <ChevronLeft className="w-5 h-5" />
                        </div>
                      </div>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        {trackingSteps.map((step, stepIndex) => <span key={step} className={`h-1.5 flex-1 rounded-full ${trackingSteps.indexOf(order.status) >= stepIndex ? "bg-primary" : "bg-muted"}`} />)}
                        <span className="text-xs text-muted-foreground mr-2 whitespace-nowrap">{config.label}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-12 text-center flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-2">
            <Package className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold">لا توجد طلبات سابقة</h3>
          <p className="text-muted-foreground">يبدو أنك لم تقم بأي طلب بعد. تصفح منتجاتنا الفاخرة!</p>
          <Link href="/" className="text-primary hover:underline mt-2 font-bold">تسوق الآن</Link>
        </div>
      )}
    </div>
  );
}
