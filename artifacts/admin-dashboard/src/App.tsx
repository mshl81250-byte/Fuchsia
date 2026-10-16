import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster as SonnerToaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { useEffect } from 'react';
import { setBaseUrl } from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';
import Dashboard from '@/pages/dashboard';

// Point the API client at the shared backend
setBaseUrl('');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/orders" component={Dashboard} />
      <Route path="/rentals" component={Dashboard} />
      <Route path="/venue-reservations" component={Dashboard} />
      <Route path="/venue-schedules" component={Dashboard} />
      <Route path="/venue-owners" component={Dashboard} />
      <Route path="/store-owners" component={Dashboard} />
      <Route path="/overview" component={Dashboard} />
      <Route path="/customers" component={Dashboard} />
      <Route path="/coupons" component={Dashboard} />
      <Route path="/partner-settings" component={Dashboard} />
      <Route path="/products" component={Dashboard} />
      <Route path="/stores" component={Dashboard} />
      <Route path="/categories" component={Dashboard} />
      <Route path="/banners" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AdminAuthInterceptor() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    const wrappedFetch: typeof window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const requestUrl = typeof args[0] === 'string'
        ? args[0]
        : args[0] instanceof Request
          ? args[0].url
          : args[0].toString();
      if (response.status === 401 && !requestUrl.includes('/api/admin/auth/')) {
        window.dispatchEvent(new Event('fuchsia-admin-unauthorized'));
      }
      return response;
    };

    window.fetch = wrappedFetch;
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AdminAuthInterceptor />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <SonnerToaster position="top-center" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
