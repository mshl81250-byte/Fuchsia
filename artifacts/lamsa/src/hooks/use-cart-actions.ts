import { useGetCart, useAddToCart, getGetCartQueryKey, useRemoveCartItem, useUpdateCartItem } from "@workspace/api-client-react";
import { useSession } from "./use-session";
import { useToast } from "./use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function useCartActions() {
  const { sessionId, isReady } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addToCartMutation = useAddToCart();
  const updateCartMutation = useUpdateCartItem();
  const removeCartMutation = useRemoveCartItem();

  const addToCart = async (productId: number, quantity: number = 1, options?: { giftWrapping?: boolean, giftMessage?: string }) => {
    if (!isReady) return;
    
    try {
      await addToCartMutation.mutateAsync({
        data: {
          sessionId,
          productId,
          quantity,
          ...options
        }
      });
      
      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey({ sessionId }) });
      toast({
        title: "تمت الإضافة",
        description: "تمت إضافة المنتج إلى السلة بنجاح",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة المنتج إلى السلة",
      });
    }
  };

  const updateQuantity = async (itemId: number, quantity: number) => {
    try {
      await updateCartMutation.mutateAsync({
        itemId,
        data: { quantity }
      });
      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey({ sessionId }) });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث الكمية",
      });
    }
  };

  const removeItem = async (itemId: number) => {
    try {
      await removeCartMutation.mutateAsync({ itemId });
      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey({ sessionId }) });
      toast({
        title: "تم الحذف",
        description: "تم حذف المنتج من السلة",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء حذف المنتج",
      });
    }
  };

  return {
    addToCart,
    updateQuantity,
    removeItem,
    isAdding: addToCartMutation.isPending,
    isUpdating: updateCartMutation.isPending,
    isRemoving: removeCartMutation.isPending,
  };
}
