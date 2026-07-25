import { useState } from "react";
import { motion } from "framer-motion";
import {
  useVendorLogin, useVendorGetStats, getVendorGetStatsQueryKey,
  useVendorListProducts, getVendorListProductsQueryKey,
  useVendorListOrders, getVendorListOrdersQueryKey,
  useUpdateOrderStatus, useCreateProduct, useDeleteProduct
} from "@workspace/api-client-react";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Package, ShoppingBag, LogOut, Plus, Trash2 } from "lucide-react";
import { formatCurrency, toArabicNumerals } from "@/lib/format";

type Section = "overview" | "products" | "orders";

const STATUS_LABELS: Record<string, string> = {
  received: "تم الاستلام", preparing: "جاري التجهيز",
  delivering: "في الطريق", delivered: "تم التوصيل",
};
const STATUS_OPTIONS = ["received", "preparing", "delivering", "delivered"];

interface VendorSession { storeId: number; storeName: string; token: string }

export default function Vendor() {
  const [session, setSession] = useState<VendorSession | null>(() => {
    try { return JSON.parse(localStorage.getItem("fuchsia_vendor") || "null"); } catch { return null; }
  });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [section, setSection] = useState<Section>("overview");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState({ nameAr: "", price: "", discountPrice: "", description: "", imageUrl: "", stockQuantity: "", categoryId: "1" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useVendorLogin();
  const storeId = session?.storeId ?? 0;
  const statsQuery = useVendorGetStats({ storeId }, { query: { enabled: !!session, queryKey: getVendorGetStatsQueryKey({ storeId }) } });
  const productsQuery = useVendorListProducts({ storeId }, { query: { enabled: !!session && section === "products", queryKey: getVendorListProductsQueryKey({ storeId }) } });
  const ordersQuery = useVendorListOrders({ storeId }, { query: { enabled: !!session && section === "orders", queryKey: getVendorListOrdersQueryKey({ storeId }) } });
  const updateStatus = useUpdateOrderStatus();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await loginMutation.mutateAsync({ data: { email: loginEmail, password: loginPassword } });
      const s = { storeId: res.store.id, storeName: res.store.nameAr, token: res.token };
      localStorage.setItem("fuchsia_vendor", JSON.stringify(s));
      setSession(s);
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "بيانات الدخول غير صحيحة" });
    }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createProduct.mutateAsync({ data: {
        nameAr: productForm.nameAr,
        price: parseFloat(productForm.price),
        discountPrice: productForm.discountPrice ? parseFloat(productForm.discountPrice) : null,
        description: productForm.description || null,
        imageUrl: productForm.imageUrl || "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop",
        categoryId: parseInt(productForm.categoryId),
        storeId: session!.storeId,
        stockQuantity: productForm.stockQuantity ? parseInt(productForm.stockQuantity) : null,
        isFeatured: false,
        brand: null, nameEn: null, deliveryDays: 1,
      }});
      toast({ title: "تم", description: "تمت إضافة المنتج بنجاح" });
      queryClient.invalidateQueries();
      setShowAddProduct(false);
      setProductForm({ nameAr: "", price: "", discountPrice: "", description: "", imageUrl: "", stockQuantity: "", categoryId: "1" });
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ" });
    }
  }

  async function handleDeleteProduct(id: number) {
    try {
      await deleteProduct.mutateAsync({ id });
      queryClient.invalidateQueries();
      toast({ title: "تم", description: "تم حذف المنتج" });
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ" });
    }
  }

  async function handleUpdateStatus(orderId: number, status: string) {
    try {
      await updateStatus.mutateAsync({ id: orderId, data: { status: status as any } });
      queryClient.invalidateQueries();
      toast({ title: "تم", description: "تم تحديث حالة الطلب" });
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ" });
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-md border border-[#E8E0D0] p-8">
          <div className="flex flex-col items-center mb-8">
            <Logo className="w-16 h-16 mb-4" />
            <h1 className="font-serif text-2xl font-bold text-[#C9A84C]">لوحة التاجر</h1>
            <p className="text-[#6B6B6B] text-sm mt-1">أدخل اسم متجرك وكلمة المرور</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label>اسم المتجر أو رقم التواصل</Label>
              <Input value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                placeholder="متجر فوشيا / 777123456"
                className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-12" required />
            </div>
            <div className="space-y-1.5">
              <Label>كلمة المرور</Label>
              <Input value={loginPassword} onChange={e => setLoginPassword(e.target.value)} type="password"
                className="bg-[#F9F6F0] border-[#E8E0D0] rounded-xl h-12" required />
            </div>
            <button type="submit" disabled={loginMutation.isPending}
              className="w-full h-12 rounded-2xl text-white font-bold"
              style={{ background: "linear-gradient(135deg, #D81B60, #F48FB1 150%)" }}>
              {loginMutation.isPending ? "..." : "دخول"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const stats = statsQuery.data;
  const navItems = [
    { id: "overview" as Section, label: "نظرة عامة", icon: LayoutDashboard },
    { id: "products" as Section, label: "منتجاتي", icon: Package },
    { id: "orders" as Section, label: "الطلبات", icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen bg-[#FFF0F6] flex" dir="rtl">
      <aside className="w-60 bg-white border-l border-[#F0D4E5] flex flex-col sticky top-0 h-screen">
        <div className="flex items-center gap-3 p-5 border-b border-[#F0D4E5]">
          <Logo className="w-9 h-9" />
          <div>
            <p className="font-bold text-[#D81B60] text-sm">{session.storeName}</p>
            <p className="text-[#6B6B6B] text-xs">لوحة التاجر</p>
          </div>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setSection(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors w-full text-right ${
                  section === item.id ? "bg-[#FFF0F6] text-[#D81B60]" : "text-[#6B6B6B] hover:bg-[#FFF0F6]"
                }`}>
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <button onClick={() => { localStorage.removeItem("fuchsia_vendor"); setSession(null); }}
          className="flex items-center gap-3 px-4 py-4 text-[#6B6B6B] hover:text-red-500 text-sm m-3 rounded-xl hover:bg-red-50 transition-colors">
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </button>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        {section === "overview" && (
          <div>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-6">نظرة عامة — {session.storeName}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "إجمالي المنتجات", value: toArabicNumerals(stats?.totalProducts ?? 0) },
                { label: "إجمالي الطلبات", value: toArabicNumerals(stats?.totalOrders ?? 0) },
                { label: "الطلبات المعلقة", value: toArabicNumerals(stats?.pendingOrders ?? 0) },
                { label: "إجمالي الإيرادات", value: formatCurrency(stats?.totalRevenue ?? 0) },
                { label: "إيرادات هذا الشهر", value: formatCurrency(stats?.thisMonthRevenue ?? 0) },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-2xl p-5 border border-[#E8E0D0]">
                  <p className="text-[#6B6B6B] text-sm">{card.label}</p>
                  <p className="text-2xl font-bold text-[#C9A84C] mt-1">{card.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "products" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#1A1A1A]">منتجاتي ({toArabicNumerals(productsQuery.data?.length ?? 0)})</h2>
              <button onClick={() => setShowAddProduct(!showAddProduct)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold"
                style={{ background: "linear-gradient(135deg, #C9A84C, #E8D5A3 150%)" }}>
                <Plus className="w-4 h-4" />
                إضافة منتج
              </button>
            </div>

            {showAddProduct && (
              <form onSubmit={handleAddProduct} className="bg-white rounded-2xl border border-[#E8E0D0] p-6 mb-6 grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label>اسم المنتج</Label>
                  <Input value={productForm.nameAr} onChange={e => setProductForm(f => ({ ...f, nameAr: e.target.value }))}
                    className="bg-[#F9F6F0] border-[#E8E0D0] rounded-xl" required />
                </div>
                <div className="space-y-1.5">
                  <Label>السعر (ر.ي)</Label>
                  <Input type="number" value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))}
                    className="bg-[#F9F6F0] border-[#E8E0D0] rounded-xl" required dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <Label>سعر بعد الخصم (اختياري)</Label>
                  <Input type="number" value={productForm.discountPrice} onChange={e => setProductForm(f => ({ ...f, discountPrice: e.target.value }))}
                    className="bg-[#F9F6F0] border-[#E8E0D0] rounded-xl" dir="ltr" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>الوصف</Label>
                  <Input value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))}
                    className="bg-[#F9F6F0] border-[#E8E0D0] rounded-xl" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>رابط الصورة</Label>
                  <Input value={productForm.imageUrl} onChange={e => setProductForm(f => ({ ...f, imageUrl: e.target.value }))}
                    className="bg-[#F9F6F0] border-[#E8E0D0] rounded-xl" dir="ltr" placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <Label>الكمية المتاحة</Label>
                  <Input type="number" value={productForm.stockQuantity} onChange={e => setProductForm(f => ({ ...f, stockQuantity: e.target.value }))}
                    className="bg-[#F9F6F0] border-[#E8E0D0] rounded-xl" dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <Label>التصنيف</Label>
                  <select value={productForm.categoryId} onChange={e => setProductForm(f => ({ ...f, categoryId: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-[#E8E0D0] bg-[#F9F6F0] px-3 text-sm">
                    <option value="1">مستحضرات تجميل</option>
                    <option value="2">عطور</option>
                    <option value="3">هدايا</option>
                    <option value="4">تغليف الهدايا</option>
                    <option value="5">ورود</option>
                    <option value="6">عروض خاصة</option>
                  </select>
                </div>
                <div className="col-span-2 flex gap-3">
                  <button type="submit" className="px-6 h-11 rounded-xl text-white font-bold text-sm"
                    style={{ background: "linear-gradient(135deg, #C9A84C, #E8D5A3 150%)" }}>
                    إضافة المنتج
                  </button>
                  <button type="button" onClick={() => setShowAddProduct(false)}
                    className="px-6 h-11 rounded-xl border border-[#E8E0D0] text-[#6B6B6B] text-sm">
                    إلغاء
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-2xl border border-[#E8E0D0] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#F9F6F0] border-b border-[#E8E0D0]">
                  <tr>
                    <th className="text-right p-4 font-medium text-[#6B6B6B]">المنتج</th>
                    <th className="text-right p-4 font-medium text-[#6B6B6B]">السعر</th>
                    <th className="text-right p-4 font-medium text-[#6B6B6B]">الكمية</th>
                    <th className="text-right p-4 font-medium text-[#6B6B6B]">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {productsQuery.data?.map(p => (
                    <tr key={p.id} className="border-b border-[#E8E0D0]/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={p.imageUrl} alt={p.nameAr} className="w-10 h-10 rounded-lg object-cover border border-[#E8E0D0]" />
                          <span className="font-medium">{p.nameAr}</span>
                        </div>
                      </td>
                      <td className="p-4 text-[#C9A84C] font-bold">{formatCurrency(p.price)}</td>
                      <td className="p-4 text-[#6B6B6B]">{p.stockQuantity != null ? toArabicNumerals(p.stockQuantity) : "—"}</td>
                      <td className="p-4">
                        <button onClick={() => handleDeleteProduct(p.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === "orders" && (
          <div>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-6">الطلبات</h2>
            <div className="flex flex-col gap-4">
              {ordersQuery.data?.map(order => (
                <div key={order.id} className="bg-white rounded-2xl border border-[#E8E0D0] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-[#C9A84C]">طلب #{toArabicNumerals(order.id)}</span>
                    <span className="text-[#6B6B6B] text-sm">{new Date(order.createdAt).toLocaleDateString("ar-YE")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{formatCurrency(order.total)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#6B6B6B] text-sm">الحالة:</span>
                      <select
                        value={order.status}
                        onChange={e => handleUpdateStatus(order.id, e.target.value)}
                        className="h-8 rounded-lg border border-[#E8E0D0] bg-[#F9F6F0] px-2 text-sm"
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              {ordersQuery.data?.length === 0 && (
                <div className="text-center py-16 text-[#6B6B6B]">لا توجد طلبات بعد</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
