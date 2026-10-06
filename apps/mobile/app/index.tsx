import React, { useState } from "react";
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

export default function Welcome() {
  const [slide, setSlide] = useState<0 | 1>(0);
  const { height } = useWindowDimensions();
  const heroHeight = Math.min(Math.max(height * 0.39, 248), 365);
  const isFirst = slide === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FBF7F3" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FBF7F3" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22, paddingTop: 4, paddingBottom: 18 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ minHeight: 72, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
          <Image source={logo} resizeMode="contain" style={{ width: 104, height: 78 }} />
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 7, backgroundColor: "#FFF0F5", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18 }}>
            <Ionicons name="location" size={15} color="#A51B54" />
            <Text style={{ color: "#79133F", fontSize: 12, fontWeight: "800" }}>صنعاء، بكل حب</Text>
          </View>
        </View>

        <ImageBackground
          source={welcomeHero}
          resizeMode="cover"
          style={{ height: heroHeight, marginTop: 8, borderRadius: 30, overflow: "hidden", justifyContent: "space-between", padding: 16 }}
          imageStyle={{ borderRadius: 30 }}
          accessibilityLabel="هدية فاخرة مع باقة ورود وردية"
        >
          <View style={{ alignSelf: "flex-start", flexDirection: "row-reverse", alignItems: "center", gap: 7, backgroundColor: "rgba(255,255,255,0.91)", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 16 }}>
            <Ionicons name="sparkles" size={15} color="#A51B54" />
            <Text style={{ color: "#54182F", fontSize: 12, fontWeight: "900" }}>تفاصيل تصنع فرقًا</Text>
          </View>
          <View style={{ alignSelf: "flex-end", backgroundColor: "rgba(52,19,33,0.82)", borderRadius: 17, paddingHorizontal: 13, paddingVertical: 10, flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
            <Ionicons name="heart" size={16} color="#FFD6E3" />
            <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "800" }}>هدية تُقدَّم من القلب</Text>
          </View>
        </ImageBackground>

        <View style={{ alignItems: "flex-end", marginTop: 20 }}>
          <Text style={{ color: "#A51B54", fontSize: 11, fontWeight: "900", letterSpacing: 2 }}>FUCHSIA  •  BOUTIQUE</Text>
          <Text style={{ color: "#341321", fontSize: 29, lineHeight: 39, fontWeight: "900", textAlign: "right", marginTop: 6 }}>
            {isFirst ? "كل مناسبة تستحق هدية تُحكى" : "من هدية صغيرة تبدأ ذكرى كبيرة"}
          </Text>
          <Text style={{ color: "#806D74", fontSize: 15, lineHeight: 24, textAlign: "right", marginTop: 7 }}>
            {isFirst
              ? "هدايا فاخرة، ورود تنبض بالمحبة، وتنسيقات تجعل لحظاتكم أجمل."
              : "اختاري التفاصيل التي تحبينها، واتركي علينا لمسة فوشيا الأخيرة."}
          </Text>
        </View>

        <View style={{ flexDirection: "row-reverse", gap: 8, marginTop: 15, flexWrap: "wrap" }}>
          <ServicePill icon="gift-outline" label="هدايا" />
          <ServicePill icon="flower-outline" label="ورود" />
          <ServicePill icon="sparkles-outline" label="مناسبات" />
        </View>

        <View style={{ marginTop: 22, gap: 13 }}>
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }}>
            {[0, 1].map((item) => (
              <View key={item} style={{ width: slide === item ? 23 : 6, height: 6, borderRadius: 6, backgroundColor: slide === item ? "#A51B54" : "#E7CBD5" }} />
            ))}
            <Text style={{ color: "#A7969D", fontSize: 11, marginStart: 5 }}>{isFirst ? "١ / ٢" : "٢ / ٢"}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => (isFirst ? setSlide(1) : router.replace("/auth"))}
            style={({ pressed }) => ({ minHeight: 58, borderRadius: 20, backgroundColor: "#A51B54", flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 10, opacity: pressed ? 0.88 : 1, shadowColor: "#7A123E", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 5 })}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "900" }}>{isFirst ? "اكتشفي عالم فوشيا" : "ابدئي رحلتك الآن"}</Text>
            <Ionicons name="arrow-back" size={19} color="#FFFFFF" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => (isFirst ? setSlide(1) : router.replace("/(tabs)"))}
            style={({ pressed }) => ({ minHeight: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.65 : 1 })}
          >
            <Text style={{ color: "#79133F", fontSize: 14, fontWeight: "800" }}>{isFirst ? "تابعي لتتعرفي علينا" : "التصفح كزائرة"}</Text>
          </Pressable>
        </View>

        <Text style={{ color: "#AA9CA1", fontSize: 11, textAlign: "center", marginTop: 4 }}>لحظات أجمل، بلمسة فوشيا</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ServicePill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 15, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#F0E4E7" }}>
      <Ionicons name={icon} size={15} color="#A51B54" />
      <Text style={{ color: "#5D4650", fontSize: 12, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}
