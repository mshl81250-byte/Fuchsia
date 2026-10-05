import React from "react";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "../../lib/theme";
export default function TabsLayout() { return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarStyle: { height: 66, paddingBottom: 10, paddingTop: 8, backgroundColor: "#FFFDFC", borderTopColor: colors.line }, tabBarLabelStyle: { fontSize: 12, fontWeight: "700" } }}><Tabs.Screen name="index" options={{ title: "الرئيسية", tabBarIcon: () => <Text>⌂</Text> }} /><Tabs.Screen name="store" options={{ title: "المتجر", tabBarIcon: () => <Text>▣</Text> }} /><Tabs.Screen name="orders" options={{ title: "الطلبات", tabBarIcon: () => <Text>▤</Text> }} /><Tabs.Screen name="profile" options={{ title: "حسابي", tabBarIcon: () => <Text>◯</Text> }} /></Tabs>; }
