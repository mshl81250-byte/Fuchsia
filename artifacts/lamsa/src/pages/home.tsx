import { useListBanners, useListCategories, useGetFeaturedProducts, useGetTopSanaaProducts, useGetNewArrivals, useListStores } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ProductCard } from "@/components/ProductCard";
import { StoreCard } from "@/components/StoreCard";
import { useCartActions } from "@/hooks/use-cart-actions";
import useEmblaCarousel from "embla-carousel-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: banners, isLoading: loadingBanners } = useListBanners();
  const { data: categories, isLoading: loadingCategories } = useListCategories();
  const { data: featuredProducts, isLoading: loadingFeatured } = useGetFeaturedProducts();
  const { data: topSanaa, isLoading: loadingTop } = useGetTopSanaaProducts();
  const { data: newArrivals, isLoading: loadingNew } = useGetNewArrivals();
  const { data: stores, isLoading: loadingStores } = useListStores();
  
  const { addToCart } = useCartActions();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, direction: "rtl" });

  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 4000);
    return () => clearInterval(interval);
  }, [emblaApi]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex flex-col gap-12 pb-20">
      {/* Hero Banners */}
      <section className="relative bg-black w-full overflow-hidden" dir="rtl">
        {loadingBanners ? (
          <Skeleton className="w-full h-[300px] md:h-[500px]" />
        ) : banners && banners.length > 0 ? (
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex touch-pan-y">
              {banners.map((banner) => (
                <div key={banner.id} className="relative flex-[0_0_100%] min-w-0">
                  <div className="relative h-[300px] md:h-[500px] w-full">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                      <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl md:text-5xl lg:text-6xl font-serif text-primary font-bold mb-4"
                      >
                        {banner.title}
                      </motion.h2>
                      {banner.subtitle && (
                        <motion.p 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="text-lg md:text-2xl text-foreground max-w-2xl"
                        >
                          {banner.subtitle}
                        </motion.p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="relative h-[300px] md:h-[500px] w-full bg-card flex items-center justify-center">
             <div className="text-center">
                <h2 className="text-3xl font-serif text-primary font-bold">فوشيا</h2>
                <p className="text-muted-foreground mt-2">روعة المناسبات في مكان واحد</p>
             </div>
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4">
        <h3 className="text-xl font-bold mb-6 text-foreground">التصنيفات</h3>
        {loadingCategories ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="w-20 h-20 rounded-full shrink-0" />
            ))}
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x"
          >
            {categories?.map((category) => (
              <Link key={category.id} href={`/category/${category.id}`}>
                <motion.div variants={itemVariants} className="flex flex-col items-center gap-3 shrink-0 snap-start group cursor-pointer">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-border group-hover:border-primary p-1 transition-colors relative overflow-hidden bg-card">
                    {category.imageUrl ? (
                      <img src={category.imageUrl} alt={category.nameAr} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                        <span className="text-2xl">{category.icon}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {category.nameAr}
                  </span>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        )}
      </section>

      {/* Top Sanaa */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-foreground">الأكثر طلباً في صنعاء</h3>
          <Link href="/search?featured=true" className="text-sm text-primary flex items-center gap-1 hover:underline">
            عرض الكل <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>
        
        {loadingTop ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-6 snap-x">
            {topSanaa?.map((product) => (
              <div key={product.id} className="w-48 md:w-56 shrink-0 snap-start">
                <ProductCard 
                  product={product} 
                  onAddToCart={(e) => {
                    e.preventDefault();
                    addToCart(product.id);
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Featured Stores */}
      <section className="bg-card py-12 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-serif font-bold text-primary">أرقى المتاجر</h3>
            <Link href="/stores" className="text-sm text-primary flex items-center gap-1 hover:underline">
              كل المتاجر <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
          
          {loadingStores ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores?.filter(s => s.isFeatured).slice(0, 3).map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* New Arrivals */}
      <section className="container mx-auto px-4">
        <h3 className="text-xl font-bold mb-6 text-foreground">وصل حديثاً</h3>
        {loadingNew ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6"
          >
            {newArrivals?.map((product) => (
              <motion.div key={product.id} variants={itemVariants}>
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
        )}
      </section>
    </div>
  );
}
