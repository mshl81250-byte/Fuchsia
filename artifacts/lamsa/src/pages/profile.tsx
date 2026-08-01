import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useGetRewards, getGetRewardsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, toArabicNumerals } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag, Heart, Star, Gift, Copy, LogOut,
  Settings, Bell, Shield, Phone, Moon, Sun, ChevronLeft,
  User
} from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [theme, setTheme] = useState<"light" | "dark" | "auto">("light");
  const [copied, setCopied] = useState(false);

  const rewardsQuery = useGetRewards(
    { userId: user?.id ?? 0 },
    { query: { enabled: !!user && !user.isGuest, queryKey: getGetRewardsQueryKey({ userId: user?.id ?? 0 }) } }
  );

  function handleLogout() {
    logout();
    setLocation("/auth");
  }

  function copyReferral() {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-[#6B6B6B] mb-4">سجل دخولك للوصول إلى حسابك</p>
        <Button asChild style={{ background: "linear-gradient(135deg, #C9A84C, #E8D5A3)" }} className="text-white">
          <Link href="/auth">تسجيل الدخول</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF0F6] pb-24">
      {/* Profile Header */}
      <div className="bg-white border-b border-[#F0D4E5] px-4 pt-6 pb-8">
        <div className="container mx-auto max-w-lg flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-[#FFF0F6] border-2 border-[#D81B60] flex items-center justify-center overflow-hidden shadow-sm">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-[#D81B60]" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#1A1A1A]">{user.fullName}</h2>
            <p className="text-[#6B6B6B] text-sm" dir="ltr">{user.email}</p>
            {user.isGuest ? (
              <span className="text-xs bg-[#FFF0F6] text-[#D81B60] px-2 py-0.5 rounded-full border border-[#F0D4E5] mt-1 inline-block">زائر</span>
            ) : (
              <span className="text-xs bg-[#D81B60]/10 text-[#D81B60] px-2 py-0.5 rounded-full mt-1 inline-block font-medium">عضو فوشيا</span>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-lg px-4 py-6 flex flex-col gap-4">
        {/* Quick Links */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: "/orders", label: "طلباتي", icon: ShoppingBag },
            { href: "/favorites", label: "المفضلة", icon: Heart },
            { href: "/search", label: "التصنيفات", icon: Star },
          ].map(item => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <motion.div whileTap={{ scale: 0.95 }}
                  className="bg-white rounded-2xl border border-[#F0D4E5] p-4 flex flex-col items-center gap-2 shadow-sm hover:border-[#D81B60]/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF0F6] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#D81B60]" />
                  </div>
                  <span className="text-xs font-medium text-[#1A1A1A]">{item.label}</span>
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* Rewards Card */}
        {!user.isGuest && (
          <div className="rounded-2xl p-5 text-white shadow-md" style={{ background: "linear-gradient(135deg, #D81B60, #F48FB1 150%)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">نقاط المكافآت</p>
                <p className="text-3xl font-bold">{toArabicNumerals(rewardsQuery.data?.points ?? user.rewardPoints)}</p>
                <p className="text-white/70 text-xs mt-1">
                  تعادل {formatCurrency(rewardsQuery.data?.pointsValue ?? user.rewardPoints * 2)}
                </p>
              </div>
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <Star className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        )}

        {/* Referral Code */}
        {!user.isGuest && user.referralCode && (
          <div className="bg-white rounded-2xl border border-[#F0D4E5] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-5 h-5 text-[#D81B60]" />
              <h3 className="font-bold text-[#1A1A1A]">دعوة أصدقاء</h3>
            </div>
            <p className="text-[#6B6B6B] text-sm mb-3">شارك كودك واحصلي على نقاط عند تسجيل صديقاتك</p>
            <div className="flex items-center gap-3 bg-[#FFF0F6] rounded-xl p-3 border border-[#F0D4E5]">
              <span className="flex-1 font-mono font-bold text-[#D81B60] text-lg" dir="ltr">{user.referralCode}</span>
              <button onClick={copyReferral}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-sm font-medium"
                style={{ background: "linear-gradient(135deg, #D81B60, #F48FB1)" }}>
                <Copy className="w-4 h-4" />
                {copied ? "تم!" : "نسخ"}
              </button>
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="bg-white rounded-2xl border border-[#F0D4E5] shadow-sm overflow-hidden">
          <h3 className="font-bold text-[#1A1A1A] px-5 pt-5 pb-3 border-b border-[#F0D4E5]">الإعدادات</h3>

          <div className="px-5 py-4 border-b border-[#F0D4E5]/60">
            <p className="text-[#1A1A1A] text-sm font-medium mb-3">وضع العرض</p>
            <div className="flex gap-2">
              {([
                { value: "light" as const, label: "نهاري", icon: Sun },
                { value: "dark" as const, label: "ليلي", icon: Moon },
                { value: "auto" as const, label: "تلقائي", icon: Settings },
              ]).map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.value} onClick={() => setTheme(t.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all ${
                      theme === t.value
                        ? "border-[#D81B60] bg-[#FFF0F6] text-[#D81B60]"
                        : "border-[#F0D4E5] text-[#6B6B6B]"
                    }`}>
                    <Icon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {[
            { icon: Bell, label: "الإشعارات" },
            { icon: Shield, label: "سياسة الخصوصية" },
            { icon: Phone, label: "تواصل معنا" },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label}
                className="flex items-center justify-between px-5 py-4 border-b border-[#F0D4E5]/60 hover:bg-[#FFF0F6] transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FFF0F6] flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[#D81B60]" />
                  </div>
                  <span className="text-sm font-medium text-[#1A1A1A]">{item.label}</span>
                </div>
                <ChevronLeft className="w-4 h-4 text-[#6B6B6B]" />
              </div>
            );
          })}
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="w-full h-12 rounded-2xl border-2 border-red-200 text-red-500 font-bold flex items-center justify-center gap-2 bg-white"
        >
          <LogOut className="w-5 h-5" />
          تسجيل الخروج
        </motion.button>
      </div>
    </div>
  );
}
