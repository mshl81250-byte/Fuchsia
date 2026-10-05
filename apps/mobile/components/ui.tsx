import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { colors, styles } from "../lib/theme";

export function BrandHeader({ title = "فوشيا", subtitle }: { title?: string; subtitle?: string }) {
  return <View style={{ marginBottom: 18, alignItems: "flex-end" }}><Text style={{ color: colors.primary, fontSize: 30, fontWeight: "900" }}>{title}</Text>{subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}</View>;
}
export function ProductCard({ product, onPress, onAdd }: { product: any; onPress?: () => void; onAdd?: () => void }) {
  const image = product.imageUrl || product.images?.[0];
  return <Pressable onPress={onPress} style={[styles.card, { flex: 1, margin: 5, padding: 10 }]}>
    {image ? <Image source={{ uri: image }} style={{ height: 140, borderRadius: 15, backgroundColor: colors.soft }} resizeMode="cover" /> : <View style={{ height: 140, borderRadius: 15, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 40 }}>🎁</Text></View>}
    <Text numberOfLines={2} style={{ color: colors.ink, fontWeight: "800", textAlign: "right", marginTop: 10, minHeight: 38 }}>{product.nameAr}</Text>
    <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}><Text style={{ color: colors.primary, fontWeight: "900" }}>{product.discountPrice ?? product.price} ر.س</Text>{onAdd && <Pressable onPress={onAdd} style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 8 }}><Text style={{ color: colors.white, fontWeight: "800" }}>+</Text></Pressable>}</View>
  </Pressable>;
}
export function EmptyState({ text }: { text: string }) { return <View style={{ padding: 35, alignItems: "center" }}><Text style={{ fontSize: 35 }}>🌸</Text><Text style={{ color: colors.muted, textAlign: "center", marginTop: 10 }}>{text}</Text></View>; }
