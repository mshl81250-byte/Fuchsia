import { useState } from "react";
import { useAdminListCoupons, useAdminCreateCoupon, getAdminListCouponsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tag, Plus, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function formatCurrency(amount: number) {
  return amount.toLocaleString("ar-YE") + " ر.ي";
}

export function CouponsView() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");

  const { data: coupons = [], isLoading } = useAdminListCoupons();
  const queryClient = useQueryClient();

  const createCoupon = useAdminCreateCoupon({
    mutation: {
      onSuccess: () => {
        toast.success("تم إنشاء الكوبون بنجاح");
        setIsDialogOpen(false);
        setCode("");
        setDiscountValue("");
        queryClient.invalidateQueries({ queryKey: getAdminListCouponsQueryKey() });
      },
      onError: () => {
        toast.error("فشل في إنشاء الكوبون");
      }
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discountValue) return;
    
    createCoupon.mutate({
      data: {
        code,
        discountType,
        discountValue: Number(discountValue)
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">الكوبونات</h2>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-bold shadow-md rounded-xl">
              <Plus className="w-5 h-5" />
              إضافة كوبون جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">إضافة كوبون جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-6 mt-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-base">رمز الكوبون</Label>
                <Input 
                  id="code" 
                  value={code} 
                  onChange={(e) => setCode(e.target.value.toUpperCase())} 
                  placeholder="مثال: SUMMER24"
                  className="text-left font-mono"
                  dir="ltr"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type" className="text-base">نوع الخصم</Label>
                <Select value={discountType} onValueChange={(v: "percentage" | "fixed") => setDiscountType(v)}>
                  <SelectTrigger id="type" dir="rtl">
                    <SelectValue placeholder="اختر النوع" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                    <SelectItem value="fixed">مبلغ ثابت (ر.ي)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value" className="text-base">قيمة الخصم</Label>
                <Input 
                  id="value" 
                  type="number" 
                  min="1"
                  value={discountValue} 
                  onChange={(e) => setDiscountValue(e.target.value)} 
                  placeholder={discountType === "percentage" ? "مثال: 20" : "مثال: 5000"}
                  required
                />
              </div>

              <Button type="submit" className="w-full font-bold text-lg h-12" disabled={createCoupon.isPending}>
                {createCoupon.isPending ? "جاري الإنشاء..." : "إنشاء الكوبون"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="w-full h-12 rounded-lg" />
            <Skeleton className="w-full h-64 rounded-lg" />
          </div>
        ) : coupons.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Tag /></EmptyMedia>
              <EmptyTitle>لا توجد كوبونات</EmptyTitle>
              <EmptyDescription>لم تقم بإنشاء أي كوبونات خصم بعد</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <Table dir="rtl">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-right">رمز الكوبون</TableHead>
                  <TableHead className="text-right">نوع الخصم</TableHead>
                  <TableHead className="text-right">القيمة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">مرات الاستخدام</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <span className="font-mono bg-muted px-2 py-1 rounded text-base font-bold select-all" dir="ltr">
                        {coupon.code}
                      </span>
                    </TableCell>
                    <TableCell>
                      {coupon.discountType === "percentage" ? "نسبة مئوية" : "مبلغ ثابت"}
                    </TableCell>
                    <TableCell className="font-bold text-lg text-primary">
                      {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : formatCurrency(coupon.discountValue)}
                    </TableCell>
                    <TableCell>
                      {coupon.isActive ? (
                        <Badge className="bg-green-100 text-green-800 border-0 hover:bg-green-200 gap-1">
                          <CheckCircle className="w-3 h-3" /> نشط
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-red-100 text-red-800 gap-1">
                          <XCircle className="w-3 h-3" /> غير نشط
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-bold">{coupon.usageCount || 0}</span> مرات
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
