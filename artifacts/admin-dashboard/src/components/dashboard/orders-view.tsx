import { useState, useMemo } from "react";
import { useAdminListOrders, useAdminUpdateOrderStatus, getAdminListOrdersQueryKey } from "@workspace/api-client-react";
import type { OrderStatusUpdateStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, MapPin, Phone, Clock, CreditCard, Box, StickyNote, CheckCircle, PackageSearch, Truck, UserRound, Save } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS: Record<string, string> = {
  cash_on_delivery: "عند الاستلام",
  jaib: "جيب",
  flousy: "فلوسك",
  mobile_money: "موبايل موني",
  jawali: "جوالي",
  cash: "كاش",
  one_cash: "ون كاش",
  bank_transfer: "تحويل بنكي",
};

const STATUS_MAP: Record<string, { label: string, color: string, icon: any, next?: string, nextLabel?: string }> = {
  received: { label: "مستلم", color: "bg-blue-500", icon: PackageSearch, next: "preparing", nextLabel: "بدء التجهيز" },
  preparing: { label: "قيد التجهيز", color: "bg-yellow-500", icon: Box, next: "delivering", nextLabel: "تسليم للمندوب" },
  delivering: { label: "جاري التوصيل", color: "bg-purple-500", icon: Truck, next: "delivered", nextLabel: "تم التوصيل" },
  delivered: { label: "مكتمل", color: "bg-green-500", icon: CheckCircle },
  cancelled: { label: "ملغي", color: "bg-red-500", icon: CheckCircle },
};

function formatCurrency(amount: number) {
  return amount.toLocaleString("ar-YE") + " ر.ي";
}

export function OrdersView() {
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [driverDrafts, setDriverDrafts] = useState<Record<number, { name: string; phone: string }>>({});
  
  const { data: orders = [], isLoading } = useAdminListOrders({
    query: {
      refetchInterval: 20000,
      queryKey: getAdminListOrdersQueryKey(),
    }
  });

  const queryClient = useQueryClient();
  const updateStatus = useAdminUpdateOrderStatus({
    mutation: {
      onSuccess: () => {
        toast.success("تم تحديث حالة الطلب بنجاح");
        queryClient.invalidateQueries({ queryKey: getAdminListOrdersQueryKey() });
      },
      onError: () => {
        toast.error("فشل في تحديث حالة الطلب");
      }
    }
  });

  const filteredOrders = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter(o => o.status === filter);
  }, [orders, filter]);

  const counts = useMemo(() => {
    const acc = { all: orders.length, received: 0, preparing: 0, delivering: 0, delivered: 0 };
    orders.forEach(o => {
      if (acc[o.status as keyof typeof acc] !== undefined) {
        acc[o.status as keyof typeof acc]++;
      }
    });
    return acc;
  }, [orders]);

  const handleAdvanceStatus = (id: number, currentStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = STATUS_MAP[currentStatus]?.next;
    if (nextStatus) {
      updateStatus.mutate({ id, data: { status: nextStatus as OrderStatusUpdateStatus } });
    }
  };

  const toggleOrder = (order: (typeof orders)[number]) => {
    const nextExpanded = expandedId === order.id ? null : order.id;
    setExpandedId(nextExpanded);
    if (nextExpanded !== null && !driverDrafts[order.id]) {
      setDriverDrafts(current => ({
        ...current,
        [order.id]: { name: order.driverName ?? "", phone: order.driverPhone ?? "" },
      }));
    }
  };

  const updateDriverDraft = (orderId: number, field: "name" | "phone", value: string) => {
    setDriverDrafts(current => ({
      ...current,
      [orderId]: { ...(current[orderId] ?? { name: "", phone: "" }), [field]: value },
    }));
  };

  const saveDriver = (orderId: number, status: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const draft = driverDrafts[orderId] ?? { name: "", phone: "" };
    updateStatus.mutate({
      id: orderId,
      data: {
        status: status as OrderStatusUpdateStatus,
        driverName: draft.name.trim() || null,
        driverPhone: draft.phone.trim() || null,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-full h-12 rounded-lg" />
        <Skeleton className="w-full h-32 rounded-lg" />
        <Skeleton className="w-full h-32 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">الطلبات</h2>
      </div>

      <Tabs defaultValue="all" value={filter} onValueChange={setFilter} dir="rtl">
        <TabsList className="flex flex-wrap h-auto gap-2 p-1 bg-muted/50 rounded-xl justify-start">
          <TabsTrigger value="all" className="rounded-lg">
            الكل <Badge variant="secondary" className="mr-2">{counts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="received" className="rounded-lg">
            جديدة <Badge variant="secondary" className="mr-2 bg-blue-100 text-blue-800">{counts.received}</Badge>
          </TabsTrigger>
          <TabsTrigger value="preparing" className="rounded-lg">
            قيد التجهيز <Badge variant="secondary" className="mr-2 bg-yellow-100 text-yellow-800">{counts.preparing}</Badge>
          </TabsTrigger>
          <TabsTrigger value="delivering" className="rounded-lg">
            جاري التوصيل <Badge variant="secondary" className="mr-2 bg-purple-100 text-purple-800">{counts.delivering}</Badge>
          </TabsTrigger>
          <TabsTrigger value="delivered" className="rounded-lg">
            مكتملة <Badge variant="secondary" className="mr-2 bg-green-100 text-green-800">{counts.delivered}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4">
        {filteredOrders.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Box /></EmptyMedia>
              <EmptyTitle>لا توجد طلبات</EmptyTitle>
              <EmptyDescription>لم يتم العثور على طلبات مطابقة للفلتر المحدد</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          filteredOrders.map(order => {
            const isExpanded = expandedId === order.id;
            const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: "bg-gray-500", icon: Box };
            const StatusIcon = statusInfo.icon;
            
            return (
              <Card 
                key={order.id} 
                className={cn("overflow-hidden transition-all duration-200 border cursor-pointer hover:border-primary/50", isExpanded ? "border-primary shadow-md" : "")}
                onClick={() => toggleOrder(order)}
              >
                <div className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-card hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={cn("p-3 rounded-full text-white shrink-0 shadow-sm", statusInfo.color)}>
                      <StatusIcon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">#{order.id}</span>
                        <Badge variant="outline" className={cn("text-white border-0", statusInfo.color)}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-lg">{order.customerName}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {format(new Date(order.createdAt || Date.now()), "dd MMM yyyy, hh:mm a", { locale: ar })}</span>
                        <span className="flex items-center gap-1 truncate max-w-[200px]"><MapPin className="w-4 h-4" /> {order.deliveryAddress}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between w-full md:w-auto gap-6 mt-4 md:mt-0">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-1">الإجمالي</p>
                      <p className="font-bold text-xl text-primary">{formatCurrency(order.total)}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {statusInfo.next && (
                        <Button 
                          onClick={(e) => handleAdvanceStatus(order.id, order.status, e)}
                          disabled={updateStatus.isPending}
                          className="font-bold whitespace-nowrap shadow-sm hover:shadow"
                        >
                          {statusInfo.nextLabel}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="shrink-0 rounded-full bg-muted/50">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t bg-muted/10"
                    >
                      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 cursor-default" onClick={e => e.stopPropagation()}>
                        
                        {/* Order details block */}
                        <div className="lg:col-span-1 space-y-6">
                          <div>
                            <h4 className="font-bold mb-3 flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> تواصل</h4>
                            <a href={`tel:${order.customerPhone}`} className="text-lg hover:text-primary transition-colors inline-block select-all" dir="ltr">
                              {order.customerPhone}
                            </a>
                          </div>
                          
                          <div>
                            <h4 className="font-bold mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> عنوان التوصيل</h4>
                            <p className="text-sm leading-relaxed text-muted-foreground select-all">{order.deliveryAddress}</p>
                          </div>

                          <div>
                            <h4 className="font-bold mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> طريقة الدفع</h4>
                            <Badge variant="outline" className="text-sm px-3 py-1">
                              {PAYMENT_METHODS[order.paymentMethod || ""] || order.paymentMethod}
                            </Badge>
                          </div>

                          {/* Delivery representative */}
                          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                            <h4 className="font-bold flex items-center gap-2 text-primary">
                              <UserRound className="w-4 h-4" /> بيانات المندوب
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              ستظهر هذه البيانات للعميلة في تطبيق فوشيا عند بدء التوصيل.
                            </p>
                            <div className="space-y-2">
                              <Input
                                value={driverDrafts[order.id]?.name ?? order.driverName ?? ""}
                                onChange={e => updateDriverDraft(order.id, "name", e.target.value)}
                                onClick={e => e.stopPropagation()}
                                placeholder="اسم المندوب"
                                className="bg-background"
                              />
                              <Input
                                value={driverDrafts[order.id]?.phone ?? order.driverPhone ?? ""}
                                onChange={e => updateDriverDraft(order.id, "phone", e.target.value)}
                                onClick={e => e.stopPropagation()}
                                placeholder="رقم جوال المندوب"
                                type="tel"
                                dir="ltr"
                                className="bg-background text-left"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full gap-2 font-bold"
                                onClick={e => saveDriver(order.id, order.status, e)}
                                disabled={updateStatus.isPending}
                              >
                                <Save className="w-4 h-4" />
                                {updateStatus.isPending ? "جاري الحفظ..." : "حفظ بيانات المندوب"}
                              </Button>
                            </div>
                          </div>

                          {order.notes && (
                            <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-xl border border-orange-100 dark:border-orange-900/50">
                              <h4 className="font-bold mb-2 flex items-center gap-2 text-orange-800 dark:text-orange-400"><StickyNote className="w-4 h-4" /> ملاحظات العميل</h4>
                              <p className="text-sm text-orange-900 dark:text-orange-300 leading-relaxed">{order.notes}</p>
                            </div>
                          )}
                        </div>

                        {/* Order items block */}
                        <div className="lg:col-span-2 space-y-4">
                          <h4 className="font-bold text-lg mb-4 flex items-center gap-2"><Box className="w-5 h-5 text-primary" /> المنتجات ({order.items?.length || 0})</h4>
                          <div className="space-y-3">
                            {order.items?.map((item: any) => (
                              <div key={item.id} className="flex gap-4 items-center p-3 bg-background rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                                <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0 border">
                                  {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Box className="w-8 h-8 opacity-20" /></div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-bold text-base truncate">{item.productName}</h5>
                                  <p className="text-muted-foreground mt-1 text-sm">{formatCurrency(item.price)} × {item.quantity}</p>
                                </div>
                                <div className="text-left font-bold text-lg pl-2">
                                  {formatCurrency(item.price * item.quantity)}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="mt-6 pt-4 border-t space-y-2">
                            <div className="flex justify-between text-muted-foreground text-sm">
                              <span>المجموع الفرعي</span>
                              <span>{formatCurrency(order.total - (order.deliveryFee || 0) + (order.discount || 0))}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground text-sm">
                              <span>رسوم التوصيل</span>
                              <span>{formatCurrency(order.deliveryFee || 0)}</span>
                            </div>
                            {(order.discount || 0) > 0 && (
                              <div className="flex justify-between text-green-600 text-sm">
                                <span>الخصم {order.couponCode ? `(${order.couponCode})` : ''}</span>
                                <span>- {formatCurrency(order.discount || 0)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-xl pt-2 border-t mt-2">
                              <span>الإجمالي النهائي</span>
                              <span className="text-primary">{formatCurrency(order.total)}</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
