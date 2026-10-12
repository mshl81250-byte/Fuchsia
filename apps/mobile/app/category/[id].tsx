import React, { useEffect, useState } from "react";
import { FlatList, SafeAreaView, Text } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { apiRequest } from "../../lib/api";
import { ProductCard } from "../../components/ui";
import { colors, styles } from "../../lib/theme";
export default function Category() { const { id } = useLocalSearchParams<{ id: string }>(); const [items, setItems] = useState<any[]>([]); useEffect(() => { apiRequest<any[]>(`/api/products?categoryId=${id}`).then(setItems).catch(() => setItems([])); }, [id]); return <SafeAreaView style={styles.screen}><FlatList data={items} numColumns={2} contentContainerStyle={styles.content} keyExtractor={p => String(p.id)} ListHeaderComponent={<Text style={styles.title}>منتجات التصنيف</Text>} renderItem={({ item }) => <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />} /></SafeAreaView>; }
