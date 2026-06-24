import React from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Search, User, Home, Package, Menu } from "lucide-react";
import { Logo } from "./Logo";
import { useSession } from "@/hooks/use-session";
import { useGetCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { toArabicNumerals } from "@/lib/format";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { sessionId, isReady } = useSession();
  
  const { data: cart } = useGetCart(
    { sessionId }, 
    { query: { enabled: isReady, queryKey: getGetCartQueryKey({ sessionId }) } }
  );

  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-primary">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] border-l-border bg-card">
                <div className="flex flex-col gap-6 py-6">
                  <Link href="/" className="flex items-center gap-3">
                    <Logo className="w-10 h-10" />
                    <span className="font-serif text-xl text-primary font-bold">لمسة</span>
                  </Link>
                  <nav className="flex flex-col gap-4 mt-8">
                    <Link href="/" className="text-lg font-medium hover:text-primary transition-colors flex items-center gap-3">
                      <Home className="w-5 h-5 text-muted-foreground" /> الرئيسية
                    </Link>
                    <Link href="/stores" className="text-lg font-medium hover:text-primary transition-colors flex items-center gap-3">
                      <Package className="w-5 h-5 text-muted-foreground" /> المتاجر
                    </Link>
                    <Link href="/search" className="text-lg font-medium hover:text-primary transition-colors flex items-center gap-3">
                      <Search className="w-5 h-5 text-muted-foreground" /> البحث
                    </Link>
                    <Link href="/profile" className="text-lg font-medium hover:text-primary transition-colors flex items-center gap-3">
                      <User className="w-5 h-5 text-muted-foreground" /> حسابي
                    </Link>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            
            <Link href="/" className="flex items-center gap-2 group">
              <Logo className="w-10 h-10 group-hover:scale-105 transition-transform duration-300" />
              <span className="font-serif text-2xl text-primary font-bold hidden sm:inline-block">لمسة</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/' ? 'text-primary' : 'text-muted-foreground'}`}>الرئيسية</Link>
            <Link href="/stores" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/stores' ? 'text-primary' : 'text-muted-foreground'}`}>المتاجر</Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/search">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary rounded-full">
                <Search className="w-5 h-5" />
              </Button>
            </Link>
            
            <Link href="/profile">
              <Button variant="ghost" size="icon" className="hidden sm:flex text-muted-foreground hover:text-primary rounded-full">
                <User className="w-5 h-5" />
              </Button>
            </Link>

            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative text-primary hover:text-primary hover:bg-primary/10 rounded-full">
                <ShoppingBag className="w-5 h-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {toArabicNumerals(cartItemCount)}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border bg-card mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <Logo className="w-12 h-12" />
            <div className="space-y-2">
              <h3 className="font-serif text-xl text-primary font-bold">لمسة</h3>
              <p className="text-sm text-muted-foreground">فخامة بلمسة واحدة. توصيل أرقى العطور والهدايا في صنعاء.</p>
            </div>
            <p className="text-xs text-muted-foreground/50 mt-4">
              © {toArabicNumerals(new Date().getFullYear())} لمسة. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
