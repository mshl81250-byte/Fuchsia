import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { router, useLocalSearchParams } from "expo-router";
import { apiRequest } from "../lib/api";
import { getBiometricEnabled, getToken, getUser, saveSession } from "../lib/auth-storage";
import { colors, styles } from "../lib/theme";

type Mode = "login" | "register" | "verify";
type AuthInputProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoComplete?: "name" | "tel" | "email" | "password" | "off";
  secureTextEntry?: boolean;
  maxLength?: number;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  trailing?: React.ReactNode;
  textAlign?: "left" | "center" | "right";
  compact?: boolean;
};

const logo = require("../assets/branding/fuchsia-logo-source.png");

export default function Auth() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const { height } = useWindowDimensions();
  const compact = height < 740;
  const [mode, setMode] = useState<Mode>(params.mode === "register" ? "register" : "login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [debugCode, setDebugCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (params.mode === "register") setMode("register");
    if (params.mode === "login") setMode("login");
  }, [params.mode]);

  useEffect(() => {
    Promise.all([getBiometricEnabled(), getToken(), getUser()])
      .then(([enabled, token, user]) => setBiometricAvailable(Boolean(enabled && token && user && !user.isGuest)))
      .catch(() => setBiometricAvailable(false));
  }, []);

  async function finish(result: { user: any; token: string }) {
    await saveSession(result.user, result.token);
    router.replace("/(tabs)");
  }

  async function login() {
    try {
      setBusy(true);
      await finish(await apiRequest("/api/auth/login", { method: "POST", json: { email, password } }));
    } catch (e) {
      Alert.alert("تعذر الدخول", e instanceof Error ? e.message : "حاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  }

  async function requestCode() {
    try {
      setBusy(true);
      const result = await apiRequest<{ message: string; debugCode?: string }>("/api/auth/register/request-code", {
        method: "POST",
        headers: { "X-Fuchsia-OTP-Debug": "true" },
        json: { fullName, email, password, phone: phone || null },
      });
      setDebugCode(result.debugCode || "");
      setMode("verify");
      Alert.alert("تم إرسال الرمز", result.debugCode ? "وضع التجربة مفعّل: سيظهر الرمز داخل الشاشة." : result.message);
    } catch (e) {
      Alert.alert("تعذر إرسال الرمز", e instanceof Error ? e.message : "حاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    try {
      setBusy(true);
      await finish(await apiRequest("/api/auth/register/verify-code", { method: "POST", json: { email, code } }));
    } catch (e) {
      Alert.alert("رمز غير صحيح", e instanceof Error ? e.message : "تحقق من الرمز");
    } finally {
      setBusy(false);
    }
  }

  async function biometricLogin() {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "الدخول إلى Fuchsia Boutique بالبصمة",
        cancelLabel: "إلغاء",
      });
      if (result.success) router.replace("/(tabs)");
    } catch {
      Alert.alert("تعذر استخدام البصمة", "حاولي الدخول بالبريد وكلمة المرور.");
    }
  }

  async function guest() {
    try {
      setBusy(true);
      await finish(await apiRequest("/api/auth/guest", { method: "POST", json: {} }));
    } catch (e) {
      Alert.alert("تعذر الدخول كزائرة", e instanceof Error ? e.message : "حاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  }

  const heading = mode === "verify" ? "تحققي من بريدك" : mode === "register" ? "أنشئي حسابك" : "أهلًا بك من جديد";
  const description = mode === "verify"
    ? `أرسلنا رمز التحقق إلى ${email}`
    : mode === "register"
      ? "حسابك يحفظ تفاصيلك ويتابع طلباتك بكل سهولة."
      : "سجّلي الدخول وتابعي هداياك وطلباتك من مكان واحد.";

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.cream} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 19, paddingTop: compact ? 0 : 7, paddingBottom: compact ? 12 : 20 }}
        >
          <View style={{ minHeight: 55, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 7 }}>
              <Image source={logo} resizeMode="contain" style={{ width: 67, height: 54 }} />
              <View>
                <Text style={{ color: colors.primaryDark, fontSize: 13, fontWeight: "900", textAlign: "right" }}>Fuchsia Boutique</Text>
                <Text style={{ color: colors.muted, fontSize: 10, textAlign: "right", marginTop: 1 }}>هدية تليق بلحظتك</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="رجوع"
              hitSlop={5}
              android_ripple={{ color: "#F4E1E8" }}
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
              style={({ pressed }) => ({ width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, opacity: pressed ? 0.75 : 1, overflow: "hidden" })}
            >
              <Ionicons name="arrow-forward" size={20} color={colors.primary} />
            </Pressable>
          </View>

          <View style={{ alignItems: "flex-end", marginTop: compact ? 7 : 13, marginBottom: compact ? 10 : 14 }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.gold }} />
              <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900" }}>دائمًا أقرب إلى لحظاتك</Text>
            </View>
            <Text style={[styles.title, { fontSize: compact ? 23 : 26, lineHeight: compact ? 31 : 35 }]}>{heading}</Text>
            <Text style={[styles.subtitle, { fontSize: 12, lineHeight: 19, marginTop: 3 }]}>{description}</Text>
          </View>

          {mode !== "verify" ? (
            <View style={{ flexDirection: "row-reverse", padding: 3, borderRadius: 15, backgroundColor: colors.soft, marginBottom: 11 }}>
              <ModeTab active={mode === "login"} label="تسجيل الدخول" onPress={() => setMode("login")} />
              <ModeTab active={mode === "register"} label="حساب جديد" onPress={() => setMode("register")} />
            </View>
          ) : (
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 10, marginBottom: 11 }}>
              <Ionicons name="mail-open-outline" size={18} color={colors.primary} />
              <Text style={{ flex: 1, color: colors.primaryDark, fontSize: 11, lineHeight: 17, textAlign: "right", fontWeight: "700" }}>أدخلي الرمز المكوّن من 6 أرقام لإكمال إنشاء حسابك.</Text>
            </View>
          )}

          <View style={[styles.card, { padding: compact ? 14 : 16, borderRadius: 20, shadowOpacity: 0.06, shadowRadius: 16, elevation: 2 }]}>
            {mode === "verify" ? (
              <>
                {debugCode ? (
                  <View style={{ alignItems: "center", backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.line, borderRadius: 15, padding: 11, marginBottom: 12 }}>
                    <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800" }}>رمز التحقق التجريبي</Text>
                    <Text style={{ color: colors.primaryDark, fontSize: 27, fontWeight: "900", letterSpacing: 7, marginTop: 4 }}>{debugCode}</Text>
                    <Text style={{ color: colors.muted, fontSize: 10, textAlign: "center", marginTop: 4 }}>يظهر هذا الرمز في وضع الاختبار فقط.</Text>
                  </View>
                ) : null}
                <AuthInput
                  compact={compact}
                  label="رمز التحقق"
                  placeholder="أدخلي الرمز المكوّن من 6 أرقام"
                  value={code}
                  onChangeText={setCode}
                  icon="keypad-outline"
                  keyboardType="number-pad"
                  maxLength={6}
                  textAlign="center"
                  focused={focusedField === "code"}
                  onFocus={() => setFocusedField("code")}
                  onBlur={() => setFocusedField(null)}
                />
                <ActionButton title="تأكيد وإنشاء الحساب" busy={busy} disabled={busy} onPress={verify} />
                <Pressable onPress={() => setMode("register")} hitSlop={8} style={{ alignItems: "center", minHeight: 40, justifyContent: "center", marginTop: 4 }}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>العودة لتعديل بيانات التسجيل</Text>
                </Pressable>
              </>
            ) : (
              <>
                {mode === "register" ? (
                  <>
                    <AuthInput compact={compact} label="الاسم الكامل" placeholder="الاسم كما تحبين أن نناديك" value={fullName} onChangeText={setFullName} icon="person-outline" autoComplete="name" autoCapitalize="words" focused={focusedField === "name"} onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} />
                    <AuthInput compact={compact} label="رقم الهاتف" placeholder="رقم للتواصل (اختياري)" value={phone} onChangeText={setPhone} icon="call-outline" keyboardType="phone-pad" autoComplete="tel" focused={focusedField === "phone"} onFocus={() => setFocusedField("phone")} onBlur={() => setFocusedField(null)} />
                  </>
                ) : null}
                <AuthInput compact={compact} label="البريد الإلكتروني" placeholder="name@example.com" value={email} onChangeText={setEmail} icon="mail-outline" keyboardType="email-address" autoCapitalize="none" autoComplete="email" focused={focusedField === "email"} onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} />
                <AuthInput
                  compact={compact}
                  label="كلمة المرور"
                  placeholder="٨ أحرف على الأقل"
                  value={password}
                  onChangeText={setPassword}
                  icon="lock-closed-outline"
                  autoComplete="password"
                  secureTextEntry={!showPassword}
                  focused={focusedField === "password"}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  trailing={(
                    <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} onPress={() => setShowPassword((current) => !current)} hitSlop={10} style={{ minWidth: 38, minHeight: 42, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={19} color={colors.muted} />
                    </Pressable>
                  )}
                />
                <ActionButton title={mode === "register" ? "إرسال رمز التحقق" : "تسجيل الدخول"} busy={busy} disabled={busy} onPress={mode === "register" ? requestCode : login} />

                {mode === "login" && biometricAvailable ? (
                  <Pressable
                    accessibilityRole="button"
                    android_ripple={{ color: colors.soft }}
                    onPress={biometricLogin}
                    style={({ pressed }) => ({ minHeight: 46, marginTop: 8, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.cream, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, opacity: pressed ? 0.75 : 1, overflow: "hidden" })}
                  >
                    <Ionicons name="finger-print-outline" size={20} color={colors.primary} />
                    <Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: "900" }}>الدخول بالبصمة</Text>
                  </Pressable>
                ) : null}

                <View style={{ height: 1, backgroundColor: colors.line, marginVertical: compact ? 10 : 13 }} />
                <Pressable
                  disabled={busy}
                  accessibilityRole="button"
                  android_ripple={{ color: colors.soft }}
                  onPress={guest}
                  style={({ pressed }) => ({ minHeight: 45, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 7, opacity: busy ? 0.5 : pressed ? 0.75 : 1, overflow: "hidden" })}
                >
                  <Ionicons name="bag-handle-outline" size={17} color={colors.primary} />
                  <Text style={{ color: colors.ink, fontSize: 12, fontWeight: "800" }}>المتابعة كزائرة</Text>
                </Pressable>
              </>
            )}
          </View>

          <View style={{ flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", gap: 5, marginTop: 12 }}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 10 }}>تجربة آمنة وخصوصية تحترمك</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ModeTab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      android_ripple={{ color: colors.blush }}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, minHeight: 43, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: active ? colors.white : "transparent", opacity: pressed ? 0.78 : 1, ...(active ? { shadowColor: "#341321", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 1 } : {}) })}
    >
      <Text style={{ color: active ? colors.primaryDark : colors.muted, fontSize: 12, fontWeight: active ? "900" : "700" }}>{label}</Text>
    </Pressable>
  );
}

function AuthInput({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  keyboardType = "default",
  autoCapitalize = "sentences",
  autoComplete = "off",
  secureTextEntry = false,
  maxLength,
  focused,
  onFocus,
  onBlur,
  trailing,
  textAlign = "right",
  compact = false,
}: AuthInputProps) {
  return (
    <View style={{ marginBottom: compact ? 9 : 11 }}>
      <Text style={{ color: colors.ink, textAlign: "right", fontSize: 11, fontWeight: "900", marginBottom: 4 }}>{label}</Text>
      <View style={{ minHeight: compact ? 48 : 51, flexDirection: "row-reverse", alignItems: "center", borderWidth: focused ? 1.5 : 1, borderColor: focused ? colors.primary : colors.line, backgroundColor: colors.white, borderRadius: 13, paddingHorizontal: 10 }}>
        <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.muted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          onFocus={onFocus}
          onBlur={onBlur}
          selectionColor={colors.primary}
          style={{ flex: 1, minHeight: compact ? 46 : 49, paddingHorizontal: 9, color: colors.ink, textAlign, fontSize: 13 }}
        />
        {trailing}
      </View>
    </View>
  );
}

function ActionButton({ title, busy, disabled, onPress }: { title: string; busy: boolean; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      android_ripple={{ color: "rgba(255,255,255,0.17)" }}
      onPress={onPress}
      style={({ pressed }) => ({ minHeight: 51, borderRadius: 15, backgroundColor: colors.primary, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 2, opacity: disabled ? 0.68 : 1, transform: [{ scale: pressed ? 0.985 : 1 }], shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.13, shadowRadius: 10, elevation: 3, overflow: "hidden" })}
    >
      {busy ? <ActivityIndicator color="#FFFFFF" /> : <>
        <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "900" }}>{title}</Text>
        <Ionicons name="arrow-back" size={17} color="#FFFFFF" />
      </>}
    </Pressable>
  );
}
