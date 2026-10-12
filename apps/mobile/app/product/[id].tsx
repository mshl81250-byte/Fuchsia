import React, { useEffect, useState } from "react";
import { Alert, Image, SafeAreaView, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "../../lib/api";
import { getSessionId, getUser } from "../../lib/auth-storage";
import { CartButton, PrimaryButton, QuantityControl, ScreenHeader } from "../../components/ui";
import { colors, styles } from "../../lib/theme";

export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<any>();
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    apiRequest<any>(`/api/products/${id}`).then(setProduct).catch(() => undefined);
    getUser().then((u) => {
      if (!u || u.isGuest) return;
      apiRequest<any[]>(`/api/favorites?userId=${u.id}`).then((items) => {
        setIsFavorite(items.some((item) => item.id === Number(id)));
      }).catch(() => undefined);
    });
  }, [id]);

  async function toggleFavorite() {
    const u = await getUser();
    if (!u || u.isGuest) { Alert.alert("سجلي دخولك", "يمكنك حفظ الهدايا بعد تسجيل الدخول"); return; }
    try {
      const result = await apiRequest<{ isFavorite: boolean }>("/api/favorites", { method: "POST", json: { userId: u.id, productId: Number(id) } });
      setIsFavorite(result.isFavorite);
    } catch (e) { Alert.alert("تعذر الحفظ", e instanceof Error ? e.message : ""); }
  }

  async function add() {
    const sessionId = await getSessionId();
    if (!sessionId || !product) return;
    try {
      await apiRequest("/api/cart", { method: "POST", json: { sessionId, productId: Number(id), quantity } });
      Alert.alert("تمت الإضافة إلى السلة", "أضيفت الهدية بنجاح", [{ text: "متابعة التسوق", style: "cancel" }, { text: "فتح السلة", onPress: () => router.push("/cart") }]);
    } catch (e) { Alert.alert("تعذر الإضافة", e instanceof Error ? e.message : "حاول مرة أخرى"); }
  }

  if (!product) return <SafeAreaView style={styles.screen}><View style={styles.content}><ScreenHeader title="تفاصيل الهدية" onBack={() => router.back()} /><Text style={styles.subtitle}>جارٍ تحميل المنتج...</Text></View></SafeAreaView>;
  const image = product.imageUrl || product.images?.[0];
  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader title="تفاصيل الهدية" onBack={() => router.back()} rightIcon={isFavorite ? "heart" : "heart-outline"} onRight={toggleFavorite} />
      <View style={{ position: "relative" }}>
        {image ? <Image source={{ uri: image }} style={{ width: "100%", height: 330, borderRadius: 27 }} resizeMode="cover" /> : <View style={{ height: 330, borderRadius: 27, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" }}><Ionicons name="gift-outline" size={90} color={colors.primary} /></View>}
        <View style={{ position: "absolute", top: 14, right: 14, backgroundColor: colors.white, borderRadius: 14, padding: 5 }}><Ionicons name="sparkles" size={18} color={colors.gold} /></View>
      </View>
      <Text style={[styles.title, { marginTop: 20 }]}>{product.nameAr}</Text>
      <Text style={{ color: colors.primary, fontSize: 28, fontWeight: "900", textAlign: "right", marginTop: 12 }}>{product.discountPrice ?? product.price} ر.س</Text>
      <Text style={[styles.subtitle, { marginTop: 16 }]}>{product.descriptionAr || "هدية مختارة بعناية لتصنع لحظة لا تُنسى."}</Text>
      <View style={[styles.card, { marginTop: 22, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }]}><QuantityControl quantity={quantity} onIncrease={() => setQuantity((q) => q + 1)} onDecrease={() => setQuantity((q) => Math.max(1, q - 1))} /><Text style={{ color: colors.muted, fontSize: 12 }}>اختاري الكمية</Text></View>
      <View style={{ marginTop: 14 }}><PrimaryButton title="أضف إلى السلة" icon="bag-add-outline" onPress={add} /></View>
    </ScrollView>
    <View style={{ position: "absolute", left: 20, bottom: 22 }}><CartButton onPress={() => router.push("/cart")} /></View>
  </SafeAreaView>;
}
