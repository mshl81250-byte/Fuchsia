import React, { useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { apiRequest } from "../lib/api";
import { saveSession } from "../lib/auth-storage";
import { colors, styles } from "../lib/theme";

type Mode = "login" | "register" | "verify";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [debugCode, setDebugCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function finish(result: { user: any; token: string }) {
    await saveSession(result.user, result.token);
    router.replace("/(tabs)");
  }
  async function login() {
    try { setBusy(true); await finish(await apiRequest("/api/auth/login", { method: "POST", json: { email, password } })); }
    catch (e) { Alert.alert("تعذر الدخول", e instanceof Error ? e.message : "حاول مرة أخرى"); }
    finally { setBusy(false); }
  }
  async function requestCode() {
    try {
      setBusy(true);
      const result = await apiRequest<{ message: string; debugCode?: string }>("/api/auth/register/request-code", { method: "POST", headers: { "X-Fuchsia-OTP-Debug": "true" }, json: { fullName, email, password, phone: phone || null } });
      setDebugCode(result.debugCode || ""); setMode("verify");
      Alert.alert("تم إرسال الرمز", result.debugCode ? "وضع التجربة مفعّل: سيظهر الرمز داخل الشاشة." : result.message);
    } catch (e) { Alert.alert("تعذر إرسال الرمز", e instanceof Error ? e.message : "حاول مرة أخرى"); }
    finally { setBusy(false); }
  }
  async function verify() {
    try { setBusy(true); await finish(await apiRequest("/api/auth/register/verify-code", { method: "POST", json: { email, code } })); }
    catch (e) { Alert.alert("رمز غير صحيح", e instanceof Error ? e.message : "تحقق من الرمز"); }
    finally { setBusy(false); }
  }
  async function guest() {
    try { setBusy(true); await finish(await apiRequest("/api/auth/guest", { method: "POST", json: {} })); }
    catch (e) { Alert.alert("تعذر الدخول كزائر", e instanceof Error ? e.message : ""); }
    finally { setBusy(false); }
  }

  const heading = mode === "verify" ? "تحقق من بريدك" : mode === "register" ? "إنشاء حساب جديد" : "أهلاً بك من جديد";
  return <SafeAreaView style={styles.screen}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.content, { flexGrow: 1, justifyContent: "center" }]}>
        <Image source={require("../assets/branding/fuchsia-logo-source.png")} resizeMode="contain" style={{ alignSelf: "center", width: 180, height: 112, marginBottom: 5 }} />
        <Text style={[styles.title, { textAlign: "center", marginTop: 8 }]}>{heading}</Text>
        <Text style={[styles.subtitle, { textAlign: "center", marginBottom: 24 }]}>{mode === "verify" ? `أدخل الرمز المرسل إلى ${email}` : "هدايا تليق بلحظتك"}</Text>
        {mode === "verify" ? <VerifyView debugCode={debugCode} code={code} setCode={setCode} busy={busy} verify={verify} back={() => setMode("register")} /> : <FormView mode={mode} fullName={fullName} setFullName={setFullName} phone={phone} setPhone={setPhone} email={email} setEmail={setEmail} password={password} setPassword={setPassword} busy={busy} submit={mode === "register" ? requestCode : login} switchMode={() => setMode(mode === "register" ? "login" : "register")} guest={guest} />}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
function VerifyView({ debugCode, code, setCode, busy, verify, back }: any) { return <>
  <View style={{ backgroundColor: colors.soft, borderRadius: 18, padding: 18, marginBottom: 16 }}><Text style={{ color: colors.primary, fontWeight: "900", textAlign: "center", fontSize: 16 }}>رمز التجربة</Text><Text style={{ color: colors.primaryDark, fontWeight: "900", textAlign: "center", fontSize: 34, letterSpacing: 8, marginTop: 8 }}>{debugCode || "سيظهر هنا عند تفعيل MOBILE_OTP_DEBUG"}</Text><Text style={{ color: colors.muted, textAlign: "center", fontSize: 12, marginTop: 8 }}>هذا العرض مخصص للتجربة فقط، والاستثناء الوحيد في النسخة التجريبية.</Text></View>
  <TextInput value={code} onChangeText={setCode} placeholder="أدخل الرمز المكون من 6 أرقام" keyboardType="number-pad" maxLength={6} style={[styles.input, { textAlign: "center", letterSpacing: 8 }]} />
  <Pressable disabled={busy} onPress={verify} style={[styles.button, { marginTop: 16 }]}><Text style={styles.buttonText}>{busy ? "جارٍ التحقق..." : "تأكيد الرمز"}</Text></Pressable>
  <Pressable onPress={back} style={{ padding: 16 }}><Text style={{ color: colors.primary, textAlign: "center", fontWeight: "700" }}>تعديل بيانات التسجيل</Text></Pressable>
</>; }
function FormView({ mode, fullName, setFullName, phone, setPhone, email, setEmail, password, setPassword, busy, submit, switchMode, guest }: any) { return <>
  {mode === "register" && <><TextInput value={fullName} onChangeText={setFullName} placeholder="الاسم الكامل" style={styles.input} /><TextInput value={phone} onChangeText={setPhone} placeholder="رقم الهاتف (اختياري)" keyboardType="phone-pad" style={[styles.input, { marginTop: 10 }]} /></>}
  <TextInput value={email} onChangeText={setEmail} placeholder="البريد الإلكتروني" keyboardType="email-address" autoCapitalize="none" style={[styles.input, { marginTop: mode === "register" ? 10 : 0 }]} />
  <TextInput value={password} onChangeText={setPassword} placeholder="كلمة المرور (8 أحرف على الأقل)" secureTextEntry style={[styles.input, { marginTop: 10 }]} />
  <Pressable disabled={busy} onPress={submit} style={[styles.button, { marginTop: 18, opacity: busy ? .65 : 1 }]}><Text style={styles.buttonText}>{busy ? "جارٍ التنفيذ..." : mode === "register" ? "إرسال رمز التحقق" : "تسجيل الدخول"}</Text></Pressable>
  <Pressable onPress={switchMode} style={{ padding: 16 }}><Text style={{ color: colors.primary, textAlign: "center", fontWeight: "700" }}>{mode === "register" ? "لدي حساب بالفعل" : "إنشاء حساب جديد"}</Text></Pressable>
  <Pressable onPress={guest} style={[styles.card, { marginTop: 5, alignItems: "center" }]}><Text style={{ color: colors.ink, fontWeight: "700" }}>الدخول كزائر</Text></Pressable>
</>; }
