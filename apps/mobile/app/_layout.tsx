import "../global.css";
import React from "react";
import { I18nManager } from "react-native";
import { Stack } from "expo-router";
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);
export default function RootLayout() { return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FBF7F3" } }} />; }
