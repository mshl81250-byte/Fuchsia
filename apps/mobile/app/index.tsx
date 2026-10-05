import React from "react";
import { ImageBackground, Pressable, SafeAreaView, Text, View } from "react-native";
import { router } from "expo-router";
import { colors } from "../lib/theme";

export default function Welcome() {
  return <ImageBackground source={{ uri: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200" }} style={{ flex: 1 }} resizeMode="cover">
    <View style={{ flex: 1, backgroundColor: "rgba(29,8,18,.7)" }}><SafeAreaView style={{ flex: 1, padding: 24, justifyContent: "space-between" }}>
      <View style={{ alignItems: "center", marginTop: 90 }}><Text style={{ color: "#F4B6C8", fontSize: 54, fontWeight: "900" }}>فوشيا</Text><Text style={{ color: "#F7D4DC", fontSize: 27, fontWeight: "700", textAlign: "center", marginTop: 22 }}>هدايا تليق بلحظتك</Text><Text style={{ color: "#EAB2C1", fontSize: 18, textAlign: "center", marginTop: 14 }}>نجهز فرحتك بكل حب</Text></View>
      <View style={{ gap: 18, marginBottom: 22 }}><Pressable onPress={() => router.replace("/auth")} style={{ height: 64, borderRadius: 34, backgroundColor: "#C51D68", alignItems: "center", justifyContent: "center" }}><Text style={{ color: "white", fontSize: 23, fontWeight: "800" }}>ابدأ الآن</Text></Pressable><Pressable onPress={() => router.replace("/(tabs)")}><Text style={{ color: "#F5C0CF", textAlign: "center", fontSize: 16 }}>تخطي</Text></Pressable></View>
    </SafeAreaView></View>
  </ImageBackground>;
}
