import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
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
};

const hero = require("../assets/branding/fuchsia-welcome-hero.jpg");
const logo = require("../assets/branding/fuchsia-logo-source.png");

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
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
    Promise.all([getBiometricEnabled(), getToken(), getUser()]).then(([enabled, token, user]) => {
      setBiometricAvailable(Boolean(enabled && token && user && !user.isGuest));
    });
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
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "الدخول إلى Fuchsia Boutique بالبصمة",
      cancelLabel: "إلغاء",
    });
    if (result.success) router.replace("/(tabs)");
  }

  async function guest() {
    try {
      setBusy(true);
      await finish(await apiRequest("/api/auth/guest", { method: "POST", json: {} }));
    } catch (e) {
      Alert.alert("تعذر الدخول كزائر", e instanceof Error ? e.message : "حاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  }

  const heading = mode === "verify" ? "بقيت خطوة واحدة" : mode === "register" ? "حسابك، بطريقتك" : "أهلًا بعودتك";
  const description = mode === "verify"
    ? `أرسلنا رمز التحقق إلى ${email}`
    : mode === "register"
      ? "أنشئي حسابك لتتابعي طلباتك وتحتفظي بتفاصيلك الجميلة."
      : "سجّلي الدخول واكتشفي اختيارات فوشيا التي تليق بلحظتك.";

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.cream} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22, paddingTop: 6, paddingBottom: 28 }}
        >
          <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", minHeight: 55 }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
              <Image source={logo} resizeMode="contain" style={{ width: 70, height: 57 }} />
              <View>
                <Text style={{ color: colors.primaryDark, fontSize: 14, fontWeight: "900", textAlign: "right" }}>Fuchsia Boutique</Text>
                <Text style={{ color: colors.muted, fontSize: 11, textAlign: "right", marginTop: 2 }}>هدايا تصنع لحظات</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="العودة إلى الترحيب"
              onPress={() => router.replace("/")}
              style={({ pressed }) => ({ width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, opacity: pressed ? 0.65 : 1 })}
            >
              <Ionicons name="arrow-forward" size={20} color={colors.primary} />
            </Pressable>
          </View>

          <ImageBackground
            source={hero}
            resizeMode="cover"
            style={{ height: 132, borderRadius: 24, overflow: "hidden", marginTop: 13, justifyContent: "flex-end", padding: 12 }}
            imageStyle={{ borderRadius: 24 }}
          >
            <View style={{ alignSelf: "flex-start", flexDirection: "row-reverse", alignItems: "center", gap: 6, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.93)", paddingHorizontal: 10, paddingVertical: 8 }}>
              <Ionicons name="sparkles" size={14} color={colors.primary} />
              <Text style={{ color: colors.primaryDark, fontSize: 11, fontWeight: "900" }}>لمسة فوشيا لكل حكاية</Text>
            </View>
          </ImageBackground>

          <View style={{ alignItems: "flex-end", marginTop: 20, marginBottom: 16 }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 4, backgroundColor: colors.gold }} />
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 1 }}>تجربة أدفأ، في كل مرة</Text>
            </View>
            <Text style={[styles.title, { fontSize: 27, lineHeight: 36 }]}>{heading}</Text>
            <Text style={[styles.subtitle, { marginTop: 5, lineHeight: 22 }]}>{description}</Text>
          </View>

          {mode !== "verify" ? (
            <View style={{ flexDirection: "row-reverse", padding: 4, borderRadius: 17, backgroundColor: colors.soft, marginBottom: 15 }}>
              <ModeTab active={mode === "login"} label="تسجيل الدخول" onPress={() => setMode("login")} />
              <ModeTab active={mode === "register"} label="حساب جديد" onPress={() => setMode("register")} />
            </View>
          ) : (
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 9, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 13, marginBottom: 15 }}>
              <View style={{ width: 35, height: 35, borderRadius: 12, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="mail-open-outline" size={18} color={colors.primary} />
              </View>
              <Text style={{ flex: 1, color: colors.primaryDark, fontSize: 12, lineHeight: 19, textAlign: "right", fontWeight: "700" }}>أدخلي الرمز المكوّن من 6 أرقام لإكمال إنشاء حسابك بأمان.</Text>
            </View>
          )}

          <View style={[styles.card, { padding: 17, borderRadius: 23, shadowOpacity: 0.07, shadowRadius: 20, elevation: 3 }]}>
            {mode === "verify" ? (
              <>
                {debugCode ? (
                  <View style={{ alignItems: "center", backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.line, borderRadius: 17, padding: 14, marginBottom: 16 }}>
                    <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "800" }}>رمز التحقق التجريبي</Text>
                    <Text style={{ color: colors.primaryDark, fontSize: 30, fontWeight: "900", letterSpacing: 8, marginTop: 5 }}>{debugCode}</Text>
                    <Text style={{ color: colors.muted, fontSize: 10, textAlign: "center", marginTop: 5 }}>يظهر هذا الرمز في وضع الاختبار فقط.</Text>
                  </View>
                ) : null}
                <AuthInput
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
                <Pressable onPress={() => setMode("register")} style={{ alignItems: "center", paddingTop: 15 }}>
                  <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "800" }}>العودة لتعديل بيانات التسجيل</Text>
                </Pressable>
              </>
            ) : (
              <>
                {mode === "register" ? (
                  <>
                    <AuthInput
                      label="الاسم الكامل"
                      placeholder="كما تحبين أن نناديك"
                      value={fullName}
                      onChangeText={setFullName}
                      icon="person-outline"
                      autoComplete="name"
                      autoCapitalize="words"
                      focused={focusedField === "name"}
                      onFocus={() => setFocusedField("name")}
                      onBlur={() => setFocusedField(null)}
                    />
                    <AuthInput
                      label="رقم الهاتف"
                      placeholder="رقم للتواصل (اختياري)"
                      value={phone}
                      onChangeText={setPhone}
                      icon="call-outline"
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      focused={focusedField === "phone"}
                      onFocus={() => setFocusedField("phone")}
                      onBlur={() => setFocusedField(null)}
                    />
                  </>
                ) : null}
                <AuthInput
                  label="البريد الإلكتروني"
                  placeholder="name@example.com"
                  value={email}
                  onChangeText={setEmail}
                  icon="mail-outline"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  focused={focusedField === "email"}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                />
                <AuthInput
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
                    <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} onPress={() => setShowPassword((current) => !current)} hitSlop={8} style={{ padding: 8 }}>
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={19} color={colors.muted} />
                    </Pressable>
                  )}
                />
                <ActionButton
                  title={mode === "register" ? "إرسال رمز التحقق" : "تسجيل الدخول"}
                  busy={busy}
                  disabled={busy}
                  onPress={mode === "register" ? requestCode : login}
                />

                {mode === "login" && biometricAvailable ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={biometricLogin}
                    style={({ pressed }) => ({ minHeight: 49, marginTop: 10, borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.cream, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, opacity: pressed ? 0.7 : 1 })}
                  >
                    <Ionicons name="finger-print-outline" size={21} color={colors.primary} />
                    <Text style={{ color: colors.primaryDark, fontSize: 13, fontWeight: "900" }}>الدخول بالبصمة</Text>
                  </Pressable>
                ) : null}

                <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 16 }} />
                <Pressable
                  disabled={busy}
                  accessibilityRole="button"
                  onPress={guest}
                  style={({ pressed }) => ({ minHeight: 49, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.5 : pressed ? 0.68 : 1 })}
                >
                  <Ionicons name="bag-handle-outline" size={18} color={colors.primary} />
                  <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "800" }}>تابعي التصفح كزائرة</Text>
                </Pressable>
              </>
            )}
          </View>

          <View style={{ flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 17 }}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 11 }}>بياناتك محفوظة، وتجربتك معنا بكل خصوصية</Text>
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
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, minHeight: 43, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: active ? colors.white : "transparent", opacity: pressed ? 0.7 : 1, ...(active ? { shadowColor: "#341321", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 } : {}) })}
    >
      <Text style={{ color: active ? colors.primaryDark : colors.muted, fontSize: 13, fontWeight: active ? "900" : "700" }}>{label}</Text>
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
}: AuthInputProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: colors.ink, textAlign: "right", fontSize: 12, fontWeight: "900", marginBottom: 7 }}>{label}</Text>
      <View style={{ minHeight: 54, flexDirection: "row-reverse", alignItems: "center", borderWidth: focused ? 1.5 : 1, borderColor: focused ? colors.primary : colors.line, backgroundColor: colors.white, borderRadius: 15, paddingHorizontal: 12 }}>
        <Ionicons name={icon} size={19} color={focused ? colors.primary : colors.muted} />
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
          style={{ flex: 1, minHeight: 52, paddingHorizontal: 10, color: colors.ink, textAlign, fontSize: 14 }}
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
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({ minHeight: 55, borderRadius: 17, backgroundColor: colors.primary, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 3, opacity: disabled ? 0.68 : pressed ? 0.85 : 1, shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.17, shadowRadius: 12, elevation: 4 })}
    >
      {busy ? <ActivityIndicator color="#FFFFFF" /> : <>
        <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "900" }}>{title}</Text>
        <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
      </>}
    </Pressable>
  );
}
