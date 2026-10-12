import React, { useCallback, useState } from "react";
import { Alert, FlatList, SafeAreaView, Text } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { apiRequest } from "../lib/api";
import { getUser } from "../lib/auth-storage";
import { ProductCard, EmptyState } from "../components/ui";
import { colors, styles } from "../lib/theme";
export default function Favorites() { const [items, setItems] = useState<any[]>([]); useFocusEffect(useCallback(() => { getUser().then(u => { if (u) apiRequest<any[]>(`/api/favorites?userId=${u.id}`).then(setItems).catch(() => setItems([])); }); }, [])); async function toggle(productId: number) { const u = await getUser(); if (!u) return; try { await apiRequest("/api/favorites", { method: "POST", json: { userId: u.id, productId } }); setItems(current => current.filter(p => p.id !== productId)); } catch (e) { Alert.alert("تعذر تحديث المفضلة", e instanceof Error ? e.message : ""); } } return <SafeAreaView style={styles.screen}><FlatList data={items} numColumns={2} contentContainerStyle={styles.content} keyExtractor={p => String(p.id)} ListHeaderComponent={<Text style={styles.title}>المفضلة</Text>} ListEmptyComponent={<EmptyState text="لم تضيفي أي هدية إلى المفضلة بعد." />} renderItem={({ item }) => <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} onAdd={() => toggle(item.id)} />} /></SafeAreaView>; }
