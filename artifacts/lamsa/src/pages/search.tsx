import { useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { useCartActions } from "@/hooks/use-cart-actions";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useDebounce } from "@/hooks/use-debounce";

export default function Search() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1]);
  const initialSearch = searchParams.get('q') || "";
  const isFeatured = searchParams.get('featured') === 'true';

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const debouncedSearch = useDebounce(searchTerm, 500);

  const { data: products, isLoading } = useListProducts(
    { 
      search: debouncedSearch || undefined,
      featured: isFeatured || undefined
    },
    { 
      query: { 
        queryKey: getListProductsQueryKey({ search: debouncedSearch || undefined, featured: isFeatured || undefined }),
        placeholderData: (prev: any) => prev
      } 
    }
  );

  const { addToCart } = useCartActions();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto mb-12">
        <div className="relative">
          <Input
            type="search"
            placeholder="ابحث عن العطور، الميكب، الورود..."
            className="w-full h-14 pl-12 pr-14 text-lg bg-card border-border focus-visible:ring-primary rounded-2xl shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
          {isFeatured && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
              <Filter className="w-3 h-3" /> مميز
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-serif font-bold text-foreground">
          {debouncedSearch 
            ? `نتائج البحث عن "${debouncedSearch}"` 
            : isFeatured 
              ? "المنتجات المميزة" 
              : "جميع المنتجات"}
        </h2>

        {isLoading && !products ? (
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
                transition={{ delay: Math.min(index * 0.05, 0.5) }}
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
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <SearchIcon className="w-10 h-10 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-xl font-bold mb-2">لا توجد نتائج مطابقة</h3>
            <p className="text-muted-foreground">جرب كلمات بحث مختلفة أو تصفح الأقسام</p>
          </div>
        )}
      </div>
    </div>
  );
}
