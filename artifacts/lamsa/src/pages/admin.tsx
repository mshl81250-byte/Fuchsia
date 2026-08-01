import { useState } from "react";
import { motion } from "framer-motion";
import {
  useGetDashboardStats, getGetDashboardStatsQueryKey,
  useAdminListUsers, getAdminListUsersQueryKey,
  useAdminListOrders, getAdminListOrdersQueryKey,
  useAdminListCoupons, getAdminListCouponsQueryKey,
  useAdminCreateCoupon
} from "@workspace/api-client-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Users, ShoppingBag, Tag, LogOut, Package, TrendingUp } from "lucide-react";
import { formatCurrency, toArabicNumerals } from "@/lib/format";

type Section = "overview" | "users" | "orders" | "coupons";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  received:   { label: "تم الاستلام",  color: "bg-blue-100 text-blue-700" },
  preparing:  { label: "جاري التجهيز", color: "bg-yellow-100 text-yellow-700" },
  delivering: { label: "في الطريق",    color: "bg-orange-100 text-orange-700" },
  delivered:  { label: "تم التوصيل",   color: "bg-green-100 text-green-700" },
};

export default function Admin() {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("fuchsia_admin") || "");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [section, setSection] = useState<Section>("overview");
  const [couponForm, setCouponForm] = useState({ code: "", discountType: "percentage", discountValue: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = !!adminToken;

  const statsQuery = useGetDashboardStats({ query: { enabled: isAdmin, queryKey: getGetDashboardStatsQueryKey() } });
  const usersQuery = useAdminListUsers({ query: { enabled: isAdmin && section === "users", queryKey: getAdminListUsersQueryKey() } });
  const ordersQuery = useAdminListOrders({ query: { enabled: isAdmin && section === "orders", queryKey: getAdminListOrdersQueryKey() } });
  const couponsQuery = useAdminListCoupons({ query: { enabled: isAdmin && section === "coupons", queryKey: getAdminListCouponsQueryKey() } });
  const createCoupon = useAdminCreateCoupon();

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loginEmail === "admin@fuchsia.ye" && loginPassword === "admin123") {
      localStorage.setItem("fuchsia_admin", "admin");
      setAdminToken("admin");
    } else {
      toast({ variant: "destructive", title: "خطأ", description: "بيانات الدخول غير صحيحة" });
    }
  }

  async function handleCreateCoupon(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createCoupon.mutateAsync({
        data: { code: couponForm.code.toUpperCase(), discountType: couponForm.discountType, discountValue: parseFloat(couponForm.discountValue) }
      });
      toast({ title: "تم", description: "تم إنشاء الكوبون بنجاح" });
      queryClient.invalidateQueries();
      setCouponForm({ code: "", discountType: "percentage", discountValue: "" });
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ أثناء إنشاء الكوبون" });
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#FFF0F6] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-md border border-[#F0D4E5] p-8">
          <div className="flex flex-col items-center mb-8">
            <Logo className="w-16 h-16 mb-4" />
            <h1 className="font-serif text-2xl font-bold text-[#D81B60]">لوحة الإدارة</h1>
            <p className="text-[#6B6B6B] text-sm mt-1">تسجيل دخول المشرف</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label>البريد الإلكتروني</Label>
              <Input value={loginEmail} onChange={e => setLoginEmail(e.target.value)} type="email"
                className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-12" dir="ltr" required />
            </div>
            <div className="space-y-1.5">
              <Label>كلمة المرور</Label>
              <Input value={loginPassword} onChange={e => setLoginPassword(e.target.value)} type="password"
                className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-12" required />
            </div>
            <button type="submit" className="w-full h-12 rounded-2xl text-white font-bold"
              style={{ background: "linear-gradient(135deg, #D81B60, #F48FB1 150%)" }}>
              دخول
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const stats = statsQuery.data;
  const navItems: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "نظرة عامة", icon: LayoutDashboard },
    { id: "users", label: "العملاء", icon: Users },
    { id: "orders", label: "الطلبات", icon: ShoppingBag },
    { id: "coupons", label: "الكوبونات", icon: Tag },
  ];

  return (
    <div className="min-h-screen bg-[#FFF0F6] flex" dir="rtl">
      <aside className="w-64 bg-white border-l border-[#F0D4E5] flex flex-col shadow-sm sticky top-0 h-screen">
        <div className="flex items-center gap-3 p-6 border-b border-[#F0D4E5]">
          <Logo className="w-10 h-10" />
          <div>
            <p className="font-bold text-[#D81B60] font-serif text-lg">فوشيا</p>
            <p className="text-[#6B6B6B] text-xs">لوحة الإدارة</p>
          </div>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-1">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setSection(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors w-full text-right ${
                  section === item.id ? "bg-[#FFF0F6] text-[#D81B60]" : "text-[#6B6B6B] hover:bg-[#FFF0F6]"
                }`}>
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <button onClick={() => { localStorage.removeItem("fuchsia_admin"); setAdminToken(""); }}
          className="flex items-center gap-3 px-4 py-4 text-[#6B6B6B] hover:text-red-500 text-sm m-4 rounded-xl hover:bg-red-50 transition-colors">
          <LogOut className="w-5 h-5" />
          تسجيل الخروج
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {section === "overview" && (
          <div>
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">نظرة عامة</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {[
                { label: "إجمالي المستخدمين", value: toArabicNumerals(stats?.totalUsers ?? 0), icon: Users, color: "#D81B60" },
                { label: "إجمالي الطلبات", value: toArabicNumerals(stats?.totalOrders ?? 0), icon: ShoppingBag, color: "#E8A0B0" },
                { label: "إجمالي المنتجات", value: toArabicNumerals(stats?.totalProducts ?? 0), icon: Package, color: "#D81B60" },
                { label: "الطلبات المعلقة", value: toArabicNumerals(stats?.pendingOrders ?? 0), icon: ShoppingBag, color: "#E8A0B0" },
                { label: "إجمالي المتاجر", value: toArabicNumerals(stats?.totalStores ?? 0), icon: LayoutDashboard, color: "#D81B60" },
                { label: "إجمالي الإيرادات", value: formatCurrency(stats?.totalRevenue ?? 0), icon: TrendingUp, color: "#4CAF50" },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="bg-white rounded-2xl p-5 border border-[#F0D4E5] shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[#6B6B6B] text-sm">{card.label}</p>
                        <p className="text-2xl font-bold mt-1" style={{ color: card.color }}>{card.value}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.color + "15" }}>
                        <Icon className="w-5 h-5" style={{ color: card.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {section === "users" && (
          <div>
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">العملاء ({toArabicNumerals(usersQuery.data?.length ?? 0)})</h2>
            <div className="bg-white rounded-2xl border border-[#F0D4E5] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#FFF0F6] border-b border-[#F0D4E5]">
                  <tr>
                    <th className="text-right p-4 font-medium text-[#6B6B6B]">الاسم</th>
                    <th className="text-right p-4 font-medium text-[#6B6B6B]">البريد الإلكتروني</th>
                    <th className="text-right p-4 font-medium text-[#6B6B6B]">النقاط</th>
                    <th className="text-right p-4 font-medium text-[#6B6B6B]">النوع</th>
                  </tr>
                </thead>
                <tbody>
                  {usersQuery.data?.map(user => (
                    <tr key={user.id} className="border-b border-[#F0D4E5]/50 hover:bg-[#FFF0F6]/50">
                      <td className="p-4 font-medium">{user.fullName}</td>
                      <td className="p-4 text-[#6B6B6B]" dir="ltr">{user.email}</td>
                      <td className="p-4 text-[#D81B60] font-bold">{toArabicNumerals(user.rewardPoints)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isGuest ? "bg-gray-100 text-gray-600" : "bg-[#FFF0F6] text-[#D81B60]"}`}>
                          {user.isGuest ? "زائر" : "مسجل"}
                        </span>
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
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">الطلبات ({toArabicNumerals(ordersQuery.data?.length ?? 0)})</h2>
            <div className="bg-white rounded-2xl border border-[#F0D4E5] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#FFF0F6] border-b border-[#F0D4E5]">
                  <tr>
                    <th className="text-right p-4 font-medium text-[#6B6B6B]">رقم الطلب</th>
                    <th className="text-right p-4 font-medium text-[#6B6B6B]">العميل</th>
                    <th className="text-right p-4 font-medium text-[#6B6B6B]">الإجمالي</th>
                    <th className="text-right p-4 font-medium text-[#6B6B6B]">الحالة</th>
                    <th className="text-right p-4 font-medium text-[#6B6B6B]">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersQuery.data?.map(order => {
                    const st = STATUS_LABELS[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-600" };
                    return (
                      <tr key={order.id} className="border-b border-[#F0D4E5]/50 hover:bg-[#FFF0F6]/50">
                        <td className="p-4 font-bold text-[#D81B60]">#{toArabicNumerals(order.id)}</td>
                        <td className="p-4">{order.customerName ?? "—"}</td>
                        <td className="p-4 font-bold">{formatCurrency(order.total)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                        </td>
                        <td className="p-4 text-[#6B6B6B]">{new Date(order.createdAt).toLocaleDateString("ar-YE")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === "coupons" && (
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">إنشاء كوبون جديد</h2>
              <form onSubmit={handleCreateCoupon} className="bg-white rounded-2xl border border-[#F0D4E5] p-6 flex flex-col gap-4 max-w-lg">
                <div className="space-y-1.5">
                  <Label>كود الكوبون</Label>
                  <Input value={couponForm.code} onChange={e => setCouponForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="SUMMER20" className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-11" required dir="ltr" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>نوع الخصم</Label>
                    <select value={couponForm.discountType} onChange={e => setCouponForm(f => ({ ...f, discountType: e.target.value }))}
                      className="w-full h-11 rounded-xl border border-[#F0D4E5] bg-[#FFF0F6] px-3 text-sm">
                      <option value="percentage">نسبة مئوية %</option>
                      <option value="fixed">مبلغ ثابت ر.ي</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>قيمة الخصم</Label>
                    <Input type="number" value={couponForm.discountValue} onChange={e => setCouponForm(f => ({ ...f, discountValue: e.target.value }))}
                      placeholder="10" className="bg-[#FFF0F6] border-[#F0D4E5] rounded-xl h-11" required dir="ltr" />
                  </div>
                </div>
                <button type="submit" className="h-11 rounded-xl text-white font-bold"
                  style={{ background: "linear-gradient(135deg, #D81B60, #F48FB1 150%)" }}>
                  إنشاء الكوبون
                </button>
              </form>
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-4">الكوبونات الحالية</h3>
              <div className="bg-white rounded-2xl border border-[#F0D4E5] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#FFF0F6] border-b border-[#F0D4E5]">
                    <tr>
                      <th className="text-right p-4 font-medium text-[#6B6B6B]">الكود</th>
                      <th className="text-right p-4 font-medium text-[#6B6B6B]">الخصم</th>
                      <th className="text-right p-4 font-medium text-[#6B6B6B]">الاستخدامات</th>
                      <th className="text-right p-4 font-medium text-[#6B6B6B]">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {couponsQuery.data?.map(c => (
                      <tr key={c.id} className="border-b border-[#F0D4E5]/50">
                        <td className="p-4 font-mono font-bold text-[#D81B60]" dir="ltr">{c.code}</td>
                        <td className="p-4">{c.discountValue}{c.discountType === "percentage" ? "%" : " ر.ي"}</td>
                        <td className="p-4 text-[#6B6B6B]">{toArabicNumerals(c.usageCount ?? 0)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {c.isActive ? "فعال" : "معطل"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
