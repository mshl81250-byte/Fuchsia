import { useGetProduct, getGetProductQueryKey, useListReviews, getListReviewsQueryKey, useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useCartActions } from "@/hooks/use-cart-actions";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency, toArabicNumerals } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Star, Gift, ShoppingBag, Store, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ProductCard } from "@/components/ProductCard";

export default function ProductDetail() {
  const params = useParams();
  const productId = Number(params.id);
  
  const { data: product, isLoading: loadingProduct } = useGetProduct(
    productId,
    { query: { enabled: !!productId, queryKey: getGetProductQueryKey(productId) } }
  );

  const { data: reviews, isLoading: loadingReviews } = useListReviews(
    { productId },
    { query: { enabled: !!productId, queryKey: getListReviewsQueryKey({ productId }) } }
  );

  const { data: relatedProducts } = useListProducts(
    { categoryId: product?.categoryId, limit: 5 },
    { query: { enabled: !!product?.categoryId, queryKey: getListProductsQueryKey({ categoryId: product?.categoryId, limit: 5 }) } }
  );

  const { addToCart, isAdding } = useCartActions();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [giftWrapping, setGiftWrapping] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");

  const handleAddToCart = () => {
    addToCart(productId, quantity, { giftWrapping, giftMessage });
  };

  if (loadingProduct) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        <Skeleton className="w-full md:w-1/2 aspect-square rounded-2xl" />
        <div className="w-full md:w-1/2 flex flex-col gap-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-32 w-full mt-4" />
          <Skeleton className="h-12 w-full mt-8" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold">المنتج غير موجود</h2>
        <Link href="/" className="text-primary mt-4 inline-block hover:underline">العودة للرئيسية</Link>
      </div>
    );
  }

  const images = product.images?.length ? [product.imageUrl, ...product.images] : [product.imageUrl];
  const displayImage = selectedImage || images[0];

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col gap-16">
      {/* Product Details */}
      <div className="flex flex-col md:flex-row gap-8 lg:gap-16">
        {/* Images Gallery */}
        <div className="w-full md:w-1/2 flex flex-col gap-4">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-card border border-border">
            <motion.img
              key={displayImage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              src={displayImage}
              alt={product.nameAr}
              className="w-full h-full object-cover"
            />
            {product.isNew && (
              <div className="absolute top-4 right-4 bg-primary text-primary-foreground font-bold px-3 py-1 rounded">
                جديد
              </div>
            )}
            {product.discountPrice && (
              <div className="absolute top-4 left-4 bg-accent text-accent-foreground font-bold px-3 py-1 rounded">
                تخفيض
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 snap-start border-2 transition-colors ${
                    displayImage === img ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`صورة ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="w-full md:w-1/2 flex flex-col">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-primary transition-colors">الرئيسية</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href={`/category/${product.categoryId}`} className="hover:text-primary transition-colors">{product.categoryName}</Link>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 leading-tight">
            {product.nameAr}
          </h1>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-1 text-primary bg-primary/10 px-2 py-1 rounded">
              <Star className="w-4 h-4 fill-primary" />
              <span className="font-medium">{toArabicNumerals(product.rating)}</span>
              <span className="text-muted-foreground text-sm ml-1">({toArabicNumerals(product.reviewCount)} تقييم)</span>
            </div>
            {product.storeName && (
              <Link href={`/store/${product.storeId}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                <Store className="w-4 h-4" />
                <span className="text-sm border-b border-dashed border-transparent hover:border-primary pb-0.5">{product.storeName}</span>
              </Link>
            )}
          </div>

          <div className="flex flex-col mb-8">
            {product.discountPrice ? (
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-primary">
                  {formatCurrency(product.discountPrice)}
                </span>
                <span className="text-xl text-muted-foreground line-through decoration-accent">
                  {formatCurrency(product.price)}
                </span>
              </div>
            ) : (
              <span className="text-3xl font-bold text-primary">
                {formatCurrency(product.price)}
              </span>
            )}
          </div>

          {product.description && (
            <div className="prose prose-invert max-w-none text-muted-foreground mb-8 text-sm md:text-base leading-relaxed">
              <p>{product.description}</p>
            </div>
          )}

          {/* Gift Options */}
          <div className="bg-card border border-border rounded-xl p-4 md:p-6 mb-8 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center text-primary">
                  <Gift className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="gift-wrapping" className="text-base font-bold cursor-pointer">تغليف كهدية؟</Label>
                  <span className="text-sm text-muted-foreground">أضف لمسة فاخرة لهديتك</span>
                </div>
              </div>
              <Switch 
                id="gift-wrapping" 
                checked={giftWrapping} 
                onCheckedChange={setGiftWrapping} 
                className="data-[state=checked]:bg-primary"
              />
            </div>
            
            <AnimatePresence>
              {giftWrapping && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 border-t border-border">
                    <Label htmlFor="gift-message" className="mb-2 block text-sm">رسالة الهدية (اختياري)</Label>
                    <Textarea 
                      id="gift-message" 
                      placeholder="اكتب رسالتك هنا وسيتم إرفاقها ببطاقة فاخرة..."
                      className="resize-none bg-background border-border focus-visible:ring-primary h-24"
                      value={giftMessage}
                      onChange={(e) => setGiftMessage(e.target.value)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-auto">
            <div className="flex items-center border border-border rounded-lg bg-card h-14 w-32 shrink-0">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-r-lg transition-colors"
              >-</button>
              <div className="flex-1 h-full flex items-center justify-center font-bold text-lg">
                {toArabicNumerals(quantity)}
              </div>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-l-lg transition-colors"
              >+</button>
            </div>
            
            <Button 
              className="flex-1 h-14 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              onClick={handleAddToCart}
              disabled={isAdding || !product.inStock}
            >
              {isAdding ? "جاري الإضافة..." : !product.inStock ? "نفذت الكمية" : (
                <span className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  أضف للسلة
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="border-t border-border pt-12">
        <h2 className="text-2xl font-bold font-serif text-foreground mb-8">تقييمات العملاء</h2>
        {loadingReviews ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : reviews && reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map(review => (
              <div key={review.id} className="bg-card border border-border rounded-xl p-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{review.customerName || "عميل مميز"}</span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < review.rating ? "fill-primary text-primary" : "fill-muted text-muted"}`} />
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-muted-foreground text-sm leading-relaxed">{review.comment}</p>
                )}
                <span className="text-xs text-muted-foreground/60 mt-auto pt-2">{new Date(review.createdAt).toLocaleDateString('ar-YE')}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">لا توجد تقييمات لهذا المنتج بعد.</p>
        )}
      </div>

      {/* Related Products */}
      {relatedProducts && relatedProducts.length > 1 && (
        <div className="border-t border-border pt-12">
          <h2 className="text-2xl font-bold font-serif text-foreground mb-8">منتجات قد تعجبك</h2>
          <div className="flex gap-4 overflow-x-auto pb-6 snap-x">
            {relatedProducts.filter(p => p.id !== productId).map((prod) => (
              <div key={prod.id} className="w-48 md:w-56 shrink-0 snap-start">
                <ProductCard 
                  product={prod} 
                  onAddToCart={(e) => {
                    e.preventDefault();
                    addToCart(prod.id);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
