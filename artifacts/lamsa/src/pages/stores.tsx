import { useListStores } from "@workspace/api-client-react";
import { StoreCard } from "@/components/StoreCard";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Store as StoreIcon } from "lucide-react";

export default function Stores() {
  const { data: stores, isLoading } = useListStores();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-primary mb-4 flex items-center gap-4">
          <StoreIcon className="w-10 h-10 md:w-12 md:h-12" /> المتاجر الفاخرة
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          ننتقي لك أرقى المتاجر في صنعاء لتصلك فخامتها أينما كنت
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : stores && stores.length > 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {stores.map((store, index) => (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <StoreCard store={store} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          لا توجد متاجر متاحة حالياً.
        </div>
      )}
    </div>
  );
}
