import React from "react";
import { SafeAreaView, ScrollView, Text } from "react-native";
import { router } from "expo-router";
import { ScreenHeader } from "../components/ui";
import { styles } from "../lib/theme";
export default function Privacy() { return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}><ScreenHeader title="سياسة الخصوصية" onBack={() => router.back()} /><Text style={[styles.subtitle, { marginTop: 18 }]}>نحترم خصوصيتك في Fuchsia Boutique. نستخدم بيانات الاسم والهاتف والعنوان فقط لإنشاء الحساب وتنفيذ الطلب والتواصل بشأن التوصيل والدفع.</Text><Text style={[styles.sectionTitle, { marginTop: 22 }]}>البيانات التي نحتاجها</Text><Text style={[styles.subtitle, { marginTop: 8 }]}>بيانات الحساب، عنوان التوصيل، موقع GPS عند طلب التوصيل، وإيصال الدفع عند اختيار الدفع الجزئي أو الكامل.</Text><Text style={[styles.sectionTitle, { marginTop: 22 }]}>حماية البيانات</Text><Text style={[styles.subtitle, { marginTop: 8 }]}>يتم حفظ الجلسة محليًا عبر التخزين الآمن، ولا نبيع بياناتك أو نشاركها إلا مع ما يلزم لتنفيذ طلبك وخدمتك.</Text></ScrollView></SafeAreaView>; }
