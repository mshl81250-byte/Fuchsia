import React, { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { apiRequest, logoutFromServer } from "../../lib/api";
import { clearSession, getToken, getUser, saveSession } from "../../lib/auth-storage";
import { colors, styles } from "../../lib/theme";
import { IconButton } from "../../components/ui";

const links = [
  ["المفضلة", "/favorites"],
  ["الإشعارات", "/notifications"],
  ["فوشيا بوتيك", "/stores"],
  ["الإعدادات", "/settings"],
] as const;

export default function Profile() {
  const [user, setUser] = useState<any>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    getUser().then((savedUser) => {
      setUser(savedUser);
      setName(savedUser?.fullName || "");
      setPhone(savedUser?.phone || "");
      setAddress(savedUser?.address || "");
    });
  }, []);

  async function save() {
    if (!user) return;
    try {
      const token = await getToken();
      if (!token) throw new Error("انتهت الجلسة؛ سجّل الدخول من جديد.");
      const updated = await apiRequest<any>("/api/auth/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        json: { fullName: name, phone, address },
      });
      await saveSession(updated, token);
      setUser(updated);
      Alert.alert("تم الحفظ", "تم تحديث بيانات الحساب.");
    } catch (error) {
      Alert.alert("تعذر الحفظ", error instanceof Error ? error.message : "حاول مرة أخرى.");
    }
  }

  async function logout() {
    await logoutFromServer().catch(() => undefined);
    await clearSession();
    router.replace("/");
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
          <IconButton name="notifications-outline" label="الإشعارات" onPress={() => router.push("/notifications")} />
          <Text style={styles.title}>حسابي</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={[styles.card, { marginTop: 18, alignItems: "center" }]}>
          <View style={{ width: 74, height: 74, borderRadius: 38, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.primary, fontSize: 28, fontWeight: "900" }}>{name.slice(0, 1) || "ف"}</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: "900", marginTop: 10, color: colors.ink }}>{name}</Text>
          <Text style={styles.subtitle}>{user?.email}</Text>
          <Text style={{ color: colors.primary, marginTop: 8, fontWeight: "800" }}>{user?.rewardPoints || 0} نقطة فوشيا</Text>
        </View>
        <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          {links.map(([label, path]) => (
            <Pressable key={path} onPress={() => router.push(path)} style={[styles.card, { width: "48%", padding: 14 }]}>
              <Text style={{ textAlign: "right", color: colors.ink, fontWeight: "800" }}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput style={[styles.input, { marginTop: 18 }]} value={name} onChangeText={setName} placeholder="الاسم الكامل" />
        <TextInput style={[styles.input, { marginTop: 10 }]} value={phone} onChangeText={setPhone} placeholder="رقم الهاتف" keyboardType="phone-pad" />
        <TextInput style={[styles.input, { marginTop: 10, minHeight: 70 }]} value={address} onChangeText={setAddress} placeholder="عنوان التوصيل الافتراضي" multiline />
        <Pressable onPress={save} style={[styles.button, { marginTop: 18 }]}>
          <Text style={styles.buttonText}>حفظ التغييرات</Text>
        </Pressable>
        <Pressable onPress={logout} style={{ padding: 18 }}>
          <Text style={{ color: colors.primary, textAlign: "center", fontWeight: "800" }}>تسجيل الخروج</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
