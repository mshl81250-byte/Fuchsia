import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { OrderStatus } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { formatCurrency, toArabicNumerals } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Package, Truck, Home, PackageCheck, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const statusSteps = [
  { id: OrderStatus.received, label: "تم الاستلام", icon: CheckCircle2 },
  { id: OrderStatus.preparing, label: "جاري التجهيز", icon: Package },
  { id: OrderStatus.delivering, label: "في الطريق إليك", icon: Truck },
  { id: OrderStatus.delivered, label: "تم التوصيل", icon: Home },
];

export default function OrderDetail() {
  const params = useParams();
  const orderId = Number(params.id);

  const { data: order, isLoading } = useGetOrder(
    orderId,
    { query: { enabled: !!orderId, queryKey: getGetOrderQueryKey(orderId), refetchInterval: 10000 } }
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Skeleton className="h-40 w-full rounded-2xl mb-8" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold font-serif mb-4">الطلب غير موجود</h2>
        <Link href="/" className="text-primary hover:underline">العودة للرئيسية</Link>
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex(s => s.id === order.status);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link href="/orders" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6">
        <ChevronRight className="w-4 h-4" /> العودة للطلبات
      </Link>

      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-8 text-center flex flex-col items-center shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
        
        <PackageCheck className="w-16 h-16 text-primary mb-4" />
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">طلب رقم #{toArabicNumerals(order.id)}</h1>
        <p className="text-muted-foreground">شكراً لاختيارك فوشيا. طلبك الآن قيد المعالجة.</p>
      </div>

      {/* Status Progress */}
      <div className="bg-card border border-border rounded-2xl p-6 md:p-10 mb-8 overflow-x-auto">
        <div className="min-w-[500px] flex items-center justify-between relative">
          {/* Track background */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted -translate-y-1/2 rounded-full z-0" />
          
          {/* Active track */}
          <motion.div 
            className="absolute top-1/2 right-0 h-1 bg-primary -translate-y-1/2 rounded-full z-0"
            initial={{ width: "0%" }}
            animate={{ width: `${(Math.max(0, currentStepIndex) / (statusSteps.length - 1)) * 100}%` }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />

          {statusSteps.map((step, index) => {
            const isActive = index <= currentStepIndex;
            const Icon = step.icon;
            
            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
                <motion.div 
                  initial={false}
                  animate={{ 
                    backgroundColor: isActive ? "var(--color-primary)" : "var(--color-card)",
                    borderColor: isActive ? "var(--color-primary)" : "var(--color-border)",
                    color: isActive ? "var(--color-primary-foreground)" : "var(--color-muted-foreground)"
                  }}
                  className="w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-sm"
                >
                  <Icon className="w-5 h-5" />
                </motion.div>
                <span className={`text-sm font-bold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Order Details */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-bold text-xl font-serif text-primary border-b border-border pb-4 mb-4">تفاصيل الطلب</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">التاريخ</span>
              <span className="font-medium" dir="ltr">{new Date(order.createdAt).toLocaleDateString('ar-YE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {order.customerName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">المستلم</span>
                <span className="font-medium">{order.customerName}</span>
              </div>
            )}
            {order.deliveryAddress && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">عنوان التوصيل</span>
                <span className="font-medium leading-relaxed">{order.deliveryAddress}</span>
              </div>
            )}
            {order.notes && (
              <div className="flex flex-col gap-1 border-t border-border pt-4">
                <span className="text-muted-foreground">ملاحظات</span>
                <span className="font-medium leading-relaxed text-sm bg-muted/30 p-3 rounded-lg">{order.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Order Items & Total */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col">
          <h3 className="font-bold text-xl font-serif text-primary border-b border-border pb-4 mb-4">المنتجات</h3>
          
          <div className="flex flex-col gap-4 mb-6 flex-1 overflow-y-auto max-h-[300px] pr-2">
            {order.items.map(item => (
              <div key={item.id} className="flex items-center gap-4">
                <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden shrink-0 border border-border">
                  <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <Link href={`/product/${item.productId}`} className="font-bold hover:text-primary transition-colors line-clamp-1">
                    {item.productName}
                  </Link>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-muted-foreground">الكمية: {toArabicNumerals(item.quantity)}</span>
                    <span className="text-sm font-bold text-primary">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex flex-col gap-3 text-sm pt-4 border-t border-border mt-auto">
            <div className="flex justify-between text-muted-foreground">
              <span>المجموع الفرعي</span>
              <span>{formatCurrency(order.total - (order.deliveryFee || 0) + (order.discount || 0))}</span>
            </div>
            {order.deliveryFee !== undefined && (
              <div className="flex justify-between text-muted-foreground">
                <span>رسوم التوصيل</span>
                <span>{formatCurrency(order.deliveryFee)}</span>
              </div>
            )}
            {order.discount ? (
              <div className="flex justify-between text-accent">
                <span>الخصم</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            ) : null}
            
            <div className="pt-3 mt-1 border-t border-border flex justify-between items-center text-xl font-bold text-primary">
              <span>الإجمالي المكتوب</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
