import { useListFavorites, getListFavoritesQueryKey } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { useCartActions } from "@/hooks/use-cart-actions";
import { getStoredUser } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Favorites() {
  const user = getStoredUser();
  const userId = user?.id ?? 0;

  const { data: products, isLoading } = useListFavorites(
    { userId },
    { query: { enabled: !!userId, queryKey: getListFavoritesQueryKey({ userId }) } }
  );

  const { addToCart } = useCartActions();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-64 bg-[#F9F6F0] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="w-6 h-6 text-[#D81B60] fill-[#D81B60]" />
        <h1 className="text-2xl font-bold text-[#1A1A1A]">المفضلة</h1>
      </div>

      {!userId ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Heart className="w-16 h-16 text-[#E8E0D0]" />
          <p className="text-[#6B6B6B] text-lg">سجل دخولك لرؤية المفضلة</p>
          <Button asChild style={{ background: "linear-gradient(135deg, #D81B60, #F48FB1)" }}>
            <Link href="/auth" className="text-white">تسجيل الدخول</Link>
          </Button>
        </div>
      ) : !products || products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Heart className="w-16 h-16 text-[#E8E0D0]" />
          <p className="text-[#6B6B6B] text-lg font-medium">لا توجد منتجات في المفضلة</p>
          <p className="text-[#6B6B6B] text-sm">أضف المنتجات التي تعجبك إلى المفضلة</p>
          <Button asChild variant="outline" className="border-[#D81B60] text-[#D81B60]">
            <Link href="/">تصفح المنتجات</Link>
          </Button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <ProductCard
                product={product}
                onAddToCart={() => addToCart(product.id, 1)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
