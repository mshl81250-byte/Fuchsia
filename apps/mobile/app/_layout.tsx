import "../global.css";
import React, { useEffect, useRef } from "react";
import { Alert, BackHandler, I18nManager, Platform } from "react-native";
import { Stack, router, usePathname, useSegments } from "expo-router";
import { getThemePreference } from "../lib/auth-storage";
import { applyTheme } from "../lib/theme";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function RootLayout() {
  const pathname = usePathname();
  const segments = useSegments();
  const isMainTabs = segments[0] === "(tabs)";
  const lastBackPress = useRef(0);

  useEffect(() => {
    getThemePreference().then(applyTheme).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const handler = () => {
      if (!isMainTabs && router.canGoBack()) {
        router.back();
        return true;
      }

      if (!isMainTabs && pathname !== "/") {
        router.replace("/(tabs)");
        return true;
      }

      const now = Date.now();
      if (now - lastBackPress.current < 2000) {
        Alert.alert("الخروج من التطبيق", "هل تريد الخروج من التطبيق؟", [
          { text: "إلغاء", style: "cancel", onPress: () => { lastBackPress.current = 0; } },
          { text: "خروج", style: "destructive", onPress: () => BackHandler.exitApp() },
        ]);
        lastBackPress.current = 0;
      } else {
        lastBackPress.current = now;
        Alert.alert("تأكيد الخروج", "اضغط زر الرجوع مرة أخرى للخروج من التطبيق.");
      }
      return true;
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", handler);
    return () => subscription.remove();
  }, [isMainTabs, pathname]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FBF7F3" },
        animation: "slide_from_right",
        gestureEnabled: true,
      }}
    />
  );
}
