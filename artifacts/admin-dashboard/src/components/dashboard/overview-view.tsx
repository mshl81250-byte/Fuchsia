import { useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Box, Users, ShoppingBag, Store, Tag, Banknote, Hourglass } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function formatCurrency(amount: number) {
  return amount.toLocaleString("ar-YE") + " ر.ي";
}

export function OverviewView() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  const statCards = [
    { title: "إجمالي الإيرادات", value: formatCurrency(stats?.totalRevenue || 0), icon: Banknote, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/20" },
    { title: "إجمالي الطلبات", value: stats?.totalOrders || 0, icon: ShoppingBag, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/20" },
    { title: "الطلبات المعلقة", value: stats?.pendingOrders || 0, icon: Hourglass, color: "text-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-900/20" },
    { title: "إجمالي العملاء", value: stats?.totalUsers || 0, icon: Users, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-900/20" },
    { title: "إجمالي المنتجات", value: stats?.totalProducts || 0, icon: Box, color: "text-pink-500", bg: "bg-pink-100 dark:bg-pink-900/20" },
    { title: "المتاجر", value: stats?.totalStores || 0, icon: Store, color: "text-indigo-500", bg: "bg-indigo-100 dark:bg-indigo-900/20" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">نظرة عامة</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className={`p-2 rounded-xl ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
