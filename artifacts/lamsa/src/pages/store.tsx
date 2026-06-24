import { useGetStore, getGetStoreQueryKey, useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { useCartActions } from "@/hooks/use-cart-actions";
import { formatCurrency, toArabicNumerals } from "@/lib/format";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, Star, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";

export default function StoreDetail() {
  const params = useParams();
  const storeId = Number(params.id);

  const { data: store, isLoading: loadingStore } = useGetStore(
    storeId,
    { query: { enabled: !!storeId, queryKey: getGetStoreQueryKey(storeId) } }
  );

  const { data: products, isLoading: loadingProducts } = useListProducts(
    { storeId },
    { query: { enabled: !!storeId, queryKey: getListProductsQueryKey({ storeId }) } }
  );

  const { addToCart } = useCartActions();

  if (loadingStore) {
    return (
      <div className="flex flex-col gap-8">
        <Skeleton className="w-full h-[300px]" />
        <div className="container mx-auto px-4 -mt-20">
          <Skeleton className="w-32 h-32 rounded-full border-4 border-background mb-4" />
          <Skeleton className="h-10 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold">المتجر غير موجود</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12 pb-20">
      {/* Store Header */}
      <div className="relative">
        <div className="w-full h-[250px] md:h-[400px] bg-muted relative overflow-hidden">
          {store.coverUrl ? (
            <img src={store.coverUrl} alt={store.nameAr} className="w-full h-full object-cover opacity-80" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-card to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        </div>
        
        <div className="container mx-auto px-4 relative -mt-24 md:-mt-32">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-end text-center md:text-right">
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-background overflow-hidden bg-card shrink-0 shadow-xl">
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={store.nameAr} className="w-full h-full object-cover" />
              ) : (
                <Logo className="w-full h-full p-4" />
              )}
            </div>
            
            <div className="flex flex-col gap-2 pb-2 md:pb-4 flex-1">
              <div className="flex flex-col md:flex-row items-center md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl md:text-5xl font-bold font-serif text-primary mb-2">
                    {store.nameAr}
                  </h1>
                  {store.isOpen ? (
                    <span className="text-sm font-medium text-green-500 bg-green-500/10 px-3 py-1 rounded-full">مفتوح الآن</span>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">مغلق</span>
                  )}
                </div>
                
                <div className="flex items-center gap-6 bg-card border border-border px-6 py-3 rounded-2xl shadow-sm">
                  <div className="flex flex-col items-center">
                    <span className="text-primary flex items-center gap-1 font-bold text-lg">
                      <Star className="w-5 h-5 fill-primary" /> {toArabicNumerals(store.rating)}
                    </span>
                    <span className="text-xs text-muted-foreground">{toArabicNumerals(store.reviewCount)} تقييم</span>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <div className="flex flex-col items-center">
                    <span className="font-bold text-lg text-foreground">{toArabicNumerals(products?.length || 0)}</span>
                    <span className="text-xs text-muted-foreground">منتج</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        {/* Store Info */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-12 shadow-sm">
          <p className="text-muted-foreground text-lg mb-6 max-w-3xl leading-relaxed">{store.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {store.location && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">العنوان</span>
                  <span className="font-medium">{store.location}</span>
                </div>
              </div>
            )}
            {store.workingHours && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">ساعات العمل</span>
                  <span className="font-medium" dir="ltr">{store.workingHours}</span>
                </div>
              </div>
            )}
            {store.phone && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">رقم الهاتف</span>
                  <span className="font-medium" dir="ltr">{store.phone}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Products */}
        <div className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold font-serif text-foreground">منتجات المتجر</h2>
          
          {loadingProducts ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : products && products.length > 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
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
            <div className="text-center py-20 text-muted-foreground">
              لا توجد منتجات متوفرة حالياً في هذا المتجر.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
