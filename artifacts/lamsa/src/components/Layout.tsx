import React from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Search, User, Home, LayoutGrid, Heart } from "lucide-react";
import { Logo } from "./Logo";
import { useSession } from "@/hooks/use-session";
import { useGetCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { toArabicNumerals } from "@/lib/format";
import { Button } from "./ui/button";
import { motion } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { sessionId, isReady } = useSession();

  const { data: cart } = useGetCart(
    { sessionId },
    { query: { enabled: isReady, queryKey: getGetCartQueryKey({ sessionId }) } }
  );

  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const navItems = [
    { href: "/", label: "الرئيسية", icon: Home },
    { href: "/search", label: "التصنيفات", icon: LayoutGrid },
    { href: "/cart", label: "السلة", icon: ShoppingBag, badge: cartItemCount },
    { href: "/favorites", label: "المفضلة", icon: Heart },
    { href: "/profile", label: "حسابي", icon: User },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[#F0D4E5] bg-white/90 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <Logo className="w-10 h-10 group-hover:scale-105 transition-transform duration-300" />
              <span className="font-serif text-2xl text-[#D81B60] font-bold">فوشيا</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {[
              { href: "/", label: "الرئيسية" },
              { href: "/stores", label: "الخدمات" },
              { href: "/search", label: "المناسبات" },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className={`text-sm font-medium transition-colors hover:text-[#D81B60] ${
                  location === item.href ? "text-[#D81B60]" : "text-[#6B6B6B]"
                }`}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <Link href="/search">
              <Button variant="ghost" size="icon" className="text-[#6B6B6B] hover:text-[#D81B60] rounded-full">
                <Search className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative text-[#D81B60] hover:bg-[#FFF0F6] rounded-full">
                <ShoppingBag className="w-5 h-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#D81B60] text-[10px] font-bold text-white">
                    {toArabicNumerals(cartItemCount)}
                  </span>
                )}
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="ghost" size="icon" className="text-[#6B6B6B] hover:text-[#D81B60] rounded-full">
                <User className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content — add bottom padding for mobile nav */}
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {/* Desktop Footer */}
      <footer className="hidden md:block border-t border-[#F0D4E5] bg-[#FFF0F6]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <Logo className="w-12 h-12" />
            <h3 className="font-serif text-xl text-[#D81B60] font-bold">فوشيا</h3>
            <p className="text-sm text-[#6B6B6B]">روعة المناسبات في مكان واحد — كوش، خطوبة، هدايا فاخرة</p>
            <p className="text-xs text-[#6B6B6B]/60 mt-2">
              © {toArabicNumerals(new Date().getFullYear())} فوشيا. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </footer>

      {/* Bottom Navigation — mobile only */}
      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white border-t border-[#F0D4E5] shadow-[0_-4px_20px_rgba(216,27,96,0.08)]">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href ||
              (item.href === "/search" && location.startsWith("/category"));
            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <motion.div
                  whileTap={{ scale: 0.92 }}
                  className={`flex flex-col items-center justify-center gap-0.5 py-1 relative ${
                    isActive ? "text-[#D81B60]" : "text-[#6B6B6B]"
                  }`}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 transition-all ${isActive ? "fill-[#D81B60]/15" : ""}`} />
                    {item.badge != null && item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#D81B60] text-[9px] font-bold text-white">
                        {item.badge > 9 ? "٩+" : toArabicNumerals(item.badge)}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium transition-all ${isActive ? "text-[#D81B60] font-bold" : "text-[#6B6B6B]"}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className="absolute -top-0 inset-x-1/4 h-0.5 rounded-full bg-[#D81B60]"
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
