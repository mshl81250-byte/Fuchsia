import React, { useEffect, useState } from "react";
import { FlatList, SafeAreaView, Text } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { apiRequest } from "../../lib/api";
import { ProductCard } from "../../components/ui";
import { styles } from "../../lib/theme";
export default function StoreDetails() { const { id } = useLocalSearchParams<{ id: string }>(); const [store, setStore] = useState<any>(); const [items, setItems] = useState<any[]>([]); useEffect(() => { apiRequest<any>(`/api/stores/${id}`).then(setStore).catch(() => undefined); apiRequest<any[]>(`/api/products?storeId=${id}`).then(setItems).catch(() => setItems([])); }, [id]); return <SafeAreaView style={styles.screen}><FlatList data={items} numColumns={2} contentContainerStyle={styles.content} keyExtractor={p => String(p.id)} ListHeaderComponent={<Text style={styles.title}>{store?.nameAr || "المتجر"}</Text>} renderItem={({ item }) => <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />} /></SafeAreaView>; }
