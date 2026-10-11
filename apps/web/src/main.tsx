import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import LandingPage from './LandingPage';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';

function SiteRouter() {
  const [page, setPage] = useState(() => window.location.pathname.startsWith('/dashboard') ? 'dashboard' : 'landing');
  useEffect(() => {
    const handleRoute = () => setPage(window.location.pathname.startsWith('/dashboard') ? 'dashboard' : 'landing');
    window.addEventListener('popstate', handleRoute);
    return () => window.removeEventListener('popstate', handleRoute);
  }, []);
  const goTo = (path: string) => {
    window.history.pushState({}, '', path);
    setPage(path === '/dashboard' ? 'dashboard' : 'landing');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };
  return page === 'dashboard' ? <App /> : <LandingPage onOpenDashboard={() => goTo('/dashboard')} />;
}

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}><SiteRouter /></QueryClientProvider>
  </React.StrictMode>,
);

