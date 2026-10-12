import React from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenHeader } from "../components/ui";
import { colors, styles } from "../lib/theme";
export default function Store() { return <SafeAreaView style={styles.screen}><View style={styles.content}><ScreenHeader title="فوشيا بوتيك" onBack={() => router.back()} /><View style={[styles.card, { marginTop: 4, borderColor: colors.primary }]}><Text style={[styles.title, { fontSize: 22 }]}>متجر فوشيا بوتيك</Text><Text style={[styles.subtitle, { marginTop: 10 }]}>متجرنا الوحيد للهدايا والورد والتغليف الفاخر في صنعاء.</Text></View><Pressable onPress={() => router.replace("/(tabs)/store")} style={[styles.button, { marginTop: 18 }]}><Text style={styles.buttonText}>تصفح منتجات فوشيا بوتيك</Text></Pressable></View></SafeAreaView>; }
