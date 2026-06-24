import { Store } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Star, MapPin } from "lucide-react";
import { toArabicNumerals } from "@/lib/format";

interface StoreCardProps {
  store: Store;
}

export function StoreCard({ store }: StoreCardProps) {
  return (
    <Link href={`/store/${store.id}`}>
      <motion.div
        whileHover={{ y: -5 }}
        className="group flex flex-col h-full bg-card rounded-xl border border-border hover:border-primary transition-colors overflow-hidden"
      >
        <div className="relative h-32 overflow-hidden bg-muted">
          {store.coverUrl ? (
            <img
              src={store.coverUrl}
              alt={store.nameAr}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-card to-muted" />
          )}
          <div className="absolute -bottom-6 right-4 w-16 h-16 rounded-full border-4 border-card overflow-hidden bg-background">
            <img
              src={store.logoUrl}
              alt={store.nameAr}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <div className="flex flex-col flex-1 p-4 pt-8 gap-2">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-lg text-foreground">{store.nameAr}</h3>
            {store.isOpen ? (
              <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">مفتوح</span>
            ) : (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">مغلق</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{store.description}</p>
          <div className="mt-auto pt-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-primary">
              <Star className="w-4 h-4 fill-primary" />
              <span>{toArabicNumerals(store.rating)}</span>
            </div>
            {store.location && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="truncate max-w-[120px]">{store.location}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
