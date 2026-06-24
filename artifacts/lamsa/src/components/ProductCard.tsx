import { Product } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatCurrency, toArabicNumerals } from "@/lib/format";
import { motion } from "framer-motion";
import { Star, ShoppingBag } from "lucide-react";
import { Button } from "./ui/button";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (e: React.MouseEvent) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <Link href={`/product/${product.id}`}>
      <motion.div
        whileHover={{ y: -5 }}
        className="group relative flex flex-col h-full bg-card rounded-xl border border-border hover:border-primary transition-colors overflow-hidden"
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={product.imageUrl}
            alt={product.nameAr}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          {product.isNew && (
            <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">
              جديد
            </div>
          )}
          {product.discountPrice && (
            <div className="absolute top-2 left-2 bg-accent text-accent-foreground text-xs font-bold px-2 py-1 rounded">
              تخفيض
            </div>
          )}
        </div>
        <div className="flex flex-col flex-1 p-4 gap-2">
          <div className="flex justify-between items-start">
            <h3 className="font-medium text-foreground line-clamp-2 leading-tight">
              {product.nameAr}
            </h3>
          </div>
          <div className="flex items-center gap-1 text-sm text-primary">
            <Star className="w-3.5 h-3.5 fill-primary" />
            <span>{toArabicNumerals(product.rating)}</span>
            <span className="text-muted-foreground ml-1">
              ({toArabicNumerals(product.reviewCount)})
            </span>
          </div>
          <div className="mt-auto pt-2 flex items-center justify-between">
            <div className="flex flex-col">
              {product.discountPrice ? (
                <>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(product.discountPrice)}
                  </span>
                  <span className="text-sm text-muted-foreground line-through decoration-accent">
                    {formatCurrency(product.price)}
                  </span>
                </>
              ) : (
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(product.price)}
                </span>
              )}
            </div>
            {onAddToCart && (
              <Button
                variant="outline"
                size="icon"
                className="rounded-full shrink-0 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={onAddToCart}
              >
                <ShoppingBag className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
