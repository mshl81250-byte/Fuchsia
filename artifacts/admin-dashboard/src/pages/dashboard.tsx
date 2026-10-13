import { useState, useEffect } from "react";
import { useGetDashboardStats, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PackageSearch, LayoutDashboard, Users, Tag, LogOut, ChevronRight, Menu, CalendarDays, Building2, Store } from "lucide-react";
import { toast } from "sonner";
import { OrdersView } from "@/components/dashboard/orders-view";
import { OverviewView } from "@/components/dashboard/overview-view";
import { CustomersView } from "@/components/dashboard/customers-view";
import { CouponsView } from "@/components/dashboard/coupons-view";
import { RentalsView } from "@/components/dashboard/rentals-view";
import { VenueReservationsView } from "@/components/dashboard/venue-reservations-view";
import { VenueOwnersView } from "@/components/dashboard/venue-owners-view";
import { StoreOwnersView } from "@/components/dashboard/store-owners-view";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Tab = "orders" | "rentals" | "venue-reservations" | "venue-owners" | "store-owners" | "overview" | "customers" | "coupons";

const TAB_ROUTES: Record<Tab, string> = {
  orders: "/orders",
  rentals: "/rentals",
  "venue-reservations": "/venue-reservations",
  "venue-owners": "/venue-owners",
  "store-owners": "/store-owners",
  overview: "/overview",
  customers: "/customers",
  coupons: "/coupons",
};

const ROUTE_TABS: Record<string, Tab> = Object.fromEntries(
  Object.entries(TAB_ROUTES).map(([tab, route]) => [route, tab]),
) as Record<string, Tab>;

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const activeTab = ROUTE_TABS[location] ?? "orders";

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/auth/me", { credentials: "include", cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("جلسة الإدارة غير صالحة");
        if (mounted) setIsAuthenticated(true);
      })
      .catch(() => {
        if (mounted) setIsAuthenticated(false);
      });

    const handleUnauthorized = () => {
      queryClient.clear();
      if (mounted) {
        setIsAuthenticated(false);
        toast.error("انتهت جلسة الإدارة. يرجى تسجيل الدخول مجددًا.");
      }
    };
    window.addEventListener("fuchsia-admin-unauthorized", handleUnauthorized);
    return () => {
      mounted = false;
      window.removeEventListener("fuchsia-admin-unauthorized", handleUnauthorized);
    };
  }, [queryClient]);

  const { data: stats } = useGetDashboardStats({
    query: {
      refetchInterval: 20000,
      enabled: isAuthenticated === true,
      queryKey: getGetDashboardStatsQueryKey(),
    }
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error("invalid credentials");
      setIsAuthenticated(true);
      navigate("/overview");
      toast.success("تم تسجيل الدخول بنجاح");
    } catch {
      toast.error("بيانات الدخول غير صحيحة");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      queryClient.clear();
      setIsAuthenticated(false);
      navigate("/");
    }
  };

  if (isAuthenticated === null) {
    return null; // Loading state
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-muted/30 p-4" dir="rtl">
        <Card className="w-full max-w-md border-0 shadow-2xl bg-card/80 backdrop-blur-xl">
          <CardHeader className="space-y-3 text-center pb-6">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl mx-auto flex items-center justify-center">
              <span className="text-4xl font-bold text-primary">ف</span>
            </div>
            <CardTitle className="text-3xl font-bold">فوشيا</CardTitle>
            <CardDescription className="text-base">لوحة تحكم الإدارة</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@fuchsia.ye" 
                  className="h-12 text-left"
                  dir="ltr"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 text-left"
                  dir="ltr"
                  required 
                />
              </div>
              <Button type="submit" className="w-full h-12 text-lg font-bold">
                تسجيل الدخول
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const TABS = [
    { id: "orders", label: "الطلبات", icon: PackageSearch },
    { id: "rentals", label: "الإيجارات", icon: CalendarDays },
    { id: "venue-reservations", label: "حجوزات القاعات", icon: CalendarDays },
    { id: "venue-owners", label: "أصحاب القاعات", icon: Building2 },
    { id: "store-owners", label: "ملاك متاجر التأجير", icon: Store },
    { id: "overview", label: "نظرة عامة", icon: LayoutDashboard },
    { id: "customers", label: "العملاء", icon: Users },
    { id: "coupons", label: "الكوبونات", icon: Tag },
  ] as const;

  return (
    <div className="min-h-[100dvh] flex bg-muted/20" dir="rtl">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 right-0 z-50 w-72 bg-card border-l flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="p-6 flex items-center gap-4 border-b">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">ف</span>
          </div>
          <div>
            <h1 className="font-bold text-xl">فوشيا</h1>
            <p className="text-xs text-muted-foreground">لوحة التحكم</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                  onClick={() => {
                  navigate(TAB_ROUTES[tab.id]);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md hover-elevate" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
                  <span className="font-bold text-base">{tab.label}</span>
                </div>
                
                {tab.id === "orders" && stats?.pendingOrders ? (
                  <Badge variant={isActive ? "secondary" : "default"} className={cn("px-2 py-0.5 min-w-6 text-center justify-center", isActive ? "bg-white/20 text-white border-0" : "")}>
                    {stats.pendingOrders}
                  </Badge>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            <span className="font-bold">تسجيل الخروج</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card flex items-center px-4 lg:hidden sticky top-0 z-30">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </Button>
          <div className="font-bold text-lg mr-4">فوشيا</div>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {activeTab === "orders" && <OrdersView />}
            {activeTab === "rentals" && <RentalsView />}
            {activeTab === "venue-reservations" && <VenueReservationsView />}
            {activeTab === "venue-owners" && <VenueOwnersView />}
            {activeTab === "store-owners" && <StoreOwnersView />}
            {activeTab === "overview" && <OverviewView />}
            {activeTab === "customers" && <CustomersView />}
            {activeTab === "coupons" && <CouponsView />}
          </div>
        </div>
      </main>

    </div>
  );
}
