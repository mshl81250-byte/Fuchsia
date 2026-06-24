import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin, useRegister, useLoginAsGuest } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Mail, Lock, User, Phone } from "lucide-react";

type Tab = "login" | "register";

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { saveUser } = useAuth();
  const { toast } = useToast();

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const guestMutation = useLoginAsGuest();

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ fullName: "", email: "", password: "", phone: "" });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await loginMutation.mutateAsync({ data: loginForm });
      saveUser(res.user as any, res.token);
      setLocation("/");
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "بيانات الدخول غير صحيحة" });
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await registerMutation.mutateAsync({ data: registerForm });
      saveUser(res.user as any, res.token);
      setLocation("/");
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "البريد الإلكتروني مستخدم بالفعل" });
    }
  }

  async function handleGuest() {
    try {
      const res = await guestMutation.mutateAsync();
      saveUser(res.user as any, res.token);
      setLocation("/");
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ" });
    }
  }

  return (
    <div className="min-h-screen bg-[#F9F6F0] flex flex-col items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo className="w-20 h-20" />
          </div>
          <h1 className="font-serif text-4xl font-bold text-[#C9A84C]">لمسة</h1>
          <p className="text-[#6B6B6B] mt-1">فخامة بلمسة واحدة</p>
        </div>

        <div className="bg-white rounded-3xl shadow-md border border-[#E8E0D0] overflow-hidden">
          <div className="flex border-b border-[#E8E0D0]">
            {(["login", "register"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-4 text-base font-bold transition-colors ${
                  tab === t ? "text-[#C9A84C] border-b-2 border-[#C9A84C]" : "text-[#6B6B6B]"
                }`}
              >
                {t === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === "login" ? (
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[#1A1A1A] font-medium">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      value={loginForm.email}
                      onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                      className="pr-10 bg-[#F9F6F0] border-[#E8E0D0] focus:border-[#C9A84C] rounded-xl h-12"
                      required dir="ltr"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#1A1A1A] font-medium">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                      className="pr-10 pl-10 bg-[#F9F6F0] border-[#E8E0D0] focus:border-[#C9A84C] rounded-xl h-12"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="button" className="text-[#C9A84C] text-sm text-right font-medium">نسيت كلمة المرور؟</button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full h-13 rounded-2xl text-white font-bold py-3 text-base mt-2"
                  style={{ background: "linear-gradient(135deg, #C9A84C, #E8D5A3 150%)", boxShadow: "0 4px 16px #C9A84C40" }}
                >
                  {loginMutation.isPending ? "جاري الدخول..." : "تسجيل الدخول"}
                </motion.button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[#1A1A1A] font-medium">الاسم الكامل</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
                    <Input placeholder="الاسم الثلاثي" value={registerForm.fullName}
                      onChange={e => setRegisterForm(f => ({ ...f, fullName: e.target.value }))}
                      className="pr-10 bg-[#F9F6F0] border-[#E8E0D0] focus:border-[#C9A84C] rounded-xl h-12" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#1A1A1A] font-medium">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
                    <Input type="email" placeholder="example@email.com" value={registerForm.email}
                      onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                      className="pr-10 bg-[#F9F6F0] border-[#E8E0D0] focus:border-[#C9A84C] rounded-xl h-12" required dir="ltr" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#1A1A1A] font-medium">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
                    <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={registerForm.password}
                      onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))}
                      className="pr-10 pl-10 bg-[#F9F6F0] border-[#E8E0D0] focus:border-[#C9A84C] rounded-xl h-12" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#1A1A1A] font-medium">رقم الجوال <span className="text-[#6B6B6B] font-normal text-sm">(اختياري)</span></Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
                    <Input placeholder="7XXXXXXXX" value={registerForm.phone}
                      onChange={e => setRegisterForm(f => ({ ...f, phone: e.target.value }))}
                      className="pr-10 bg-[#F9F6F0] border-[#E8E0D0] focus:border-[#C9A84C] rounded-xl h-12" dir="ltr" />
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="w-full h-13 rounded-2xl text-white font-bold py-3 text-base mt-2"
                  style={{ background: "linear-gradient(135deg, #C9A84C, #E8D5A3 150%)", boxShadow: "0 4px 16px #C9A84C40" }}
                >
                  {registerMutation.isPending ? "جاري الإنشاء..." : "إنشاء حساب"}
                </motion.button>
              </form>
            )}
          </div>

          <div className="px-6 pb-6">
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-[#E8E0D0]" />
              <span className="text-[#6B6B6B] text-sm">أو</span>
              <div className="flex-1 h-px bg-[#E8E0D0]" />
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleGuest}
              disabled={guestMutation.isPending}
              className="w-full h-12 rounded-2xl border-2 border-[#C9A84C] text-[#C9A84C] font-bold text-base"
            >
              {guestMutation.isPending ? "..." : "الدخول كضيف"}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
