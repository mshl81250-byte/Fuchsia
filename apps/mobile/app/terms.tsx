import React from "react";
import { SafeAreaView, ScrollView, Text } from "react-native";
import { router } from "expo-router";
import { ScreenHeader } from "../components/ui";
import { styles } from "../lib/theme";
export default function Terms() { return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}><ScreenHeader title="شروط الاستخدام" onBack={() => router.back()} /><Text style={[styles.subtitle, { marginTop: 18 }]}>باستخدام Fuchsia Boutique، توافقين على تقديم بيانات صحيحة لاستخدامها في تجهيز الطلب والتواصل والتوصيل.</Text><Text style={[styles.sectionTitle, { marginTop: 22 }]}>الطلبات والدفع</Text><Text style={[styles.subtitle, { marginTop: 8 }]}>يتم اعتماد الطلب بعد مراجعته. الدفع الجزئي أو الكامل يتطلب اختيار المحفظة وإرفاق إيصال ورقم العملية، وقد نتواصل للتحقق من البيانات.</Text><Text style={[styles.sectionTitle, { marginTop: 22 }]}>التوصيل</Text><Text style={[styles.subtitle, { marginTop: 8 }]}>يجب تحديد عنوان واضح وموقع GPS صحيح داخل نطاق صنعاء. تظهر حالة الطلب في قائمة الطلبات حتى إتمام التوصيل.</Text></ScrollView></SafeAreaView>; }
