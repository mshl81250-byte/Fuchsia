import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin, useRegister, useLoginAsGuest } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Mail, Lock, User, Phone, Timer, ArrowRight } from "lucide-react";

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
  const [verificationCode, setVerificationCode] = useState("");
  const [registrationStep, setRegistrationStep] = useState<"details" | "verify">("details");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  useEffect(() => {
    if (registrationStep !== "verify" || secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [registrationStep, secondsLeft]);

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
    setIsSendingCode(true);
    try {
      const response = await fetch("/api/auth/register/request-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(registerForm) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "تعذر إرسال الرمز");
      setRegistrationStep("verify");
      setSecondsLeft(180);
      toast({ title: "تم إرسال رمز التحقق", description: "تحقق من بريدك الإلكتروني. صلاحية الرمز 3 دقائق." });
    } catch {
      toast({ variant: "destructive", title: "تعذر إرسال الرمز", description: "تحقق من البيانات وحاول مرة أخرى" });
    } finally {
      setIsSendingCode(false);
    }
  }

  async function verifyRegistrationCode(e: React.FormEvent) {
    e.preventDefault();
    setIsVerifyingCode(true);
    try {
      const response = await fetch("/api/auth/register/verify-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: registerForm.email, code: verificationCode }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "رمز غير صحيح");
      saveUser(payload.user as any, payload.token);
      setLocation("/");
    } catch (error) {
      toast({ variant: "destructive", title: "رمز غير صحيح", description: error instanceof Error ? error.message : "أدخل الرمز المرسل إلى بريدك" });
    } finally {
      setIsVerifyingCode(false);
    }
  }

  async function resendVerificationCode() {
    if (secondsLeft > 0 || isSendingCode) return;
    const fakeEvent = { preventDefault() {} } as React.FormEvent;
    await handleRegister(fakeEvent);
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
    <div className="min-h-screen bg-[#FFF0F6] flex flex-col items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo className="w-20 h-20" />
          </div>
          <h1 className="font-serif text-4xl font-bold text-[#D81B60]">فوشيا</h1>
          <p className="text-[#6B6B6B] mt-1">روعة المناسبات في مكان واحد</p>
        </div>

        <div className="bg-white rounded-3xl shadow-md border border-[#F0D4E5] overflow-hidden">
          <div className="flex border-b border-[#F0D4E5]">
            {(["login", "register"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-4 text-base font-bold transition-colors ${
                  tab === t ? "text-[#D81B60] border-b-2 border-[#D81B60]" : "text-[#6B6B6B]"
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
                      className="pr-10 bg-[#FFF0F6] border-[#F0D4E5] focus:border-[#D81B60] rounded-xl h-12"
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
                      className="pr-10 pl-10 bg-[#FFF0F6] border-[#F0D4E5] focus:border-[#D81B60] rounded-xl h-12"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="button" className="text-[#D81B60] text-sm text-right font-medium">نسيت كلمة المرور؟</button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full h-13 rounded-2xl text-white font-bold py-3 text-base mt-2"
                  style={{ background: "linear-gradient(135deg, #D81B60, #F48FB1 150%)", boxShadow: "0 4px 16px #D81B6040" }}
                >
                  {loginMutation.isPending ? "جاري الدخول..." : "تسجيل الدخول"}
                </motion.button>
              </form>
            ) : registrationStep === "verify" ? (
              <form onSubmit={verifyRegistrationCode} className="flex flex-col gap-5 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF0F6] text-[#D81B60]"><Mail className="h-8 w-8" /></div>
                <div><h2 className="text-xl font-bold text-[#1A1A1A]">تحقق من بريدك الإلكتروني</h2><p className="mt-2 text-sm leading-7 text-[#6B6B6B]">أرسلنا رمزاً من 6 أرقام إلى<br /><span className="font-bold text-[#D81B60]" dir="ltr">{registerForm.email}</span></p></div>
                <Input autoFocus inputMode="numeric" maxLength={6} value={verificationCode} onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" className="h-14 rounded-xl bg-[#FFF0F6] text-center text-2xl tracking-[0.6em] border-[#F0D4E5] focus:border-[#D81B60]" dir="ltr" required />
                <div className="flex items-center justify-center gap-2 text-sm text-[#6B6B6B]"><Timer className="h-4 w-4 text-[#D81B60]" />{secondsLeft > 0 ? `ينتهي الرمز خلال ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}` : "انتهت صلاحية الرمز"}</div>
                <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={isVerifyingCode || verificationCode.length !== 6} className="w-full h-13 rounded-2xl text-white font-bold py-3 text-base disabled:opacity-50" style={{ background: "linear-gradient(135deg, #D81B60, #F48FB1 150%)" }}>{isVerifyingCode ? "جاري التحقق..." : "تأكيد وإنشاء الحساب"}</motion.button>
                <div className="flex items-center justify-between text-sm"><button type="button" onClick={() => { setRegistrationStep("details"); setVerificationCode(""); }} className="inline-flex items-center gap-1 text-[#6B6B6B] hover:text-[#D81B60]"><ArrowRight className="h-4 w-4" />تعديل البيانات</button><button type="button" onClick={() => void resendVerificationCode()} disabled={secondsLeft > 0 || isSendingCode} className="font-bold text-[#D81B60] disabled:text-[#B9A5AE]">إعادة إرسال الرمز</button></div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[#1A1A1A] font-medium">الاسم الكامل</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
                    <Input placeholder="الاسم الثلاثي" value={registerForm.fullName}
                      onChange={e => setRegisterForm(f => ({ ...f, fullName: e.target.value }))}
                      className="pr-10 bg-[#FFF0F6] border-[#F0D4E5] focus:border-[#D81B60] rounded-xl h-12" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#1A1A1A] font-medium">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
                    <Input type="email" placeholder="example@email.com" value={registerForm.email}
                      onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                      className="pr-10 bg-[#FFF0F6] border-[#F0D4E5] focus:border-[#D81B60] rounded-xl h-12" required dir="ltr" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#1A1A1A] font-medium">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
                    <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={registerForm.password}
                      onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))}
                      className="pr-10 pl-10 bg-[#FFF0F6] border-[#F0D4E5] focus:border-[#D81B60] rounded-xl h-12" required />
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
                      className="pr-10 bg-[#FFF0F6] border-[#F0D4E5] focus:border-[#D81B60] rounded-xl h-12" dir="ltr" />
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSendingCode}
                  className="w-full h-13 rounded-2xl text-white font-bold py-3 text-base mt-2"
                  style={{ background: "linear-gradient(135deg, #D81B60, #F48FB1 150%)", boxShadow: "0 4px 16px #D81B6040" }}
                >
                  {isSendingCode ? "جاري إرسال الرمز..." : "إرسال رمز التحقق"}
                </motion.button>
              </form>
            )}
          </div>

          <div className="px-6 pb-6">
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-[#F0D4E5]" />
              <span className="text-[#6B6B6B] text-sm">أو</span>
              <div className="flex-1 h-px bg-[#F0D4E5]" />
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleGuest}
              disabled={guestMutation.isPending}
              className="w-full h-12 rounded-2xl border-2 border-[#D81B60] text-[#D81B60] font-bold text-base"
            >
              {guestMutation.isPending ? "..." : "الدخول كضيف"}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
