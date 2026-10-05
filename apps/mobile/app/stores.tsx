import React, { useEffect, useState } from "react";
import { FlatList, Pressable, SafeAreaView, Text, View } from "react-native";
import { router } from "expo-router";
import { apiRequest } from "../lib/api";
import { colors, styles } from "../lib/theme";
export default function Stores() { const [items, setItems] = useState<any[]>([]); useEffect(() => { apiRequest<any[]>("/api/stores").then(setItems).catch(() => setItems([])); }, []); return <SafeAreaView style={styles.screen}><FlatList data={items} contentContainerStyle={styles.content} keyExtractor={s => String(s.id)} ListHeaderComponent={<Text style={styles.title}>المتاجر</Text>} renderItem={({ item }) => <Pressable onPress={() => router.push(`/store/${item.id}`)} style={[styles.card, { marginTop: 12 }]}><Text style={{ color: colors.ink, fontWeight: "900", textAlign: "right", fontSize: 18 }}>{item.nameAr}</Text><Text style={styles.subtitle}>{item.descriptionAr || "هدايا ومنتجات مختارة من فوشيا"}</Text></Pressable>} /></SafeAreaView>; }
