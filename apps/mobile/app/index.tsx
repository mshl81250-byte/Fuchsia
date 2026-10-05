import React, { useState } from "react";
import { Image, ImageBackground, Pressable, SafeAreaView, Text, View } from "react-native";
import { router } from "expo-router";

const logo = require("../assets/branding/fuchsia-logo-source.png");
const background = { uri: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200" };

export default function Welcome() {
  const [slide, setSlide] = useState<1 | 2>(1);
  const isFirst = slide === 1;
  return <ImageBackground source={background} style={{ flex: 1 }} resizeMode="cover">
    <View style={{ flex: 1, backgroundColor: isFirst ? "rgba(29,8,18,.74)" : "rgba(29,8,18,.84)" }}>
      <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: "space-between" }}>
        <View style={{ alignItems: "flex-end", marginTop: 14 }}>
          <View style={{ backgroundColor: "rgba(255,247,241,.93)", borderRadius: 18, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Image source={logo} resizeMode="contain" style={{ width: 112, height: 86 }} />
          </View>
        </View>
        <View style={{ alignItems: "center", marginTop: isFirst ? 10 : 0 }}>
          <Text style={{ color: "#F4B6C8", fontSize: isFirst ? 32 : 27, fontWeight: "900", textAlign: "center" }}>{isFirst ? "هدايا تليق بلحظتك" : "اختاري هديتك واجعلي اللحظة أجمل"}</Text>
          <Text style={{ color: "#EAB2C1", fontSize: 17, textAlign: "center", marginTop: 14 }}>{isFirst ? "نجهز فرحتك بكل حب" : "ورد، هدايا، وتغليف فاخر لكل مناسبة"}</Text>
          {!isFirst && <View style={{ width: 220, height: 190, borderRadius: 28, marginTop: 34, backgroundColor: "rgba(104,18,55,.78)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#D77791" }}><Text style={{ fontSize: 76, color: "#F3B3C3" }}>✦</Text><Text style={{ color: "#F8DDE3", fontSize: 15, fontWeight: "800" }}>هديتك تبدأ من هنا</Text></View>}
        </View>
        <View style={{ gap: 17, marginBottom: 22 }}>
          {!isFirst && <View style={{ flexDirection: "row", justifyContent: "center", gap: 7 }}><View style={{ width: 7, height: 7, borderRadius: 5, backgroundColor: "#815060" }} /><View style={{ width: 24, height: 7, borderRadius: 5, backgroundColor: "#E7377A" }} /><View style={{ width: 7, height: 7, borderRadius: 5, backgroundColor: "#815060" }} /></View>}
          <Pressable onPress={() => isFirst ? setSlide(2) : router.replace("/auth")} style={{ height: 62, borderRadius: 34, backgroundColor: "#C51D68", alignItems: "center", justifyContent: "center" }}><Text style={{ color: "white", fontSize: 21, fontWeight: "800" }}>{isFirst ? "ابدأ الآن" : "دخول إلى فوشيا"}</Text></Pressable>
          <Pressable onPress={() => router.replace(isFirst ? "/(tabs)" : "/auth")}><Text style={{ color: "#F5C0CF", textAlign: "center", fontSize: 15 }}>{isFirst ? "تخطي" : "التصفح كزائر"}</Text></Pressable>
        </View>
      </SafeAreaView>
    </View>
  </ImageBackground>;
}
