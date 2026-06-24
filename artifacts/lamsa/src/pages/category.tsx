import { useListProducts, getListProductsQueryKey, useListCategories } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { ProductCard } from "@/components/ProductCard";
import { useCartActions } from "@/hooks/use-cart-actions";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/Logo";

export default function Category() {
  const params = useParams();
  const categoryId = Number(params.id);
  
  const { data: products, isLoading: loadingProducts } = useListProducts(
    { categoryId },
    { query: { enabled: !!categoryId, queryKey: getListProductsQueryKey({ categoryId }) } }
  );
  
  const { data: categories } = useListCategories();
  const { addToCart } = useCartActions();
  
  const category = categories?.find(c => c.id === categoryId);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-primary mb-4">
          {category?.nameAr || "جاري التحميل..."}
        </h1>
        <div className="w-24 h-1 bg-primary/20 rounded-full overflow-hidden">
          <div className="w-12 h-full bg-primary mx-auto rounded-full" />
        </div>
      </div>

      {loadingProducts ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-[300px] rounded-xl" />
          ))}
        </div>
      ) : products && products.length > 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
        >
          {products.map((product, index) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ProductCard 
                product={product} 
                onAddToCart={(e) => {
                  e.preventDefault();
                  addToCart(product.id);
                }}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <Logo className="w-20 h-20 opacity-50 grayscale" />
          <h3 className="text-xl font-medium text-foreground">لا توجد منتجات</h3>
          <p className="text-muted-foreground">لم يتم العثور على منتجات في هذا التصنيف حالياً.</p>
        </div>
      )}
    </div>
  );
}
