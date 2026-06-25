import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Category from "@/pages/category";
import ProductDetail from "@/pages/product";
import StoreDetail from "@/pages/store";
import Stores from "@/pages/stores";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import Orders from "@/pages/orders";
import OrderDetail from "@/pages/order";
import Search from "@/pages/search";
import Profile from "@/pages/profile";
import Splash from "@/pages/splash";
import AuthPage from "@/pages/auth";
import Favorites from "@/pages/favorites";
import Admin from "@/pages/admin";
import Vendor from "@/pages/vendor";
import { getStoredUser } from "@/hooks/use-auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function useAuthRedirect() {
  const onboarded = localStorage.getItem("lamsa_onboarded");
  const user = getStoredUser();
  if (!onboarded) return "/splash";
  if (!user) return "/auth";
  return null;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const redirect = useAuthRedirect();
  if (redirect) return <Redirect to={redirect} />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/splash" component={Splash} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/admin" component={Admin} />
      <Route path="/vendor" component={Vendor} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={() => <ProtectedRoute component={Home} />} />
            <Route path="/category/:id" component={() => <ProtectedRoute component={Category} />} />
            <Route path="/product/:id" component={() => <ProtectedRoute component={ProductDetail} />} />
            <Route path="/store/:id" component={() => <ProtectedRoute component={StoreDetail} />} />
            <Route path="/stores" component={() => <ProtectedRoute component={Stores} />} />
            <Route path="/cart" component={() => <ProtectedRoute component={Cart} />} />
            <Route path="/checkout" component={() => <ProtectedRoute component={Checkout} />} />
            <Route path="/orders" component={() => <ProtectedRoute component={Orders} />} />
            <Route path="/order/:id" component={() => <ProtectedRoute component={OrderDetail} />} />
            <Route path="/search" component={() => <ProtectedRoute component={Search} />} />
            <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
            <Route path="/favorites" component={() => <ProtectedRoute component={Favorites} />} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
