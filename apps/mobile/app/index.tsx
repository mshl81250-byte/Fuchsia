import React from "react";
import {
  Image,
  ImageBackground,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const logo = require("../assets/branding/fuchsia-logo-source.png");
const welcomeHero = require("../assets/branding/fuchsia-welcome-hero.jpg");

const services = [
  { label: "هدايا فاخرة", icon: "gift-outline", route: "/category/4" as const },
  { label: "طاولات مناسبات", icon: "restaurant-outline", route: "/category/3" as const },
  { label: "ورود وزهور", icon: "flower-outline", route: "/category/6" as const },
  { label: "تجهيز الخطوبة", icon: "heart-outline", route: "/category/2" as const },
];

export default function Welcome() {
  const { height, width } = useWindowDimensions();
  const compact = height < 720;
  const heroHeight = Math.min(Math.max(height * 0.27, 172), 252);
  const cardWidth = Math.floor((width - 50) / 2);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FBF7F3" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FBF7F3" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: compact ? 2 : 8, paddingBottom: compact ? 10 : 16 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={{ minHeight: 58, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
            <Image source={logo} resizeMode="contain" style={{ width: 73, height: 59 }} />
            <View>
              <Text style={{ color: "#79133F", fontSize: 13, fontWeight: "900", textAlign: "right" }}>فوشيا بوتيك</Text>
              <Text style={{ color: "#8A747D", fontSize: 10, textAlign: "right", marginTop: 2 }}>صنعاء • لمسات من القلب</Text>
            </View>
          </View>
          <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: "#FFF0F5", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="sparkles" size={19} color="#A51B54" />
          </View>
        </View>

        <ImageBackground
          source={welcomeHero}
          resizeMode="cover"
          style={{ height: heroHeight, marginTop: compact ? 4 : 10, borderRadius: 25, overflow: "hidden", justifyContent: "space-between", padding: 13 }}
          imageStyle={{ borderRadius: 25 }}
          accessibilityLabel="باقة ورود وهدية فاخرة من فوشيا بوتيك"
        >
          <View style={{ alignSelf: "flex-start", flexDirection: "row-reverse", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.93)", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14 }}>
            <Ionicons name="heart" size={13} color="#A51B54" />
            <Text style={{ color: "#54182F", fontSize: 11, fontWeight: "900" }}>مختارة بعناية، لكِ</Text>
          </View>
          <View style={{ alignSelf: "flex-end", flexDirection: "row-reverse", alignItems: "center", gap: 6, backgroundColor: "rgba(52,19,33,0.82)", paddingHorizontal: 11, paddingVertical: 8, borderRadius: 14 }}>
            <Ionicons name="flower" size={14} color="#FFD6E3" />
            <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>هدايا • زهور • مناسبات</Text>
          </View>
        </ImageBackground>

        <View style={{ alignItems: "flex-end", marginTop: compact ? 12 : 17 }}>
          <Text style={{ color: "#A51B54", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 }}>FUCHSIA BOUTIQUE</Text>
          <Text style={{ color: "#341321", fontSize: compact ? 24 : 27, lineHeight: compact ? 32 : 36, fontWeight: "900", textAlign: "right", marginTop: 4 }}>
            لكل لحظة جميلة… هدية تليق بها
          </Text>
          <Text style={{ color: "#806D74", fontSize: compact ? 13 : 14, lineHeight: 21, textAlign: "right", marginTop: 5 }}>
            اختاري هديتك أو تنسيق مناسبتك، ودعينا نهتم بباقي التفاصيل.
          </Text>
        </View>

        <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", rowGap: 8, marginTop: compact ? 12 : 16 }}>
          {services.map((service) => (
            <ServiceCard
              key={service.label}
              label={service.label}
              icon={service.icon as keyof typeof Ionicons.glyphMap}
              width={cardWidth}
              onPress={() => router.push(service.route)}
            />
          ))}
        </View>

        <View style={{ marginTop: compact ? 13 : 17, gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="استكشفي المتجر"
            android_ripple={{ color: "rgba(255,255,255,0.16)" }}
            onPress={() => router.replace("/(tabs)")}
            style={({ pressed }) => ({ minHeight: 54, borderRadius: 17, backgroundColor: "#A51B54", flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 9, opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.985 : 1 }], shadowColor: "#79133F", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 12, elevation: 4, overflow: "hidden" })}
          >
            <Ionicons name="bag-handle-outline" size={19} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "900" }}>استكشفي المتجر</Text>
            <Ionicons name="arrow-back" size={17} color="#FFFFFF" />
          </Pressable>
          <View style={{ minHeight: 43, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 7 }}>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.push("/auth")}
              style={({ pressed }) => ({ minHeight: 40, justifyContent: "center", paddingHorizontal: 8, opacity: pressed ? 0.58 : 1 })}
            >
              <Text style={{ color: "#79133F", fontSize: 12, fontWeight: "900" }}>تسجيل الدخول</Text>
            </Pressable>
            <View style={{ width: 1, height: 18, backgroundColor: "#E6D5DB" }} />
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.push({ pathname: "/auth", params: { mode: "register" } })}
              style={({ pressed }) => ({ minHeight: 40, justifyContent: "center", paddingHorizontal: 8, opacity: pressed ? 0.58 : 1 })}
            >
              <Text style={{ color: "#79133F", fontSize: 12, fontWeight: "900" }}>إنشاء حساب</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ServiceCard({ label, icon, width, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; width: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`فتح تصنيف ${label}`}
      android_ripple={{ color: "#F5E4EA" }}
      onPress={onPress}
      style={({ pressed }) => ({ width, minHeight: 52, borderRadius: 15, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#F0E4E7", flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 11, gap: 8, opacity: pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.98 : 1 }], overflow: "hidden" })}
    >
      <View style={{ width: 31, height: 31, borderRadius: 11, backgroundColor: "#FFF0F5", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={17} color="#A51B54" />
      </View>
      <Text numberOfLines={1} style={{ flex: 1, color: "#4B2635", fontSize: 11, fontWeight: "900", textAlign: "right" }}>{label}</Text>
      <Ionicons name="chevron-back" size={14} color="#A98D98" />
    </Pressable>
  );
}
